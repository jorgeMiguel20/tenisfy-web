import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, clientFingerprint } from '@/lib/rateLimit';

// Inicializa o cliente Supabase com a Service Role Key para aceder à RPC
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Limite de pedidos por pessoa (IP): esta rota é pública e cada pedido gasta
// uma consulta à base de dados. 30 pesquisas por foto em 10 minutos chega e
// sobra para uma pessoa a usar o site normalmente.
const MAX_REQUESTS_PER_WINDOW = 30;
const WINDOW_SECONDS = 600;

// 512 números decimais ocupam cerca de 12 KB; 100 KB dá muita margem e
// recusa pedidos absurdamente grandes.
const MAX_BODY_CHARS = 100_000;

export async function POST(request: NextRequest) {
  try {
    // 0. Limite de pedidos. Se a verificação falhar por um problema técnico,
    // deixa passar (só se perde o limite, a pesquisa continua a funcionar).
    const rateLimit = await checkRateLimit(
      `image-search-ip:${clientFingerprint(request.headers)}`,
      MAX_REQUESTS_PER_WINDOW,
      WINDOW_SECONDS
    );
    if (rateLimit === 'limited') {
      return NextResponse.json(
        { error: 'Demasiados pedidos. Tenta de novo daqui a alguns minutos.' },
        { status: 429, headers: { 'Retry-After': String(WINDOW_SECONDS) } }
      );
    }

    // 1. Lê o corpo como texto, para poder recusar pedidos gigantes antes de
    // os processar.
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: 'Pedido demasiado grande.' }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
    }

    const embedding = (body as { embedding?: unknown } | null)?.embedding;

    // 2. Validação do vetor recebido do client-side
    if (!embedding || !Array.isArray(embedding)) {
      return NextResponse.json(
        { error: 'Embedding inválido ou não fornecido.' },
        { status: 400 }
      );
    }

    if (embedding.length !== 512) {
      return NextResponse.json(
        { error: `O embedding deve conter exatamente 512 dimensões. Recebido: ${embedding.length}` },
        { status: 400 }
      );
    }

    // Todos os valores têm de ser números finitos (nada de texto nem lixo).
    if (!embedding.every((value) => typeof value === 'number' && Number.isFinite(value))) {
      return NextResponse.json(
        { error: 'O embedding só pode conter números.' },
        { status: 400 }
      );
    }

    // 3. Consulta via pgvector no Supabase chamando a função RPC match_products
    const { data: products, error: rpcError } = await supabase.rpc('match_products', {
      query_embedding: embedding,
      match_count: 1, // Só o produto mais parecido
    });

    if (rpcError) {
      console.error('Erro na RPC do Supabase:', rpcError.message, rpcError.details, rpcError.hint);
      return NextResponse.json(
        { error: 'Erro ao consultar a base de dados.' },
        { status: 500 }
      );
    }

    // 4. Devolve os produtos encontrados ao frontend
    return NextResponse.json({ results: products || [] });

  } catch (error) {
    console.error('Erro interno na rota de pesquisa por imagem:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}

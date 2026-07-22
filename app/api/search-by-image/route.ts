import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase com a Service Role Key para aceder à RPC
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { embedding } = body;

    // 1. Validação do vetor recebido do client-side
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

    // 2. Consulta via pgvector no Supabase chamando a função RPC match_products
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

    // 3. Devolve os produtos encontrados ao frontend
    return NextResponse.json({ results: products || [] });

  } catch (error: any) {
    console.error('Erro interno na rota de pesquisa por imagem:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
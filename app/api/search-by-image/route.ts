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

// Quantos ténis mostrar. Ténis muito parecidos entre si (ex.: Campus 00s e
// Samba) podem trocar de lugar numa foto - mostrando os 3 mais parecidos, o
// certo aparece quase sempre (medido: 85% das fotos do catálogo, mesmo de
// ângulos difíceis como a sola ou a traseira).
const MAX_RESULTS = 3;

// Semelhança mínima para mostrar um resultado (0 a 1), e distância máxima
// ao primeiro resultado (para não mostrar ténis que já pouco têm a ver).
const MIN_SIMILARITY = 0.6;
const MAX_GAP_TO_BEST = 0.1;

// "Porteiro" (ver lib/photoSearchPrompts.ts): frases que dizem se a foto é
// de ténis ou de outra coisa. Lidas da base de dados e guardadas em memória
// durante 10 minutos.
type Prompt = { isSneaker: boolean; vector: number[] };
let promptCache: { loadedAt: number; prompts: Prompt[] } | null = null;
const PROMPT_CACHE_MS = 10 * 60 * 1000;

function normalize(vector: number[]): number[] {
  const length = Math.hypot(...vector) || 1;
  return vector.map((value) => value / length);
}

function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

async function getPrompts(): Promise<Prompt[]> {
  if (promptCache && Date.now() - promptCache.loadedAt < PROMPT_CACHE_MS) return promptCache.prompts;

  const { data, error } = await supabase.from('photo_search_prompts').select('is_sneaker, embedding');
  if (error) {
    console.error('Erro ao ler o porteiro da pesquisa por foto:', error.message);
    return promptCache?.prompts ?? [];
  }

  const prompts: Prompt[] = [];
  for (const row of data ?? []) {
    const raw = typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding;
    if (Array.isArray(raw) && raw.length === 512) {
      prompts.push({ isSneaker: Boolean(row.is_sneaker), vector: normalize(raw as number[]) });
    }
  }
  promptCache = { loadedAt: Date.now(), prompts };
  return prompts;
}

// true = a foto parece ser de ténis (ou o porteiro ainda não foi preparado
// no admin - nesse caso não bloqueia nada).
async function looksLikeSneaker(embedding: number[]): Promise<boolean> {
  const prompts = await getPrompts();
  const sneakers = prompts.filter((p) => p.isSneaker);
  const others = prompts.filter((p) => !p.isSneaker);
  if (sneakers.length === 0 || others.length === 0) return true;

  const query = normalize(embedding);
  const bestSneaker = Math.max(...sneakers.map((p) => dot(query, p.vector)));
  const bestOther = Math.max(...others.map((p) => dot(query, p.vector)));
  return bestSneaker >= bestOther;
}

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

    // 3. Porteiro: se a foto não parece ser de ténis (socas, sandálias,
    // botas, pessoas, animais...), responde logo "não encontrámos".
    if (!(await looksLikeSneaker(embedding as number[]))) {
      return NextResponse.json({ results: [] });
    }

    // 4. Compara com TODAS as fotos de cada ténis (match_products_multi, ver
    // sql/photo_search.sql) e devolve os mais parecidos.
    const { data: products, error: rpcError } = await supabase.rpc('match_products_multi', {
      query_embedding: embedding,
      match_count: MAX_RESULTS,
    });

    if (rpcError) {
      console.error('Erro na RPC do Supabase:', rpcError.message, rpcError.details, rpcError.hint);
      return NextResponse.json(
        { error: 'Erro ao consultar a base de dados.' },
        { status: 500 }
      );
    }

    // 5. Devolve ao frontend só os ténis realmente parecidos
    const candidates = ((products || []) as Array<{ similarity?: number }>).filter(
      (product) => typeof product.similarity === 'number' && product.similarity >= MIN_SIMILARITY
    );
    const best = candidates[0]?.similarity ?? 0;
    const results = candidates.filter((product) => best - (product.similarity as number) <= MAX_GAP_TO_BEST);
    return NextResponse.json({ results });

  } catch (error) {
    console.error('Erro interno na rota de pesquisa por imagem:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}

-- sql/photo_search.sql
--
-- Pesquisa por foto mais precisa (corrido no SQL Editor do Supabase em
-- 2026-10-05, antes de publicar o código novo).
--
-- 1) product_image_embeddings: uma "impressão" (embedding) por CADA foto de
--    cada ténis (a principal e as da galeria), não só da foto principal.
--    Assim uma foto tirada de outro ângulo encontra o ténis certo.
-- 2) photo_search_prompts: descrições em texto ("uma foto de uma sapatilha",
--    "uma foto de uma soca", ...) usadas como "porteiro": se a foto se parece
--    mais com socas/sandálias/botas/pessoas/animais do que com ténis, o site
--    responde "Não encontrámos nenhum modelo parecido".
-- 3) match_products_multi: compara a foto com todas as fotos de cada ténis e
--    devolve os N ténis mais parecidos (pela melhor foto de cada um).
--
-- As duas tabelas são preenchidas no admin, em /admin/pesquisa-foto (botão
-- "Atualizar pesquisa por foto"), que corre o mesmo modelo que o site usa.

create table if not exists product_image_embeddings (
  id bigint generated always as identity primary key,
  product_id uuid not null references products(id) on delete cascade,
  image_url text not null,
  embedding vector(512) not null,
  created_at timestamptz not null default now(),
  unique (product_id, image_url)
);
alter table product_image_embeddings enable row level security;
revoke all on product_image_embeddings from anon, authenticated;

create table if not exists photo_search_prompts (
  label text primary key,
  is_sneaker boolean not null,
  embedding vector(512) not null,
  updated_at timestamptz not null default now()
);
alter table photo_search_prompts enable row level security;
revoke all on photo_search_prompts from anon, authenticated;

create or replace function match_products_multi(query_embedding vector(512), match_count int default 3)
returns table(id uuid, slug text, model_name text, image_url text, brand_name text, similarity double precision)
language sql
stable
set search_path = public
as $$
  with candidates as (
    select p.id as product_id, 1 - (p.embedding <=> query_embedding) as sim
      from products p
     where p.embedding is not null
    union all
    select e.product_id, 1 - (e.embedding <=> query_embedding)
      from product_image_embeddings e
  ), best as (
    select product_id, max(sim) as sim
      from candidates
     group by product_id
  )
  select p.id, p.slug, p.model_name, p.image_url, b.name as brand_name, best.sim as similarity
    from best
    join products p on p.id = best.product_id
    join brands b on b.id = p.brand_id
   where coalesce(p.is_active, true)
   order by best.sim desc
   limit least(greatest(match_count, 1), 10);
$$;

revoke execute on function match_products_multi(vector, int) from public, anon, authenticated;
grant execute on function match_products_multi(vector, int) to service_role;

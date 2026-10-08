-- sql/offer_clicks.sql
-- Cliques em "Ver oferta" (ver app/api/out-click/route.ts).
-- Sem dados pessoais: só o ténis, a loja, o sítio do botão e a hora.
-- Só o servidor (service role) escreve e lê; o site público não tem acesso.

create table if not exists public.offer_clicks (
  id bigint generated always as identity primary key,
  clicked_at timestamptz not null default now(),
  product_slug text not null check (char_length(product_slug) <= 200),
  store_name text not null check (char_length(store_name) <= 100),
  placement text check (char_length(placement) <= 40)
);

create index if not exists offer_clicks_clicked_at_idx on public.offer_clicks (clicked_at desc);

alter table public.offer_clicks enable row level security;
revoke all on public.offer_clicks from anon, authenticated;

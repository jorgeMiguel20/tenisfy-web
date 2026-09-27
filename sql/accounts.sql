-- sql/accounts.sql
--
-- Contas de utilizador (login opcional por link mágico / código no email),
-- só para sincronizar favoritos e alertas de preço entre dispositivos.
--
-- Corre isto UMA VEZ no SQL Editor do Supabase (Supabase Dashboard -> SQL
-- Editor -> New query -> cola isto -> Run). Pode ser corrido mais do que uma
-- vez sem problema (tudo usa "if not exists" / "drop ... if exists").
--
-- As contas em si ficam na tabela auth.users, que o próprio Supabase já
-- cria e gere - aqui só se cria o que é do Parjusto.


-- 1) Favoritos de cada conta -----------------------------------------------
--
-- Guardados pelo slug do produto (é o que o site já usa para os favoritos
-- no browser - ver lib/favorites.ts). Um produto que deixe de existir fica
-- simplesmente por mostrar em /favoritos (o site já ignora slugs que não
-- encontra).

create table if not exists favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, product_slug)
);

create index if not exists favorites_user_created
  on favorites (user_id, created_at);

-- Cada pessoa só consegue ver, acrescentar e apagar os SEUS favoritos -
-- mesmo usando a chave pública (anon) a partir do browser. Sem sessão
-- iniciada, não consegue ver nem mexer em nada.
alter table favorites enable row level security;

drop policy if exists "favorites_select_own" on favorites;
create policy "favorites_select_own" on favorites
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on favorites;
create policy "favorites_insert_own" on favorites
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on favorites;
create policy "favorites_delete_own" on favorites
  for delete to authenticated
  using (auth.uid() = user_id);


-- 2) Alertas de preço ligados a uma conta ----------------------------------
--
-- Coluna opcional: alertas criados sem sessão iniciada continuam a
-- funcionar como até aqui (só com o email, com confirmação por email).
-- Apagar a conta apaga também os alertas dela.
--
-- A tabela price_alerts continua SEM políticas RLS (ninguém lhe acede
-- diretamente do browser) - toda a leitura/escrita passa pelas Server
-- Actions do site, que confirmam primeiro quem é o utilizador.

alter table price_alerts
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists price_alerts_user
  on price_alerts (user_id);

-- sql/price_alerts.sql
--
-- Corre isto UMA VEZ no SQL Editor do Supabase (Supabase Dashboard -> SQL
-- Editor -> New query -> cola isto -> Run). Cria a tabela que guarda os
-- alertas de preço dos utilizadores para a nova funcionalidade "Avisa-me
-- quando o preço descer".

create table if not exists price_alerts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  email text not null,
  target_price numeric not null check (target_price > 0),
  is_active boolean not null default true,

  -- Confirmação por e-mail (double opt-in): evita que alguém crie alertas
  -- com o e-mail de outra pessoa, e melhora a reputação do domínio de envio
  -- no Resend (menos hipótese de ser marcado como spam).
  confirmed_at timestamptz,
  confirmation_token uuid not null default gen_random_uuid(),

  -- Link de cancelamento no rodapé do e-mail.
  unsubscribe_token uuid not null default gen_random_uuid(),

  -- Cada alerta só notifica uma vez - depois disso fica is_active = false.
  -- O utilizador pode sempre criar um novo alerta a partir da página do
  -- produto.
  last_notified_at timestamptz,

  created_at timestamptz not null default now(),

  -- Um alerta por combinação produto+e-mail - criar de novo atualiza o
  -- preço-alvo em vez de duplicar.
  unique (product_id, email)
);

-- Acelera a consulta feita depois de cada preço aprovado em
-- app/admin/precos/proposalActions.ts (só os alertas que ainda podem
-- disparar).
create index if not exists price_alerts_pending_lookup
  on price_alerts (product_id, target_price)
  where is_active and confirmed_at is not null and last_notified_at is null;

-- RLS ligado e SEM políticas: ninguém consegue ler/escrever esta tabela
-- diretamente do browser (nem com a chave anon). Toda a leitura/escrita
-- passa pelas Server Actions do site, que usam a service role key - mesmo
-- padrão já usado em app/admin/precos/actions.ts.
alter table price_alerts enable row level security;

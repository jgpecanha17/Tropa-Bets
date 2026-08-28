-- ===========================================================================
--  TROPA BETS — Migração: comissões e análise de comprovantes
--  Rode INTEIRO no Supabase > SQL Editor. Idempotente.
--  (Quem for criar o banco do zero já tem tudo isso no schema.sql.)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Novos campos em transactions
-- ---------------------------------------------------------------------------
alter table public.transactions
  add column if not exists commission_amount numeric(12, 2) not null default 0,
  add column if not exists commission_note   text,
  add column if not exists reviewed_at       timestamptz,
  add column if not exists reviewed_by       uuid references public.profiles (id) on delete set null;

do $$ begin
  alter table public.transactions
    add constraint transactions_commission_non_negative check (commission_amount >= 0);
exception when duplicate_object then null; end $$;

comment on column public.transactions.commission_amount is
  'Comissão em R$ lançada manualmente pelo administrador para esta movimentação.';
comment on column public.transactions.reviewed_by is
  'Administrador que aprovou ou recusou o comprovante.';

create index if not exists transactions_receipt_status_idx
  on public.transactions (receipt_status);

-- ---------------------------------------------------------------------------
-- 2. Proteção: só administrador altera comissão e status do comprovante
--    A policy de update do dono continua valendo para os campos dele
--    (valor, data, observação); estes ficam bloqueados.
-- ---------------------------------------------------------------------------
create or replace function public.guard_transaction_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() nulo = chamada com service role (servidor da aplicação), já autorizada.
  if auth.uid() is not null and not public.is_admin() then
    if new.commission_amount is distinct from old.commission_amount
       or new.commission_note   is distinct from old.commission_note
       or new.receipt_status    is distinct from old.receipt_status
       or new.reviewed_at       is distinct from old.reviewed_at
       or new.reviewed_by       is distinct from old.reviewed_by then
      raise exception 'Apenas administradores podem alterar a comissão ou o status do comprovante.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_guard_admin_fields on public.transactions;
create trigger transactions_guard_admin_fields
  before update on public.transactions
  for each row execute function public.guard_transaction_admin_fields();

-- ---------------------------------------------------------------------------
-- 3. Conferência
-- ---------------------------------------------------------------------------
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'transactions'
   and column_name in ('commission_amount', 'commission_note', 'reviewed_at', 'reviewed_by')
 order by column_name;

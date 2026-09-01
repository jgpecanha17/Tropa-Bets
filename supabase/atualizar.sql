-- ===========================================================================
--  PEÇANHA AFFILIATES — Atualização de um banco já existente
--
--  Use ESTE arquivo quando o banco já foi criado antes e você quer trazê-lo
--  para a versão atual. Se o projeto Supabase for novo, rode o schema.sql.
--
--  Roda inteiro, de uma vez, no SQL Editor. É idempotente: pode ser executado
--  quantas vezes precisar, sem apagar dados.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. GRANTS — sem eles a API responde "permission denied for table ..."
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on all tables in schema public to anon;
grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;

-- ---------------------------------------------------------------------------
-- 2. COMISSÕES E ANÁLISE DE COMPROVANTES
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

create index if not exists transactions_receipt_status_idx
  on public.transactions (receipt_status);

-- Só administrador altera comissão e status do comprovante.
create or replace function public.guard_transaction_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() nulo = chamada com service role (servidor), já autorizada.
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
-- 3. NOME COMPLETO E CPF DO AFILIADO
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists legal_name            text,
  add column if not exists cpf                   text,
  add column if not exists identity_confirmed_at timestamptz;

create unique index if not exists profiles_cpf_key
  on public.profiles (cpf) where cpf is not null;

-- O afiliado atualiza o próprio perfil...
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ...mas role, status e os dados já confirmados ficam travados para ele.
create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role        is distinct from old.role
       or new.status      is distinct from old.status
       or new.approved_at is distinct from old.approved_at
       or new.approved_by is distinct from old.approved_by then
      raise exception 'Apenas administradores podem alterar permissão ou status.';
    end if;

    if old.identity_confirmed_at is not null
       and (new.legal_name            is distinct from old.legal_name
            or new.cpf                is distinct from old.cpf
            or new.identity_confirmed_at is distinct from old.identity_confirmed_at) then
      raise exception 'Nome completo e CPF já foram confirmados. Solicite a alteração ao administrador.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_self_update on public.profiles;
create trigger profiles_guard_self_update
  before update on public.profiles
  for each row execute function public.guard_profile_self_update();

-- ---------------------------------------------------------------------------
-- 4. BASELINE: aporte mínimo por casa de aposta
-- ---------------------------------------------------------------------------
alter table public.bookmakers
  add column if not exists min_deposit numeric(12, 2) not null default 0;

do $$ begin
  alter table public.bookmakers
    add constraint bookmakers_min_deposit_non_negative check (min_deposit >= 0);
exception when duplicate_object then null; end $$;

comment on column public.bookmakers.min_deposit is
  'Aporte mínimo (baseline) exigido no cadastro feito pelo link desta casa.';

-- ---------------------------------------------------------------------------
-- 5. BACKFILL: perfis de usuários criados antes do trigger existir
-- ---------------------------------------------------------------------------
insert into public.profiles (id, email, full_name, avatar_url, role, status, approved_at)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture'),
  'user'::public.user_role,
  'pending_approval'::public.user_status,
  null
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- ---------------------------------------------------------------------------
-- 6. CONFERÊNCIA
-- ---------------------------------------------------------------------------
select 'transactions' as tabela, column_name
  from information_schema.columns
 where table_schema = 'public' and table_name = 'transactions'
   and column_name in ('commission_amount', 'commission_note', 'reviewed_at', 'reviewed_by')
union all
select 'profiles', column_name
  from information_schema.columns
 where table_schema = 'public' and table_name = 'profiles'
   and column_name in ('legal_name', 'cpf', 'identity_confirmed_at')
union all
select 'bookmakers', column_name
  from information_schema.columns
 where table_schema = 'public' and table_name = 'bookmakers'
   and column_name = 'min_deposit'
 order by 1, 2;

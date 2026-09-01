-- ===========================================================================
--  PEÇANHA AFFILIATES — Migração: nome completo e CPF do afiliado
--  Rode INTEIRO no Supabase > SQL Editor. Idempotente.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Novos campos em profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists legal_name            text,
  add column if not exists cpf                   text,
  add column if not exists identity_confirmed_at timestamptz;

comment on column public.profiles.legal_name is
  'Nome completo informado pelo próprio afiliado (uma única vez).';
comment on column public.profiles.cpf is
  'CPF apenas com dígitos. Depois de confirmado, só o administrador altera.';

-- Um CPF não pode se repetir entre afiliados.
create unique index if not exists profiles_cpf_key
  on public.profiles (cpf) where cpf is not null;

-- ---------------------------------------------------------------------------
-- 2. O usuário pode atualizar o próprio perfil...
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. ...mas o trigger limita o que ele pode mudar:
--    role, status e aprovação continuam exclusivos do administrador, e
--    nome/CPF ficam travados assim que forem confirmados.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() nulo = chamada com service role (servidor), já autorizada.
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

    if new.status <> 'approved' and old.identity_confirmed_at is null
       and new.identity_confirmed_at is not null then
      raise exception 'Só afiliados aprovados podem confirmar os dados.';
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
-- 4. Conferência
-- ---------------------------------------------------------------------------
select column_name
  from information_schema.columns
 where table_schema = 'public' and table_name = 'profiles'
   and column_name in ('legal_name', 'cpf', 'identity_confirmed_at')
 order by column_name;

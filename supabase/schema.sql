-- ===========================================================================
--  PEÇANHA AFFILIATES — Script de inicialização do Supabase
--  Execute no SQL Editor do projeto (Supabase > SQL Editor > New query).
--  Idempotente: pode ser reexecutado com segurança.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. ENUMS (Model: domínios do banco)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_status as enum ('pending_approval', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_type as enum ('deposit', 'withdrawal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.receipt_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. TABELA: profiles  (1:1 com auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  full_name    text,
  avatar_url   text,
  role         public.user_role   not null default 'user',
  status       public.user_status not null default 'pending_approval',
  -- Preenchidos pelo próprio afiliado uma única vez; depois só o admin altera.
  legal_name            text,
  cpf                   text,
  identity_confirmed_at timestamptz,
  approved_at  timestamptz,
  approved_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Perfil da aplicação, espelha auth.users e guarda role/status de aprovação.';

create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_role_idx   on public.profiles (role);
create unique index if not exists profiles_cpf_key on public.profiles (cpf) where cpf is not null;

-- ---------------------------------------------------------------------------
-- 3. TABELA: bookmakers (casas de aposta + link de afiliado)
-- ---------------------------------------------------------------------------
create table if not exists public.bookmakers (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  affiliate_url text,
  brand_color   text,
  -- Aporte mínimo (baseline) exigido para o cadastro feito por este link.
  min_deposit   numeric(12, 2) not null default 0 check (min_deposit >= 0),
  -- Quanto o afiliado ganha por conta criada e validada nesta casa (CPA).
  commission_value numeric(12, 2) not null default 0 check (commission_value >= 0),
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.bookmakers is 'Casas de aposta pré-configuradas; o link de afiliado é editado pelo admin.';

-- ---------------------------------------------------------------------------
-- 4. TABELA: transactions (depósitos e saques por casa)
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles  (id) on delete cascade,
  bookmaker_id  uuid not null references public.bookmakers (id) on delete restrict,
  type          public.transaction_type not null,
  amount        numeric(12, 2) not null check (amount > 0),
  occurred_at   date not null default current_date,
  receipt_path  text,
  receipt_status public.receipt_status not null default 'pending',
  notes         text,
  -- Titular da conta aberta pelo link: pode ser o próprio afiliado ou outra
  -- pessoa, que não precisa ter cadastro no sistema.
  account_holder_name    text,
  account_holder_cpf     text,
  account_holder_is_self boolean not null default true,
  -- Comissão lançada manualmente pelo administrador ao revisar o comprovante.
  commission_amount numeric(12, 2) not null default 0 check (commission_amount >= 0),
  commission_note   text,
  reviewed_at   timestamptz,
  reviewed_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.transactions is 'Movimentações financeiras do usuário em cada casa de aposta.';

create index if not exists transactions_user_idx      on public.transactions (user_id);
create index if not exists transactions_bookmaker_idx on public.transactions (bookmaker_id);
create index if not exists transactions_date_idx      on public.transactions (occurred_at desc);
create index if not exists transactions_receipt_status_idx on public.transactions (receipt_status);

-- ---------------------------------------------------------------------------
-- 5. TRIGGERS utilitários (updated_at)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists bookmakers_set_updated_at on public.bookmakers;
create trigger bookmakers_set_updated_at
  before update on public.bookmakers
  for each row execute function public.set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5.1. TRIGGER: só administrador altera comissão e status do comprovante
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
-- 6. TRIGGER: novo usuário -> cria profile pendente de aprovação
--    O primeiro usuário do sistema vira admin aprovado automaticamente.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first_user boolean;
begin
  select count(*) = 0 into is_first_user from public.profiles;

  insert into public.profiles (id, email, full_name, avatar_url, role, status, approved_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    case when is_first_user then 'admin'::public.user_role else 'user'::public.user_role end,
    case when is_first_user then 'approved'::public.user_status else 'pending_approval'::public.user_status end,
    case when is_first_user then now() else null end
  )
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = coalesce(excluded.full_name,  public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 7. HELPERS de autorização (security definer evita recursao nas policies)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.status = 'approved'
  );
$$;

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'approved'
  );
$$;

-- ---------------------------------------------------------------------------
-- 7.1. GRANTS — sem eles a API responde "permission denied for table ...",
--      mesmo com as políticas de RLS corretas.
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
-- 8. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.bookmakers   enable row level security;
alter table public.transactions enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists "profiles_select_own"   on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());

-- Somente admin altera role/status. O próprio usuário não se aprova.
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- O afiliado atualiza o próprio perfil (nome/CPF); o trigger abaixo limita o
-- que pode ser alterado e trava os dados depois de confirmados.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

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

-- bookmakers ----------------------------------------------------------------
drop policy if exists "bookmakers_select_authenticated" on public.bookmakers;
drop policy if exists "bookmakers_write_admin"          on public.bookmakers;

create policy "bookmakers_select_authenticated" on public.bookmakers
  for select to authenticated using (true);

create policy "bookmakers_write_admin" on public.bookmakers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- transactions --------------------------------------------------------------
drop policy if exists "transactions_select_own"    on public.transactions;
drop policy if exists "transactions_insert_own"    on public.transactions;
drop policy if exists "transactions_update_own"    on public.transactions;
drop policy if exists "transactions_delete_own"    on public.transactions;
drop policy if exists "transactions_all_admin"     on public.transactions;

create policy "transactions_select_own" on public.transactions
  for select using (user_id = auth.uid());

create policy "transactions_insert_own" on public.transactions
  for insert with check (user_id = auth.uid() and public.is_approved());

create policy "transactions_update_own" on public.transactions
  for update using (user_id = auth.uid() and public.is_approved())
  with check (user_id = auth.uid());

create policy "transactions_delete_own" on public.transactions
  for delete using (user_id = auth.uid() and public.is_approved());

create policy "transactions_all_admin" on public.transactions
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 9. STORAGE: bucket privado de comprovantes
--    Caminho dos arquivos: receipts/<user_id>/<bookmaker_slug>/<arquivo>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts', 'receipts', false, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "receipts_insert_own"   on storage.objects;
drop policy if exists "receipts_select_own"   on storage.objects;
drop policy if exists "receipts_delete_own"   on storage.objects;
drop policy if exists "receipts_select_admin" on storage.objects;

create policy "receipts_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved()
  );

create policy "receipts_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "receipts_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "receipts_select_admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 10. SEED: as 7 casas de aposta pré-configuradas
-- ---------------------------------------------------------------------------
insert into public.bookmakers (slug, name, brand_color, sort_order) values
  ('betano',       'Betano',       '#ff6b00', 1),
  ('betfair',      'Betfair',      '#ffb80c', 2),
  ('betnacional',  'Betnacional',  '#00a859', 3),
  ('esportivabet', 'EsportivaBet', '#0ea5e9', 4),
  ('novibet',      'Novibet',      '#e11d48', 5),
  ('sportingbet',  'Sportingbet',  '#0b5c3b', 6),
  ('stake',        'Stake',        '#1a75ff', 7)
on conflict (slug) do update
  set name        = excluded.name,
      brand_color = excluded.brand_color,
      sort_order  = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- 11. BACKFILL: perfis de usuários que entraram antes do trigger existir
--     Sem o perfil, o usuário loga mas nenhuma tela consegue carregá-lo.
--     Roda sozinho a cada execução deste script; não altera quem já tem perfil.
-- ---------------------------------------------------------------------------
insert into public.profiles (id, email, full_name, avatar_url, role, status, approved_at)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture'),
  -- O usuário mais antigo vira admin aprovado (mesma regra do trigger);
  -- os demais entram como pendentes de aprovação.
  case when u.created_at = (select min(created_at) from auth.users) and
            not exists (select 1 from public.profiles where role = 'admin')
       then 'admin'::public.user_role else 'user'::public.user_role end,
  case when u.created_at = (select min(created_at) from auth.users) and
            not exists (select 1 from public.profiles where role = 'admin')
       then 'approved'::public.user_status else 'pending_approval'::public.user_status end,
  case when u.created_at = (select min(created_at) from auth.users) and
            not exists (select 1 from public.profiles where role = 'admin')
       then now() else null end
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- ---------------------------------------------------------------------------
-- 12. (Opcional) Promover um e-mail específico a administrador
--     Descomente e troque o e-mail antes de executar.
-- ---------------------------------------------------------------------------
-- update public.profiles
--    set role = 'admin', status = 'approved', approved_at = now()
--  where email = 'seu-email@gmail.com';

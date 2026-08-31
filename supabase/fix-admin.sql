-- ===========================================================================
--  PEÇANHA AFFILIATES — Correção de permissões + promoção de administradores
--  Rode INTEIRO no Supabase > SQL Editor > New query > Run.
--  Pode ser executado mais de uma vez sem problema.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. GRANTS — corrige o erro "permission denied for table profiles"
--    A RLS continua valendo: ela filtra as linhas, os grants apenas liberam
--    o acesso às tabelas para os papéis que a API do Supabase usa.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

-- service_role: usada pelo servidor da aplicação (ignora RLS)
grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- authenticated: o usuário logado (a RLS restringe às linhas dele)
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- anon: visitante não logado (a RLS impede que ele leia qualquer dado)
grant select on all tables in schema public to anon;

grant execute on all functions in schema public to anon, authenticated, service_role;

-- Vale também para as tabelas criadas daqui pra frente
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;

-- ---------------------------------------------------------------------------
-- 2. ADMINISTRADORES
--    Cria o perfil (se faltar) e promove a admin aprovado.
--    Os e-mails precisam já ter feito login com o Google ao menos uma vez.
-- ---------------------------------------------------------------------------
insert into public.profiles (id, email, full_name, avatar_url, role, status, approved_at)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture'),
  'admin',
  'approved',
  now()
from auth.users u
where lower(u.email) in ('cardoso.dego24@gmail.com', 'jgpecanha17@gmail.com')
on conflict (id) do update
  set role        = 'admin',
      status      = 'approved',
      approved_at = now(),
      email       = excluded.email,
      full_name   = coalesce(public.profiles.full_name,  excluded.full_name),
      avatar_url  = coalesce(public.profiles.avatar_url, excluded.avatar_url);

-- ---------------------------------------------------------------------------
-- 3. CONFERÊNCIA — o resultado deve trazer os dois e-mails como admin/approved
-- ---------------------------------------------------------------------------
select email, role, status, approved_at
  from public.profiles
 order by role desc, email;

-- Se algum e-mail não aparecer, ele ainda não fez login no app.
-- Para ver quem já entrou:
-- select email, created_at from auth.users order by created_at;

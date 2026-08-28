import type { User } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { Forbidden, Unauthorized } from '@/lib/errors';
import { ProfileRules, type Profile } from '@/models';

export interface SessionContext {
  user: User;
  profile: Profile;
}

/** Nome e foto vindos do Google (o Supabase guarda em raw_user_meta_data). */
function metadataOf(user: User) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = meta[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
    return null;
  };
  return {
    fullName: pick('full_name', 'name'),
    avatarUrl: pick('avatar_url', 'picture'),
  };
}

/**
 * Cria o perfil de um usuário autenticado que ficou sem registro em `profiles`
 * — acontece quando a conta foi criada antes de o trigger `handle_new_user`
 * existir no banco. Sem isso o usuário logaria e ficaria preso em um ciclo de
 * redirecionamentos, porque nenhuma tela conseguiria carregar seu perfil.
 *
 * Usa a service role (ignora RLS) e replica a mesma regra do trigger: o
 * primeiro perfil do sistema nasce admin aprovado; os demais, pendentes.
 */
async function backfillProfile(user: User): Promise<Profile | null> {
  try {
    const admin = createAdminSupabase();

    // O perfil pode existir e apenas não ter sido lido pelo client do usuário.
    const { data: existing } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (existing) return existing as Profile;

    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    const isFirstUser = (count ?? 0) === 0;

    const { fullName, avatarUrl } = metadataOf(user);
    const { data, error } = await admin
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email ?? '',
        full_name: fullName,
        avatar_url: avatarUrl,
        role: isFirstUser ? 'admin' : 'user',
        status: isFirstUser ? 'approved' : 'pending_approval',
        approved_at: isFirstUser ? new Date().toISOString() : null,
      })
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[auth] não foi possível criar o perfil do usuário:', error.message);
      return null;
    }
    return (data as Profile) ?? null;
  } catch (error) {
    console.error('[auth] falha no backfill do perfil:', error);
    return null;
  }
}

/**
 * SERVICE — Autenticação e autorização.
 * Toda regra de "quem pode o que" nasce aqui; controllers e páginas só consomem.
 */
export const authService = {
  /** Usuário autenticado (validado no servidor) ou null. */
  async getUser(): Promise<User | null> {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user ?? null;
  },

  /** Sessão + perfil da aplicação. Retorna null se não houver login. */
  async getContext(): Promise<SessionContext | null> {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[auth] falha ao carregar o perfil:', profileError.message);
    }
    if (profile) return { user, profile: profile as Profile };

    // Autenticado mas sem perfil: tenta recriá-lo antes de desistir.
    const restored = await backfillProfile(user);
    return restored ? { user, profile: restored } : null;
  },

  /**
   * Explica por que um usuário autenticado ficou sem perfil, para exibir na
   * tela de login. Sem a service role a aplicação não consegue se auto-reparar.
   */
  describeMissingProfile(): string {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      return 'A variável SUPABASE_SERVICE_ROLE_KEY não está configurada neste ambiente, ' +
        'então a aplicação não consegue recriar seu perfil sozinha. Cadastre-a na Vercel ' +
        '(Settings > Environment Variables) e faça um novo deploy.';
    }
    return 'Peça ao administrador para executar o script supabase/schema.sql no projeto ' +
      'Supabase — o passo 11 recria os perfis que estejam faltando. Os detalhes do erro ' +
      'aparecem nos logs do servidor com o prefixo [auth].';
  },

  /** Exige login. */
  async requireContext(): Promise<SessionContext> {
    const ctx = await this.getContext();
    if (!ctx) throw Unauthorized();
    return ctx;
  },

  /** Exige login + cadastro aprovado pelo admin. */
  async requireApproved(): Promise<SessionContext> {
    const ctx = await this.requireContext();
    if (!ProfileRules.isApproved(ctx.profile)) {
      throw Forbidden('Seu cadastro ainda não foi aprovado pelo administrador.');
    }
    return ctx;
  },

  /** Exige login + role admin. */
  async requireAdmin(): Promise<SessionContext> {
    const ctx = await this.requireContext();
    if (!ProfileRules.isAdmin(ctx.profile)) {
      throw Forbidden('Área restrita a administradores.');
    }
    return ctx;
  },

  /** Encerra a sessão do usuário. */
  async signOut(): Promise<void> {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  },
};

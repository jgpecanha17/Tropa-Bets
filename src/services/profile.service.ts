import { createAdminSupabase } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { AppError, BadRequest, Forbidden, NotFound } from '@/lib/errors';
import { ProfileRules, type IdentityInput, type Profile, type UpdateProfileInput } from '@/models';

/** SERVICE — Gestão de usuários (area administrativa). */
export const profileService = {
  /** Usuários aguardando aprovação, do mais antigo para o mais novo. */
  async listPending(): Promise<Profile[]> {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: true });

    if (error) throw new AppError(`Falha ao carregar solicitações: ${error.message}`, 500);
    return (data ?? []) as Profile[];
  },

  /** Todos os usuários do sistema. */
  async listAll(): Promise<Profile[]> {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new AppError(`Falha ao carregar usuários: ${error.message}`, 500);
    return (data ?? []) as Profile[];
  },

  /**
   * Grava nome completo e CPF do próprio afiliado — uma única vez.
   * A trava real está no banco (trigger `guard_profile_self_update`); aqui
   * devolvemos mensagens amigáveis antes de chegar lá.
   */
  async confirmIdentity(profile: Profile, input: IdentityInput): Promise<Profile> {
    if (!ProfileRules.isApproved(profile)) {
      throw Forbidden('Seu cadastro ainda não foi aprovado pelo administrador.');
    }
    if (ProfileRules.hasIdentity(profile)) {
      throw BadRequest(
        'Seus dados já foram confirmados. Para corrigir algo, fale com o administrador.',
      );
    }

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .update({
        legal_name: input.legal_name,
        cpf: input.cpf,
        identity_confirmed_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
      .select('*')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        throw BadRequest('Este CPF já está cadastrado para outro afiliado.');
      }
      throw new AppError(`Falha ao salvar seus dados: ${error.message}`, 500);
    }
    if (!data) throw NotFound('Perfil não encontrado.');
    return data as Profile;
  },

  /**
   * Atualiza status e/ou role de um usuário.
   * Regras: o admin não pode alterar a si mesmo (evita se trancar para fora)
   * e o último admin ativo não pode ser rebaixado.
   */
  async update(actorId: string, targetId: string, input: UpdateProfileInput): Promise<Profile> {
    const changesAccess = input.role !== undefined || input.status !== undefined;
    if (actorId === targetId && changesAccess) {
      throw BadRequest('Você não pode alterar o próprio status ou a própria permissão.');
    }

    const admin = createAdminSupabase();

    const { data: target, error: findError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();
    if (findError) throw new AppError(findError.message, 500);
    if (!target) throw NotFound('Usuário não encontrado.');

    const willLoseAdmin =
      target.role === 'admin' &&
      ((input.role && input.role !== 'admin') || (input.status && input.status !== 'approved'));

    if (willLoseAdmin) {
      const { count } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('status', 'approved');

      if ((count ?? 0) <= 1) {
        throw BadRequest('É necessário manter ao menos um administrador ativo.');
      }
    }

    const patch: Partial<Profile> = {};
    if (input.legal_name !== undefined) patch.legal_name = input.legal_name;
    if (input.cpf !== undefined) {
      patch.cpf = input.cpf;
      // Corrigir os dados pelo admin mantém o cadastro marcado como confirmado.
      patch.identity_confirmed_at = target.identity_confirmed_at ?? new Date().toISOString();
    }
    if (input.role) patch.role = input.role;
    if (input.status) {
      patch.status = input.status;
      patch.approved_at = input.status === 'approved' ? new Date().toISOString() : null;
      patch.approved_by = input.status === 'approved' ? actorId : null;
    }

    const { data, error } = await admin
      .from('profiles')
      .update(patch)
      .eq('id', targetId)
      .select('*')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        throw BadRequest('Este CPF já está cadastrado para outro afiliado.');
      }
      throw new AppError(`Falha ao atualizar usuário: ${error.message}`, 500);
    }
    if (!data) throw NotFound('Usuário não encontrado.');
    return data as Profile;
  },
};

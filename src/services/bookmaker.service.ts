import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { AppError, NotFound } from '@/lib/errors';
import type { Bookmaker, UpdateBookmakerInput } from '@/models';

/** SERVICE — Casas de aposta e seus links de afiliado. */
export const bookmakerService = {
  /** Lista as casas ativas, na ordem definida pelo admin. */
  async listActive(): Promise<Bookmaker[]> {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('bookmakers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw new AppError(`Falha ao carregar casas de aposta: ${error.message}`, 500);
    return (data ?? []) as Bookmaker[];
  },

  /** Lista todas as casas (visão do admin, inclui inativas). */
  async listAll(): Promise<Bookmaker[]> {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('bookmakers')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw new AppError(`Falha ao carregar casas de aposta: ${error.message}`, 500);
    return (data ?? []) as Bookmaker[];
  },

  async findById(id: string): Promise<Bookmaker> {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from('bookmakers').select('*').eq('id', id).maybeSingle();
    if (error) throw new AppError(error.message, 500);
    if (!data) throw NotFound('Casa de aposta não encontrada.');
    return data as Bookmaker;
  },

  /** Atualiza link/visibilidade. Requer que o chamador já tenha sido validado como admin. */
  async update(id: string, input: UpdateBookmakerInput): Promise<Bookmaker> {
    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from('bookmakers')
      .update({
        affiliate_url: input.affiliate_url,
        ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) throw new AppError(`Falha ao salvar a casa de aposta: ${error.message}`, 500);
    if (!data) throw NotFound('Casa de aposta não encontrada.');
    return data as Bookmaker;
  },
};

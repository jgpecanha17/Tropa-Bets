import { redirect } from 'next/navigation';
import { ProfileRules } from '@/models';
import type { Bookmaker, Profile, TransactionWithBookmaker } from '@/models';
import { authService } from '@/services/auth.service';
import { bookmakerService } from '@/services/bookmaker.service';
import { profileService } from '@/services/profile.service';
import { transactionService } from '@/services/transaction.service';

export interface DashboardViewModel {
  profile: Profile;
  bookmakers: Bookmaker[];
  transactions: TransactionWithBookmaker[];
}

/**
 * CONTROLLER — Monta o "view model" das páginas renderizadas no servidor
 * e aplica os desvios de rota conforme o status do usuário.
 */
export const dashboardController = {
  /** Dados do painel do usuário. Redireciona quem não pode entrar. */
  async index(): Promise<DashboardViewModel> {
    const ctx = await authService.getContext();
    if (!ctx) redirect('/login');
    if (ProfileRules.isRejected(ctx.profile)) redirect('/blocked');
    if (!ProfileRules.isApproved(ctx.profile)) redirect('/pending');
    if (!ProfileRules.hasIdentity(ctx.profile)) redirect('/identificacao');

    const [bookmakers, transactions] = await Promise.all([
      bookmakerService.listActive(),
      transactionService.listByUser(ctx.profile.id),
    ]);

    return { profile: ctx.profile, bookmakers, transactions };
  },

  /** Dados do painel administrativo (usuários, casas e todas as movimentações). */
  async admin() {
    const ctx = await authService.getContext();
    if (!ctx) redirect('/login');
    if (ProfileRules.isRejected(ctx.profile)) redirect('/blocked');
    if (!ProfileRules.isApproved(ctx.profile)) redirect('/pending');
    if (!ProfileRules.hasIdentity(ctx.profile)) redirect('/identificacao');
    if (!ProfileRules.isAdmin(ctx.profile)) redirect('/dashboard');

    const [users, bookmakers, transactions] = await Promise.all([
      profileService.listAll(),
      bookmakerService.listAll(),
      transactionService.listAll(),
    ]);

    return { profile: ctx.profile, users, bookmakers, transactions };
  },
};

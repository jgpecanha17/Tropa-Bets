import { redirect } from 'next/navigation';
import { ProfileRules } from '@/models';
import { authService } from '@/services/auth.service';

/** Porta de entrada: envia cada usuário para a tela correta conforme o status. */
export default async function HomePage() {
  const ctx = await authService.getContext();

  if (!ctx) redirect('/login');
  if (ProfileRules.isRejected(ctx.profile)) redirect('/blocked');
  if (!ProfileRules.isApproved(ctx.profile)) redirect('/pending');
  redirect('/dashboard');
}

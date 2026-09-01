import { redirect } from 'next/navigation';
import { IdentityForm } from '@/components/auth/IdentityForm';
import { Brand } from '@/components/layout/Brand';
import { SignOutButton } from '@/components/layout/SignOutButton';
import { ProfileRules } from '@/models';
import { authService } from '@/services/auth.service';

export const metadata = { title: 'Seus dados — Peçanha Affiliates' };
export const dynamic = 'force-dynamic';

/**
 * Etapa obrigatória logo após a aprovação: o afiliado informa nome completo e
 * CPF uma única vez. Quem já confirmou é mandado direto para o painel.
 */
export default async function IdentityPage() {
  const ctx = await authService.getContext();
  if (!ctx) redirect('/login');
  if (ProfileRules.isRejected(ctx.profile)) redirect('/blocked');
  if (!ProfileRules.isApproved(ctx.profile)) redirect('/pending');
  if (ProfileRules.hasIdentity(ctx.profile)) redirect('/dashboard');

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Brand />
        </div>

        <div className="card space-y-6 p-7">
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-zinc-50">Complete seu cadastro</h1>
            <p className="text-sm leading-relaxed text-zinc-400">
              Cadastro aprovado! Antes de acessar o painel, informe seu nome completo e CPF —
              eles identificam os pagamentos das suas comissões.
            </p>
          </div>

          <IdentityForm email={ctx.profile.email} />
        </div>

        <SignOutButton className="btn-ghost w-full" />
      </div>
    </div>
  );
}

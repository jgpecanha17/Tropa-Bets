import { redirect } from 'next/navigation';
import { Brand } from '@/components/layout/Brand';
import { SignOutButton } from '@/components/layout/SignOutButton';
import { ProfileRules } from '@/models';
import { authService } from '@/services/auth.service';

export const metadata = { title: 'Acesso negado — Peçanha Affiliates' };

/** Tela exibida a usuários recusados/bloqueados pelo administrador. */
export default async function BlockedPage() {
  const ctx = await authService.getContext();
  if (!ctx) redirect('/login');
  if (!ProfileRules.isRejected(ctx.profile)) redirect('/');

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Brand />
        </div>

        <div className="card space-y-6 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-2xl">
            🔒
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-zinc-50">Acesso não liberado</h1>
            <p className="text-sm leading-relaxed text-zinc-400">
              Seu acesso foi recusado pelo administrador. Se isso parece um engano, fale com o
              responsável pelo grupo para revisar a solicitação.
            </p>
          </div>
          <SignOutButton className="btn-ghost w-full" />
        </div>
      </div>
    </div>
  );
}

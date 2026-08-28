import { redirect } from 'next/navigation';
import { Brand } from '@/components/layout/Brand';
import { SignOutButton } from '@/components/layout/SignOutButton';
import { Avatar } from '@/components/ui/Avatar';
import { ProfileRules } from '@/models';
import { authService } from '@/services/auth.service';
import { formatDateTime } from '@/lib/format';

export const metadata = { title: 'Aguardando aprovação — Tropa Bets' };

/** Tela de bloqueio amigavel exibida enquanto o cadastro está pendente. */
export default async function PendingPage() {
  const ctx = await authService.getContext();
  if (!ctx) redirect('/login');
  if (ProfileRules.isRejected(ctx.profile)) redirect('/blocked');
  if (ProfileRules.isApproved(ctx.profile)) redirect('/dashboard');

  const { profile } = ctx;

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex justify-center">
          <Brand />
        </div>

        <div className="card space-y-6 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-2xl">
            ⏳
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-zinc-50">Cadastro em análise</h1>
            <p className="text-sm leading-relaxed text-zinc-400">
              Seu cadastro foi realizado e está aguardando aprovação do administrador. Assim que ele
              liberar seu acesso, o painel de movimentações abre automaticamente neste mesmo login.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left">
            <Avatar src={profile.avatar_url} name={profile.full_name} email={profile.email} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-100">
                {ProfileRules.displayName(profile)}
              </p>
              <p className="truncate text-xs text-zinc-500">{profile.email}</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Solicitado em {formatDateTime(profile.created_at)}
              </p>
            </div>
          </div>

          <SignOutButton className="btn-ghost w-full" />
        </div>
      </div>
    </div>
  );
}

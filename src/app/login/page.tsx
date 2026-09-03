import { redirect } from 'next/navigation';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { SignOutButton } from '@/components/layout/SignOutButton';
import { Alert } from '@/components/ui/Alert';
import { Brand } from '@/components/layout/Brand';
import { DEFAULT_BOOKMAKERS, ProfileRules } from '@/models';
import { authService } from '@/services/auth.service';

export const metadata = { title: 'Entrar — Peçanha Affiliates' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const { error, redirectTo } = await searchParams;

  // Nunca redirecionamos de volta para as próprias telas de autenticação.
  const safeRedirect =
    redirectTo?.startsWith('/') && !redirectTo.startsWith('/login') && !redirectTo.startsWith('/auth')
      ? redirectTo
      : '/dashboard';

  // Já autenticado: a própria página escolhe o destino conforme o status.
  const ctx = await authService.getContext();
  if (ctx) {
    if (ProfileRules.isRejected(ctx.profile)) redirect('/blocked');
    if (!ProfileRules.isApproved(ctx.profile)) redirect('/pending');
    if (!ProfileRules.hasIdentity(ctx.profile)) redirect('/identificacao');
    redirect(safeRedirect);
  }

  // Sessão válida sem perfil correspondente: mostramos a tela com um aviso e a
  // opção de sair, em vez de rebater o usuário entre /login e /dashboard.
  const orphanSession = Boolean(await authService.getUser());
  const orphanReason = orphanSession ? authService.describeMissingProfile() : null;

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Brand />
        </div>

        <div className="card space-y-6 p-7">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-zinc-50">Gestão de afiliados</h1>
            <p className="text-sm text-zinc-400">
              Controle os depósitos, saques e comissões da operação em todas as casas de aposta.
            </p>
          </div>

          {error ? <Alert tone="error">{error}</Alert> : null}

          {orphanReason ? (
            <Alert tone="error">
              <p className="font-semibold">Não foi possível carregar seu perfil.</p>
              <p className="mt-1">{orphanReason}</p>
            </Alert>
          ) : null}

          <GoogleSignInButton redirectTo={safeRedirect} />

          {orphanSession ? <SignOutButton className="btn-ghost w-full" /> : null}

          <p className="text-center text-xs text-zinc-500">
            O acesso é liberado por um administrador após o primeiro login.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {DEFAULT_BOOKMAKERS.map((house) => (
            <span
              key={house.slug}
              className="rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-zinc-400"
            >
              {house.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

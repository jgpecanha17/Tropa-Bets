import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Callback do OAuth do Google: troca o `code` por uma sessão e redireciona.
 * O trigger `handle_new_user` cria o profile (pendente) no primeiro acesso.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard';
  const oauthError = searchParams.get('error_description') ?? searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Código de autenticação ausente.')}`);
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // Evita voltar para as telas de autenticação (fonte clássica de loop).
  const safeRedirect =
    redirectTo.startsWith('/') && !redirectTo.startsWith('/login') && !redirectTo.startsWith('/auth')
      ? redirectTo
      : '/dashboard';

  return NextResponse.redirect(`${origin}${safeRedirect}`);
}

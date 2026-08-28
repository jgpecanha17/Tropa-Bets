import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/models/database.types';
import { supabasePublicConfig } from '@/lib/env';

/** Rotas acessiveis sem login. */
const PUBLIC_PATHS = ['/login', '/auth', '/api/auth'];

const isPublic = (pathname: string) =>
  pathname === '/' || PUBLIC_PATHS.some((path) => pathname.startsWith(path));

/**
 * Renova os cookies de sessão a cada requisição e barra rotas privadas
 * para visitantes não autenticados. A checagem fina de status/role acontece
 * nos controllers (server-side), este é apenas o primeiro filtro.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url: supabaseUrl, anonKey } = supabasePublicConfig();

  const supabase = createServerClient<Database>(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Atenção: quem está logado NÃO é redirecionado daqui para /dashboard.
  // Esse desvio é feito pela própria página /login, que consegue ler o perfil e
  // escolher o destino certo. Fazê-lo aqui criava um ciclo infinito quando o
  // perfil não podia ser carregado (/dashboard mandava de volta para /login).

  return response;
}

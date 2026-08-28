import { cookies } from 'next/headers';
import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import type { Database } from '@/models/database.types';
import { env } from '@/lib/env';

/**
 * Client Supabase para Server Components, Server Actions e Route Handlers.
 * Respeita RLS — todas as queries rodam como o usuário logado.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado de um Server Component: o middleware já renova a sessão.
        }
      },
    },
  });
}

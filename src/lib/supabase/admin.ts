import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/models/database.types';
import { env } from '@/lib/env';

/**
 * Client com service role — ignora RLS.
 * Use SOMENTE no servidor e depois de checar que o autor da requisição e admin.
 */
export function createAdminSupabase() {
  return createClient<Database>(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

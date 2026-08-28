'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/models/database.types';
import { supabasePublicConfig } from '@/lib/env';

/** Client Supabase para componentes do browser (usa a anon key). */
export function createClient() {
  const { url, anonKey } = supabasePublicConfig();
  return createBrowserClient<Database>(url, anonKey);
}

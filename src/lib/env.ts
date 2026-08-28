/**
 * Leitura centralizada e validada das variáveis de ambiente.
 * Falha cedo (no boot) quando algo essencial está faltando.
 *
 * As variáveis públicas precisam ser lidas de forma literal
 * (`process.env.NEXT_PUBLIC_...`) para que o Next as substitua pelo valor real
 * durante o build — inclusive no bundle do browser e no middleware.
 */
const MISSING_ENV_HELP =
  'Cadastre as variáveis em .env.local (local) ou em Settings > Environment Variables na Vercel ' +
  'e faça um novo deploy — variáveis NEXT_PUBLIC_* são gravadas durante o build.';

function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Variável de ambiente ausente: ${name}. ${MISSING_ENV_HELP}`);
  }
  return trimmed;
}

/**
 * URL e anon key do Supabase — usadas no browser, no middleware e no servidor.
 *
 * Sem essa validação o cliente Supabase seria criado com a chave `undefined` e
 * a API responderia `{"message":"No API key found in request"}`, que não indica
 * a causa real do problema.
 */
export function supabasePublicConfig(): { url: string; anonKey: string } {
  return {
    url: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

export const env = {
  supabaseUrl: () => supabasePublicConfig().url,
  supabaseAnonKey: () => supabasePublicConfig().anonKey,
  supabaseServiceRoleKey: () =>
    required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
};

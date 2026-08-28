'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/** VIEW — Botão de login social (único meio de autenticação da aplicação). */
export function GoogleSignInButton({ redirectTo = '/dashboard' }: { redirectTo?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const callback = new URL('/auth/callback', window.location.origin);
    callback.searchParams.set('redirectTo', redirectTo);

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callback.toString(),
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={handleSignIn} disabled={loading} className="btn-primary w-full py-3">
        <GoogleIcon />
        {loading ? 'Redirecionando...' : 'Entrar com Google'}
      </button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.2l7.8 6.1C12.2 13.2 17.6 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.6 5.9c4.4-4.1 6.7-10.1 6.7-17.2z"
      />
      <path
        fill="#FBBC05"
        d="M10.3 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.5 10.8l7.8-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.4 0-11.8-3.7-13.7-8.9l-7.8 6.1C6.4 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

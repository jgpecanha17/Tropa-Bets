'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateTime } from '@/lib/format';
import type { Profile } from '@/models';

/** VIEW (admin) — Aba "Solicitações de acesso": aprova ou recusa novos usuários. */
export function AccessRequests({ pending }: { pending: Profile[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(id: string, status: 'approved' | 'rejected') {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error ?? 'Não foi possível concluir a ação.');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir a ação.');
    } finally {
      setBusyId(null);
    }
  }

  if (pending.length === 0) {
    return (
      <EmptyState
        title="Nenhuma solicitação pendente"
        description="Novos logins com Google aparecem aqui para aprovação."
      />
    );
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {pending.map((user) => (
        <div
          key={user.id}
          className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <Avatar src={user.avatar_url} name={user.full_name} email={user.email} size={44} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-100">
                {user.full_name ?? 'Sem nome'}
              </p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Solicitado em {formatDateTime(user.created_at)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => decide(user.id, 'approved')}
              disabled={busyId === user.id}
              className="btn-primary px-4 py-2 text-xs"
            >
              Aprovar
            </button>
            <button
              type="button"
              onClick={() => decide(user.id, 'rejected')}
              disabled={busyId === user.id}
              className="btn-danger px-4 py-2 text-xs"
            >
              Recusar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

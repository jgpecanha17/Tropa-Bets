'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { UserStatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime } from '@/lib/format';
import { ROLE_LABEL, type Profile, type UserRole, type UserStatus } from '@/models';

/** VIEW (admin) — Aba "Gerenciamento de usuários": status e promoção de role. */
export function UsersManager({ users, currentUserId }: { users: Profile[]; currentUserId: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(id: string, body: { role?: UserRole; status?: UserStatus }) {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error ?? 'Não foi possível atualizar o usuário.');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar o usuário.');
    } finally {
      setBusyId(null);
    }
  }

  if (users.length === 0) {
    return <EmptyState title="Nenhum usuário cadastrado" />;
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[820px] border-collapse">
          <thead className="border-b border-white/5">
            <tr>
              <th className="th">Usuário</th>
              <th className="th">Status</th>
              <th className="th">Permissão</th>
              <th className="th">Entrou em</th>
              <th className="th text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              const busy = busyId === user.id;

              return (
                <tr key={user.id} className="transition hover:bg-white/[0.02]">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <Avatar src={user.avatar_url} name={user.full_name} email={user.email} size={34} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-100">
                          {user.full_name ?? 'Sem nome'}
                          {isSelf ? <span className="ml-2 text-[10px] text-lime">(você)</span> : null}
                        </p>
                        <p className="truncate text-xs text-zinc-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td">
                    <UserStatusBadge status={user.status} />
                  </td>
                  <td className="td">
                    <select
                      className="input py-1.5 text-xs"
                      value={user.role}
                      disabled={isSelf || busy}
                      onChange={(event) => patch(user.id, { role: event.target.value as UserRole })}
                    >
                      <option value="user">{ROLE_LABEL.user}</option>
                      <option value="admin">{ROLE_LABEL.admin}</option>
                    </select>
                  </td>
                  <td className="td whitespace-nowrap text-zinc-400">
                    {formatDateTime(user.created_at)}
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-2">
                      {user.status !== 'approved' ? (
                        <button
                          type="button"
                          onClick={() => patch(user.id, { status: 'approved' })}
                          disabled={isSelf || busy}
                          className="btn-primary px-3 py-1.5 text-xs"
                        >
                          Aprovar
                        </button>
                      ) : null}
                      {user.status !== 'rejected' ? (
                        <button
                          type="button"
                          onClick={() => patch(user.id, { status: 'rejected' })}
                          disabled={isSelf || busy}
                          className="btn-danger px-3 py-1.5 text-xs"
                        >
                          Bloquear
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

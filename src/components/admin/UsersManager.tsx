'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { UserStatusBadge } from '@/components/ui/StatusBadge';
import { formatCPF, maskCPF, onlyDigits } from '@/lib/cpf';
import { formatDateTime } from '@/lib/format';
import { ROLE_LABEL, type Profile, type UserRole, type UserStatus } from '@/models';

/** VIEW (admin) — Aba "Gerenciamento de usuários": status e promoção de role. */
export function UsersManager({ users, currentUserId }: { users: Profile[]; currentUserId: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ legal_name: string; cpf: string }>({
    legal_name: '',
    cpf: '',
  });

  function startEditing(user: Profile) {
    setEditingId(user.id);
    setDraft({ legal_name: user.legal_name ?? '', cpf: maskCPF(user.cpf ?? '') });
    setError(null);
  }

  async function saveIdentity(id: string) {
    const body: { legal_name?: string; cpf?: string } = {};
    if (draft.legal_name.trim()) body.legal_name = draft.legal_name.trim();
    if (onlyDigits(draft.cpf)) body.cpf = onlyDigits(draft.cpf);

    if (!body.legal_name && !body.cpf) {
      setError('Informe o nome completo e/ou o CPF para salvar.');
      return;
    }
    await patch(id, body);
    setEditingId(null);
  }

  async function patch(
    id: string,
    body: { role?: UserRole; status?: UserStatus; legal_name?: string; cpf?: string },
  ) {
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
        const details = payload?.details
          ? Object.values(payload.details as Record<string, string[]>)
              .flat()
              .join(' ')
          : '';
        throw new Error(
          [payload?.error ?? 'Não foi possível atualizar o usuário.', details]
            .filter(Boolean)
            .join(' '),
        );
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
        <table className="w-full min-w-[1000px] border-collapse">
          <thead className="border-b border-white/5">
            <tr>
              <th className="th">Usuário</th>
              <th className="th">Nome completo / CPF</th>
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
                    {editingId === user.id ? (
                      <div className="flex w-[280px] flex-col gap-2">
                        <input
                          type="text"
                          className="input py-1.5 text-xs"
                          placeholder="Nome completo"
                          value={draft.legal_name}
                          onChange={(event) =>
                            setDraft((prev) => ({ ...prev, legal_name: event.target.value }))
                          }
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          className="input py-1.5 text-xs"
                          placeholder="000.000.000-00"
                          maxLength={14}
                          value={draft.cpf}
                          onChange={(event) =>
                            setDraft((prev) => ({ ...prev, cpf: maskCPF(event.target.value) }))
                          }
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveIdentity(user.id)}
                            disabled={busy}
                            className="btn-primary px-3 py-1.5 text-xs"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="btn-ghost px-3 py-1.5 text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="min-w-[180px]">
                        {user.legal_name || user.cpf ? (
                          <>
                            <p className="truncate text-zinc-200">{user.legal_name ?? '—'}</p>
                            <p className="text-xs text-zinc-500">{formatCPF(user.cpf)}</p>
                          </>
                        ) : (
                          <p className="text-xs text-zinc-500">Aguardando o afiliado informar</p>
                        )}
                        <button
                          type="button"
                          onClick={() => startEditing(user)}
                          className="mt-1 text-xs font-semibold text-lime hover:underline"
                        >
                          Editar dados
                        </button>
                      </div>
                    )}
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

'use client';

import { useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReviewBadge } from '@/components/ui/StatusBadge';
import { ReviewControls } from './ReviewControls';
import { cn, formatCurrency, formatDate } from '@/lib/format';
import { TYPE_LABEL, type AdminTransaction, type Profile } from '@/models';

interface UserRow {
  profile: Profile;
  transactions: AdminTransaction[];
  commission: number;
  deposits: number;
  pending: number;
}

/**
 * VIEW (admin) — Aba "Comissões": total por usuário e lançamento do valor
 * em cada movimentação. A comissão é sempre digitada pelo administrador.
 */
export function CommissionsManager({
  users,
  transactions,
}: {
  users: Profile[];
  transactions: AdminTransaction[];
}) {
  const [openUserId, setOpenUserId] = useState<string | null>(null);

  const rows = useMemo<UserRow[]>(() => {
    return users
      .filter((user) => user.status === 'approved')
      .map((profile) => {
        const owned = transactions.filter((tx) => tx.user_id === profile.id);
        return {
          profile,
          transactions: owned,
          commission: owned.reduce((sum, tx) => sum + (Number(tx.commission_amount) || 0), 0),
          deposits: owned
            .filter((tx) => tx.type === 'deposit')
            .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0),
          pending: owned.filter((tx) => tx.receipt_status === 'pending').length,
        };
      })
      .sort((a, b) => b.commission - a.commission);
  }, [users, transactions]);

  const total = rows.reduce((sum, row) => sum + row.commission, 0);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nenhum usuário aprovado ainda"
        description="Aprove membros na aba de solicitações para lançar comissões."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Comissão total lançada
          </p>
          <p className="mt-1 text-2xl font-bold text-lime">{formatCurrency(total)}</p>
        </div>
        <p className="max-w-sm text-xs text-zinc-500">
          Abra um usuário para lançar o valor da comissão em cada movimentação dele. O valor é
          digitado manualmente — não há cálculo automático por taxa.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row) => {
          const open = openUserId === row.profile.id;
          return (
            <div key={row.profile.id} className="card space-y-4">
              <button
                type="button"
                onClick={() => setOpenUserId(open ? null : row.profile.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={row.profile.avatar_url}
                    name={row.profile.full_name}
                    email={row.profile.email}
                    size={40}
                  />
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      {row.profile.full_name ?? row.profile.email}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {row.transactions.length} movimentação(ões) · depositado{' '}
                      {formatCurrency(row.deposits)}
                      {row.pending > 0 ? ` · ${row.pending} em análise` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Comissão
                    </p>
                    <p className="text-lg font-bold text-lime">{formatCurrency(row.commission)}</p>
                  </div>
                  <span className={cn('text-xs text-zinc-500 transition', open && 'rotate-180')}>
                    ▼
                  </span>
                </div>
              </button>

              {open ? (
                row.transactions.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Este usuário ainda não registrou movimentações.
                  </p>
                ) : (
                  <div className="space-y-3 border-t border-white/5 pt-4">
                    {row.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm text-zinc-300">
                            <strong>{tx.bookmaker?.name ?? '—'}</strong> · {TYPE_LABEL[tx.type]} ·{' '}
                            {formatCurrency(Number(tx.amount))} · {formatDate(tx.occurred_at)}
                          </p>
                          <ReviewBadge status={tx.receipt_status} />
                        </div>
                        <ReviewControls transaction={tx} />
                      </div>
                    ))}
                  </div>
                )
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

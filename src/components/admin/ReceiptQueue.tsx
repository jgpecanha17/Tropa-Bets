'use client';

import { useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReviewBadge } from '@/components/ui/StatusBadge';
import { ReviewControls } from './ReviewControls';
import { cn, formatCurrency, formatDate } from '@/lib/format';
import { TYPE_LABEL, type AdminTransaction, type ReceiptStatus } from '@/models';

const FILTERS: Array<{ key: ReceiptStatus | 'all'; label: string }> = [
  { key: 'pending', label: 'Em análise' },
  { key: 'approved', label: 'Validados' },
  { key: 'rejected', label: 'Recusados' },
  { key: 'all', label: 'Todos' },
];

/**
 * VIEW (admin) — Aba "Análise": fila dos depósitos e saques aguardando
 * validação. Cada cartão mostra quem lançou, o titular da conta e o valor,
 * com as ações de aprovar/recusar e o lançamento da comissão.
 */
export function ReceiptQueue({ transactions }: { transactions: AdminTransaction[] }) {
  const [filter, setFilter] = useState<ReceiptStatus | 'all'>('pending');

  const counts = useMemo(
    () => ({
      pending: transactions.filter((tx) => tx.receipt_status === 'pending').length,
      approved: transactions.filter((tx) => tx.receipt_status === 'approved').length,
      rejected: transactions.filter((tx) => tx.receipt_status === 'rejected').length,
      all: transactions.length,
    }),
    [transactions],
  );

  const visible = useMemo(
    () => (filter === 'all' ? transactions : transactions.filter((tx) => tx.receipt_status === filter)),
    [transactions, filter],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
              filter === item.key
                ? 'border-lime bg-lime/15 text-lime'
                : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-100',
            )}
          >
            {item.label} ({counts[item.key]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Nenhuma movimentação nesta situação"
          description="Assim que os afiliados registrarem depósitos ou saques, eles aparecem aqui para análise."
        />
      ) : (
        <div className="space-y-3">
          {visible.map((tx) => (
            <div key={tx.id} className="card space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={tx.owner?.avatar_url}
                    name={tx.owner?.full_name}
                    email={tx.owner?.email}
                    size={40}
                  />
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      {tx.owner?.full_name ?? tx.owner?.email ?? 'Usuário removido'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {tx.bookmaker?.name ?? '—'} · {formatDate(tx.occurred_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={
                      tx.type === 'deposit'
                        ? 'badge bg-sky-500/15 text-sky-300'
                        : 'badge bg-lime/15 text-lime'
                    }
                  >
                    {TYPE_LABEL[tx.type]}
                  </span>
                  <span className="text-lg font-bold text-zinc-50">
                    {formatCurrency(Number(tx.amount))}
                  </span>
                  <ReviewBadge status={tx.receipt_status} />
                </div>
              </div>

              {tx.notes ? <p className="text-sm text-zinc-400">Observação: {tx.notes}</p> : null}

              <ReviewControls transaction={tx} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

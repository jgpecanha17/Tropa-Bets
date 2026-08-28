'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReceiptBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/format';
import { TYPE_LABEL, type TransactionWithBookmaker } from '@/models';

/** VIEW — Histórico de movimentações da casa selecionada. */
export function TransactionTable({ transactions }: { transactions: TransactionWithBookmaker[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openReceipt(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/transactions/${id}/receipt`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? 'Comprovante indisponível.');
      window.open(payload.data.url as string, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comprovante indisponível.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Excluir esta movimentação? A ação não pode ser desfeita.')) return;
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error ?? 'Não foi possível excluir.');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir.');
    } finally {
      setBusyId(null);
    }
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        title="Nenhuma movimentação registrada"
        description="Use o formulario acima para lancar o primeiro depósito ou saque desta casa."
      />
    );
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[820px] border-collapse">
          <thead className="border-b border-white/5">
            <tr>
              <th className="th">Data</th>
              <th className="th">Tipo</th>
              <th className="th">Valor</th>
              <th className="th">Comissão</th>
              <th className="th">Comprovante</th>
              <th className="th">Observação</th>
              <th className="th text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.map((tx) => (
              <tr key={tx.id} className="transition hover:bg-white/[0.02]">
                <td className="td whitespace-nowrap text-zinc-400">{formatDate(tx.occurred_at)}</td>
                <td className="td">
                  <span
                    className={
                      tx.type === 'deposit'
                        ? 'badge bg-sky-500/15 text-sky-300'
                        : 'badge bg-lime/15 text-lime'
                    }
                  >
                    {TYPE_LABEL[tx.type]}
                  </span>
                </td>
                <td className="td whitespace-nowrap font-semibold">
                  {tx.type === 'deposit' ? '-' : '+'} {formatCurrency(Number(tx.amount))}
                </td>
                <td className="td whitespace-nowrap">
                  {Number(tx.commission_amount) > 0 ? (
                    <span className="font-semibold text-lime" title={tx.commission_note ?? undefined}>
                      {formatCurrency(Number(tx.commission_amount))}
                    </span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="td">
                  <ReceiptBadge status={tx.receipt_status} hasReceipt={Boolean(tx.receipt_path)} />
                </td>
                <td className="td max-w-[240px] truncate text-zinc-400">{tx.notes ?? '—'}</td>
                <td className="td">
                  <div className="flex justify-end gap-2">
                    {tx.receipt_path ? (
                      <button
                        type="button"
                        onClick={() => openReceipt(tx.id)}
                        disabled={busyId === tx.id}
                        className="btn-ghost px-3 py-1.5 text-xs"
                      >
                        Ver
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => remove(tx.id)}
                      disabled={busyId === tx.id}
                      className="btn-danger px-3 py-1.5 text-xs"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

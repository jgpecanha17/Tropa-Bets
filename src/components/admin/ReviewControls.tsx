'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/format';
import type { AdminTransaction, ReceiptStatus } from '@/models';

/**
 * VIEW (admin) — Ações de revisão de uma movimentação: abrir o comprovante,
 * aprovar/recusar e lançar a comissão (valor sempre digitado à mão).
 * Reaproveitado pela fila de comprovantes, pelas comissões e pela visão geral.
 */
export function ReviewControls({
  transaction,
  compact = false,
}: {
  transaction: AdminTransaction;
  compact?: boolean;
}) {
  const router = useRouter();
  const [commission, setCommission] = useState(String(Number(transaction.commission_amount) || 0));
  const [note, setNote] = useState(transaction.commission_note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch(`/api/admin/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        const details = payload?.details
          ? Object.values(payload.details as Record<string, string[]>)
              .flat()
              .join(' ')
          : '';
        throw new Error([payload?.error, details].filter(Boolean).join(' '));
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }

  async function openReceipt() {
    setError(null);
    try {
      const response = await fetch(`/api/transactions/${transaction.id}/receipt`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? 'Comprovante indisponível.');
      window.open(payload.data.url as string, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comprovante indisponível.');
    }
  }

  const decide = (receipt_status: ReceiptStatus) => patch({ receipt_status });

  const saveCommission = () =>
    patch({ commission_amount: commission === '' ? 0 : commission, commission_note: note });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {transaction.receipt_path ? (
          <button type="button" onClick={openReceipt} className="btn-ghost px-3 py-1.5 text-xs">
            Ver comprovante
          </button>
        ) : (
          <span className="text-xs text-zinc-500">Sem comprovante anexado</span>
        )}

        {transaction.receipt_status !== 'approved' ? (
          <button
            type="button"
            onClick={() => decide('approved')}
            disabled={busy}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            Aprovar
          </button>
        ) : null}

        {transaction.receipt_status !== 'rejected' ? (
          <button
            type="button"
            onClick={() => decide('rejected')}
            disabled={busy}
            className="btn-danger px-3 py-1.5 text-xs"
          >
            Recusar
          </button>
        ) : null}

        {transaction.receipt_status !== 'pending' ? (
          <button
            type="button"
            onClick={() => decide('pending')}
            disabled={busy}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            Voltar para análise
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-32">
          <label className="label" htmlFor={`commission-${transaction.id}`}>
            Comissão (R$)
          </label>
          <input
            id={`commission-${transaction.id}`}
            type="number"
            step="0.01"
            min="0"
            className="input py-1.5 text-sm"
            value={commission}
            onChange={(event) => setCommission(event.target.value)}
          />
        </div>

        {!compact ? (
          <div className="min-w-[180px] flex-1">
            <label className="label" htmlFor={`note-${transaction.id}`}>
              Observação da comissão
            </label>
            <input
              id={`note-${transaction.id}`}
              type="text"
              maxLength={280}
              placeholder="Opcional"
              className="input py-1.5 text-sm"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        ) : null}

        <button
          type="button"
          onClick={saveCommission}
          disabled={busy}
          className="btn-primary px-3 py-2 text-xs"
        >
          {busy ? 'Salvando...' : 'Salvar comissão'}
        </button>

        {saved ? <span className="text-xs text-lime">Salvo</span> : null}
      </div>

      {Number(transaction.commission_amount) > 0 ? (
        <p className="text-xs text-zinc-500">
          Comissão atual: {formatCurrency(Number(transaction.commission_amount))}
          {transaction.commission_note ? ` — ${transaction.commission_note}` : ''}
        </p>
      ) : null}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}

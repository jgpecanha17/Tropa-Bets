'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import type { Bookmaker } from '@/models';

/**
 * VIEW — Formulario de movimentação (depósito/saque + comprovante).
 * Envia multipart para POST /api/transactions; o upload acontece no servidor.
 */
export function TransactionForm({ bookmaker }: { bookmaker: Bookmaker }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    formData.set('bookmaker_id', bookmaker.id);

    try {
      const response = await fetch('/api/transactions', { method: 'POST', body: formData });
      const payload = await response.json();

      if (!response.ok) {
        const details = payload?.details
          ? Object.values(payload.details as Record<string, string[]>)
              .flat()
              .join(' ')
          : '';
        throw new Error([payload?.error, details].filter(Boolean).join(' '));
      }

      formRef.current?.reset();
      setSuccess('Movimentação registrada com sucesso.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar a movimentação.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">Nova movimentação</h3>
        <p className="text-xs text-zinc-500">Registre um depósito ou saque em {bookmaker.name}.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="label" htmlFor={`type-${bookmaker.id}`}>
            Tipo
          </label>
          <select id={`type-${bookmaker.id}`} name="type" className="input" defaultValue="deposit" required>
            <option value="deposit">Depósito</option>
            <option value="withdrawal">Saque</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor={`amount-${bookmaker.id}`}>
            Valor (R$)
          </label>
          <input
            id={`amount-${bookmaker.id}`}
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
            className="input"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor={`date-${bookmaker.id}`}>
            Data
          </label>
          <input
            id={`date-${bookmaker.id}`}
            name="occurred_at"
            type="date"
            defaultValue={today}
            max={today}
            className="input"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor={`receipt-${bookmaker.id}`}>
            Comprovante
          </label>
          <input
            id={`receipt-${bookmaker.id}`}
            name="receipt"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-lime/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-lime"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor={`notes-${bookmaker.id}`}>
          Observação (opcional)
        </label>
        <input
          id={`notes-${bookmaker.id}`}
          name="notes"
          type="text"
          maxLength={280}
          placeholder="Ex.: bonus de cadastro, PIX da rodada..."
          className="input"
        />
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Registrar movimentação'}
        </button>
      </div>
    </form>
  );
}

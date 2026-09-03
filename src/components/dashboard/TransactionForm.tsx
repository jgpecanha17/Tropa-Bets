'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { formatCPF, isValidCPF, maskCPF, onlyDigits } from '@/lib/cpf';
import { formatCurrency } from '@/lib/format';
import type { Bookmaker, Profile } from '@/models';

/**
 * VIEW — Formulário de movimentação.
 * Além do valor e da data, o afiliado informa o titular da conta aberta pelo
 * link: ele mesmo (dados do próprio cadastro) ou outra pessoa, que não precisa
 * ter conta no sistema.
 */
export function TransactionForm({
  bookmaker,
  profile,
}: {
  bookmaker: Bookmaker;
  profile: Profile;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const minDeposit = Number(bookmaker.min_deposit) || 0;

  const [type, setType] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [occurredAt, setOccurredAt] = useState(today);
  const [isSelf, setIsSelf] = useState(true);
  const [holderName, setHolderName] = useState('');
  const [holderCpf, setHolderCpf] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Aviso (não bloqueio): o depósito pode ser fracionado de propósito.
  const belowBaseline =
    type === 'deposit' && minDeposit > 0 && amount !== '' && Number(amount) < minDeposit;

  const ownName = profile.legal_name ?? profile.full_name ?? '';
  const ownCpf = profile.cpf ?? '';

  function reset() {
    setType('deposit');
    setAmount('');
    setOccurredAt(today);
    setIsSelf(true);
    setHolderName('');
    setHolderCpf('');
    setNotes('');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const name = isSelf ? ownName : holderName.trim();
    const cpf = onlyDigits(isSelf ? ownCpf : holderCpf);

    if (!name || name.split(/\s+/).filter(Boolean).length < 2) {
      setError('Informe o nome completo do titular da conta.');
      return;
    }
    if (!isValidCPF(cpf)) {
      setError('CPF do titular inválido — confira os números.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmaker_id: bookmaker.id,
          type,
          amount,
          occurred_at: occurredAt,
          account_holder_is_self: isSelf,
          account_holder_name: name,
          account_holder_cpf: cpf,
          notes,
        }),
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

      reset();
      setSuccess('Movimentação registrada! Ela entra em análise pelo administrador.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar a movimentação.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">Nova movimentação</h3>
        <p className="text-xs text-zinc-500">
          Registre um depósito ou saque em {bookmaker.name} e informe de quem é a conta.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div>
          <label className="label" htmlFor={`type-${bookmaker.id}`}>
            Tipo
          </label>
          <select
            id={`type-${bookmaker.id}`}
            className="input"
            value={type}
            onChange={(event) => setType(event.target.value)}
            required
          >
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
            type="number"
            step="0.01"
            min="0.01"
            placeholder={minDeposit > 0 ? `mínimo ${minDeposit.toFixed(2)}` : '0,00'}
            className="input"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
          {minDeposit > 0 && type === 'deposit' ? (
            <p className="mt-1 text-xs text-zinc-500">
              Aporte mínimo desta casa: {formatCurrency(minDeposit)}
            </p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor={`date-${bookmaker.id}`}>
            Data
          </label>
          <input
            id={`date-${bookmaker.id}`}
            type="date"
            max={today}
            className="input"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            required
          />
        </div>
      </div>

      {/* Titular da conta aberta pelo link */}
      <fieldset className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Titular da conta na {bookmaker.name}
        </legend>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsSelf(true)}
            className={
              isSelf
                ? 'btn-primary px-3.5 py-2 text-xs'
                : 'btn-ghost px-3.5 py-2 text-xs'
            }
          >
            Conta no meu nome
          </button>
          <button
            type="button"
            onClick={() => setIsSelf(false)}
            className={
              !isSelf
                ? 'btn-primary px-3.5 py-2 text-xs'
                : 'btn-ghost px-3.5 py-2 text-xs'
            }
          >
            Conta de outra pessoa
          </button>
        </div>

        {isSelf ? (
          <div className="mt-3 rounded-lg border border-white/5 bg-ink-900 px-3.5 py-3 text-sm">
            <p className="font-medium text-zinc-100">{ownName || 'Nome não informado'}</p>
            <p className="text-xs text-zinc-500">{formatCPF(ownCpf)}</p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={`holder-name-${bookmaker.id}`}>
                Nome completo do titular
              </label>
              <input
                id={`holder-name-${bookmaker.id}`}
                type="text"
                className="input"
                placeholder="Como está no documento"
                maxLength={120}
                value={holderName}
                onChange={(event) => setHolderName(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor={`holder-cpf-${bookmaker.id}`}>
                CPF do titular
              </label>
              <input
                id={`holder-cpf-${bookmaker.id}`}
                type="text"
                inputMode="numeric"
                className="input"
                placeholder="000.000.000-00"
                maxLength={14}
                value={holderCpf}
                onChange={(event) => setHolderCpf(maskCPF(event.target.value))}
                required
              />
            </div>
            <p className="text-xs text-zinc-500 sm:col-span-2">
              A pessoa não precisa ter cadastro aqui — a comissão fica para você.
            </p>
          </div>
        )}
      </fieldset>

      <div>
        <label className="label" htmlFor={`notes-${bookmaker.id}`}>
          Observação (opcional)
        </label>
        <input
          id={`notes-${bookmaker.id}`}
          type="text"
          maxLength={280}
          placeholder="Ex.: bônus de cadastro, PIX da rodada..."
          className="input"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      {belowBaseline ? (
        <Alert tone="error">
          Este depósito está <strong>abaixo do aporte mínimo</strong> de{' '}
          {formatCurrency(minDeposit)} definido para a {bookmaker.name}. Você ainda pode
          registrar, mas confira se é isso mesmo.
        </Alert>
      ) : null}
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

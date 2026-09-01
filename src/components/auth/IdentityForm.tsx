'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { formatCPF, isValidCPF, maskCPF, onlyDigits } from '@/lib/cpf';

type Step = 'form' | 'confirm';

/**
 * VIEW — Cadastro de nome completo e CPF, em dois passos:
 * 1) preenchimento, 2) conferência dos dados antes de gravar.
 * Os dados só podem ser enviados uma vez; depois disso, apenas o
 * administrador consegue alterá-los.
 */
export function IdentityForm({ email }: { email: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [legalName, setLegalName] = useState('');
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameParts = legalName.trim().split(/\s+/).filter(Boolean);

  function goToConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (nameParts.length < 2) {
      setError('Informe o nome completo (nome e sobrenome).');
      return;
    }
    if (!isValidCPF(cpf)) {
      setError('CPF inválido — confira os números digitados.');
      return;
    }
    setStep('confirm');
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/profile/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legal_name: legalName.trim(), cpf: onlyDigits(cpf) }),
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

      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar seus dados.');
      setStep('form');
      setSubmitting(false);
    }
  }

  if (step === 'confirm') {
    return (
      <div className="space-y-5">
        <Alert tone="error">
          <p className="font-semibold">Confira antes de confirmar.</p>
          <p className="mt-1">
            Estes dados só podem ser enviados <strong>uma vez</strong>. Depois de confirmados,
            apenas o administrador consegue alterá-los.
          </p>
        </Alert>

        <dl className="divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="px-4 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Nome completo
            </dt>
            <dd className="mt-0.5 text-base font-semibold text-zinc-50">{legalName.trim()}</dd>
          </div>
          <div className="px-4 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              CPF
            </dt>
            <dd className="mt-0.5 text-base font-semibold text-zinc-50">{formatCPF(cpf)}</dd>
          </div>
          <div className="px-4 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Conta
            </dt>
            <dd className="mt-0.5 text-sm text-zinc-400">{email}</dd>
          </div>
        </dl>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="btn-primary flex-1 py-3"
          >
            {submitting ? 'Salvando...' : 'Confirmar dados'}
          </button>
          <button
            type="button"
            onClick={() => setStep('form')}
            disabled={submitting}
            className="btn-ghost flex-1"
          >
            Corrigir
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={goToConfirm} className="space-y-4">
      <div>
        <label className="label" htmlFor="legal_name">
          Nome completo
        </label>
        <input
          id="legal_name"
          name="legal_name"
          type="text"
          autoComplete="name"
          placeholder="Como está no documento"
          className="input"
          value={legalName}
          onChange={(event) => setLegalName(event.target.value)}
          maxLength={120}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="cpf">
          CPF
        </label>
        <input
          id="cpf"
          name="cpf"
          type="text"
          inputMode="numeric"
          placeholder="000.000.000-00"
          className="input"
          value={cpf}
          onChange={(event) => setCpf(maskCPF(event.target.value))}
          maxLength={14}
          required
        />
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <p className="text-xs text-zinc-500">
        Você vai conferir os dados na próxima tela antes de gravar. O envio é feito uma única
        vez — depois disso, só o administrador pode corrigir.
      </p>

      <button type="submit" className="btn-primary w-full py-3">
        Revisar dados
      </button>
    </form>
  );
}

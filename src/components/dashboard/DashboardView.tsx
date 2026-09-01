'use client';

import { useMemo, useState } from 'react';
import { AffiliateLinkActions } from './AffiliateLinkActions';
import { OperationGuidelines } from './OperationGuidelines';
import { SummaryCards } from './SummaryCards';
import { TransactionForm } from './TransactionForm';
import { TransactionTable } from './TransactionTable';
import { cn, formatCurrency } from '@/lib/format';
import { ProfileRules, summarize, type Bookmaker, type Profile, type TransactionWithBookmaker } from '@/models';

/**
 * VIEW — Painel do usuário com uma aba por casa de aposta.
 * Recebe os dados já resolvidos no servidor (dashboardController).
 */
export function DashboardView({
  profile,
  bookmakers,
  transactions,
}: {
  profile: Profile;
  bookmakers: Bookmaker[];
  transactions: TransactionWithBookmaker[];
}) {
  const [activeId, setActiveId] = useState(bookmakers[0]?.id ?? '');
  const active = bookmakers.find((b) => b.id === activeId) ?? bookmakers[0];

  const byBookmaker = useMemo(
    () => transactions.filter((tx) => tx.bookmaker_id === active?.id),
    [transactions, active?.id],
  );

  const summary = useMemo(() => summarize(byBookmaker), [byBookmaker]);
  const globalSummary = useMemo(() => summarize(transactions), [transactions]);

  if (!active) {
    return (
      <div className="card">
        <p className="text-sm text-zinc-400">
          Nenhuma casa de aposta ativa. Peca ao administrador para habilitar as casas em
          /admin.
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">
            Olá, {ProfileRules.displayName(profile)}
          </h1>
          <p className="text-sm text-zinc-400">
            Resultado geral em todas as casas:{' '}
            <strong className={globalSummary.balance >= 0 ? 'text-lime' : 'text-red-300'}>
              {formatCurrency(globalSummary.balance)}
            </strong>{' '}
            em {globalSummary.count} lancamentos.
          </p>
        </div>
      </header>

      <OperationGuidelines />

      {/* Abas: uma por casa de aposta */}
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {bookmakers.map((house) => {
          const count = transactions.filter((tx) => tx.bookmaker_id === house.id).length;
          return (
            <button
              key={house.id}
              type="button"
              onClick={() => setActiveId(house.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
                house.id === active.id
                  ? 'border-lime bg-lime text-ink-950'
                  : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]',
              )}
            >
              {house.name}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  house.id === active.id ? 'bg-ink-950/20 text-ink-950' : 'bg-white/10 text-zinc-400',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Cabeçalho da aba: link de afiliado gerenciado pelo admin */}
      <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className="h-9 w-1.5 rounded-full"
            style={{ backgroundColor: active.brand_color ?? '#c8f542' }}
          />
          <div>
            <h2 className="text-lg font-bold text-zinc-50">{active.name}</h2>
            <p className="text-xs text-zinc-500">
              {byBookmaker.length} movimentação(ões) registrada(s) nesta casa
            </p>
            {Number(active.min_deposit) > 0 ? (
              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                Aporte mínimo: {formatCurrency(Number(active.min_deposit))}
              </p>
            ) : null}
          </div>
        </div>

        <AffiliateLinkActions bookmaker={active} />
      </div>

      <SummaryCards summary={summary} />
      <TransactionForm bookmaker={active} />
      <TransactionTable transactions={byBookmaker} />
    </>
  );
}

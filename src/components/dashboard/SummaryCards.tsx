import { formatCurrency } from '@/lib/format';
import type { TransactionSummary } from '@/models';

/** VIEW — Cards de totais (depósito, saque, saldo e quantidade). */
export function SummaryCards({ summary }: { summary: TransactionSummary }) {
  const positive = summary.balance >= 0;

  const cards = [
    {
      label: 'Total depositado',
      value: formatCurrency(summary.deposits),
      hint: 'Entradas de banca nesta casa',
      accent: 'text-zinc-50',
    },
    {
      label: 'Total sacado',
      value: formatCurrency(summary.withdrawals),
      hint: 'Retiradas confirmadas',
      accent: 'text-zinc-50',
    },
    {
      label: 'Resultado',
      value: formatCurrency(summary.balance),
      hint: positive ? 'Saques acima dos depósitos' : 'Depósitos acima dos saques',
      accent: positive ? 'text-lime' : 'text-red-300',
      highlight: true,
    },
    {
      label: 'Movimentações',
      value: String(summary.count),
      hint: 'Lancamentos registrados',
      accent: 'text-zinc-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={
            card.highlight
              ? 'card border-lime/30 bg-gradient-to-b from-lime/10 to-transparent'
              : 'card'
          }
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {card.label}
          </p>
          <p className={`mt-2 text-2xl font-bold ${card.accent}`}>{card.value}</p>
          <p className="mt-1 text-xs text-zinc-500">{card.hint}</p>
        </div>
      ))}
    </div>
  );
}

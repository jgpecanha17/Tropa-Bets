'use client';

import { Fragment, useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReceiptBadge } from '@/components/ui/StatusBadge';
import { ReviewControls } from './ReviewControls';
import { cn, formatCurrency, formatDate } from '@/lib/format';
import {
  TYPE_LABEL,
  summarize,
  type AdminTransaction,
  type Bookmaker,
  type Profile,
} from '@/models';

/**
 * VIEW (admin) — Aba "Visão geral": todas as movimentações de todos os
 * usuários, com filtros e as ações de aprovação e comissão na própria linha.
 */
export function AllTransactions({
  users,
  bookmakers,
  transactions,
}: {
  users: Profile[];
  bookmakers: Bookmaker[];
  transactions: AdminTransaction[];
}) {
  const [userId, setUserId] = useState('');
  const [bookmakerId, setBookmakerId] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      transactions.filter(
        (tx) =>
          (!userId || tx.user_id === userId) &&
          (!bookmakerId || tx.bookmaker_id === bookmakerId) &&
          (!status || tx.receipt_status === status) &&
          (!type || tx.type === type),
      ),
    [transactions, userId, bookmakerId, status, type],
  );

  const summary = useMemo(() => summarize(visible), [visible]);

  const cards = [
    { label: 'Depositado', value: formatCurrency(summary.deposits), accent: 'text-zinc-50' },
    { label: 'Sacado', value: formatCurrency(summary.withdrawals), accent: 'text-zinc-50' },
    { label: 'Comissões', value: formatCurrency(summary.commission), accent: 'text-lime' },
    {
      label: 'Em análise',
      value: String(summary.pendingReceipts),
      accent: summary.pendingReceipts > 0 ? 'text-amber-300' : 'text-zinc-50',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {card.label}
            </p>
            <p className={cn('mt-1.5 text-xl font-bold', card.accent)}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="card grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="label" htmlFor="filter-user">
            Usuário
          </label>
          <select
            id="filter-user"
            className="input py-2 text-sm"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          >
            <option value="">Todos</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name ?? user.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="filter-bookmaker">
            Casa de aposta
          </label>
          <select
            id="filter-bookmaker"
            className="input py-2 text-sm"
            value={bookmakerId}
            onChange={(event) => setBookmakerId(event.target.value)}
          >
            <option value="">Todas</option>
            {bookmakers.map((house) => (
              <option key={house.id} value={house.id}>
                {house.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="filter-status">
            Comprovante
          </label>
          <select
            id="filter-status"
            className="input py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="pending">Em análise</option>
            <option value="approved">Validado</option>
            <option value="rejected">Recusado</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="filter-type">
            Tipo
          </label>
          <select
            id="filter-type"
            className="input py-2 text-sm"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="deposit">Depósito</option>
            <option value="withdrawal">Saque</option>
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Nenhuma movimentação encontrada"
          description="Ajuste os filtros acima para ver outros lançamentos."
        />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="border-b border-white/5">
              <tr>
                <th className="th">Usuário</th>
                <th className="th">Casa</th>
                <th className="th">Data</th>
                <th className="th">Tipo</th>
                <th className="th">Valor</th>
                <th className="th">Comissão</th>
                <th className="th">Comprovante</th>
                <th className="th text-right">Revisar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visible.map((tx) => (
                <Fragment key={tx.id}>
                  <tr className="transition hover:bg-white/[0.02]">
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={tx.owner?.avatar_url}
                          name={tx.owner?.full_name}
                          email={tx.owner?.email}
                          size={28}
                        />
                        <span className="max-w-[160px] truncate">
                          {tx.owner?.full_name ?? tx.owner?.email ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="td text-zinc-400">{tx.bookmaker?.name ?? '—'}</td>
                    <td className="td whitespace-nowrap text-zinc-400">
                      {formatDate(tx.occurred_at)}
                    </td>
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
                      {formatCurrency(Number(tx.amount))}
                    </td>
                    <td className="td whitespace-nowrap font-semibold text-lime">
                      {formatCurrency(Number(tx.commission_amount))}
                    </td>
                    <td className="td">
                      <ReceiptBadge status={tx.receipt_status} hasReceipt={Boolean(tx.receipt_path)} />
                    </td>
                    <td className="td text-right">
                      <button
                        type="button"
                        onClick={() => setOpenId(openId === tx.id ? null : tx.id)}
                        className="btn-ghost px-3 py-1.5 text-xs"
                      >
                        {openId === tx.id ? 'Fechar' : 'Revisar'}
                      </button>
                    </td>
                  </tr>
                  {openId === tx.id ? (
                    <tr className="bg-white/[0.02]">
                      <td className="td" colSpan={8}>
                        <ReviewControls transaction={tx} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

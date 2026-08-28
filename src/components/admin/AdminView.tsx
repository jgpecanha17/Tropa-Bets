'use client';

import { useState } from 'react';
import { AccessRequests } from './AccessRequests';
import { AllTransactions } from './AllTransactions';
import { BookmakerSettings } from './BookmakerSettings';
import { CommissionsManager } from './CommissionsManager';
import { ReceiptQueue } from './ReceiptQueue';
import { UsersManager } from './UsersManager';
import { cn } from '@/lib/format';
import type { AdminTransaction, Bookmaker, Profile } from '@/models';

type TabKey = 'overview' | 'receipts' | 'commissions' | 'requests' | 'users' | 'bookmakers';

/** VIEW (admin) — Painel administrativo organizado em abas. */
export function AdminView({
  profile,
  users,
  bookmakers,
  transactions,
}: {
  profile: Profile;
  users: Profile[];
  bookmakers: Bookmaker[];
  transactions: AdminTransaction[];
}) {
  const [tab, setTab] = useState<TabKey>('overview');
  const pending = users.filter((user) => user.status === 'pending_approval');
  const pendingReceipts = transactions.filter((tx) => tx.receipt_status === 'pending');

  const tabs: Array<{ key: TabKey; label: string; badge?: number }> = [
    { key: 'overview', label: 'Visão geral', badge: transactions.length },
    { key: 'receipts', label: 'Comprovantes', badge: pendingReceipts.length },
    { key: 'commissions', label: 'Comissões', badge: users.filter((u) => u.status === 'approved').length },
    { key: 'requests', label: 'Solicitações de acesso', badge: pending.length },
    { key: 'users', label: 'Gerenciamento de usuários', badge: users.length },
    { key: 'bookmakers', label: 'Casas & links', badge: bookmakers.length },
  ];

  return (
    <>
      <header className="card">
        <h1 className="text-xl font-bold text-zinc-50">Administração</h1>
        <p className="text-sm text-zinc-400">
          Analise comprovantes, lance comissões, aprove novos membros e mantenha os links das
          casas atualizados.
        </p>
      </header>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
              tab === item.key
                ? 'border-lime bg-lime text-ink-950'
                : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]',
            )}
          >
            {item.label}
            {item.badge !== undefined ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  tab === item.key ? 'bg-ink-950/20 text-ink-950' : 'bg-white/10 text-zinc-400',
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {tab === 'overview' ? (
        <AllTransactions users={users} bookmakers={bookmakers} transactions={transactions} />
      ) : null}
      {tab === 'receipts' ? <ReceiptQueue transactions={transactions} /> : null}
      {tab === 'commissions' ? (
        <CommissionsManager users={users} transactions={transactions} />
      ) : null}
      {tab === 'requests' ? <AccessRequests pending={pending} /> : null}
      {tab === 'users' ? <UsersManager users={users} currentUserId={profile.id} /> : null}
      {tab === 'bookmakers' ? <BookmakerSettings bookmakers={bookmakers} /> : null}
    </>
  );
}

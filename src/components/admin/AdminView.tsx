'use client';

import { useState } from 'react';
import { AccessRequests } from './AccessRequests';
import { BookmakerSettings } from './BookmakerSettings';
import { UsersManager } from './UsersManager';
import { cn } from '@/lib/format';
import type { Bookmaker, Profile } from '@/models';

type TabKey = 'requests' | 'users' | 'bookmakers';

/** VIEW (admin) — Painel administrativo organizado em abas. */
export function AdminView({
  profile,
  users,
  bookmakers,
}: {
  profile: Profile;
  users: Profile[];
  bookmakers: Bookmaker[];
}) {
  const [tab, setTab] = useState<TabKey>('requests');
  const pending = users.filter((user) => user.status === 'pending_approval');

  const tabs: Array<{ key: TabKey; label: string; badge?: number }> = [
    { key: 'requests', label: 'Solicitações de acesso', badge: pending.length },
    { key: 'users', label: 'Gerenciamento de usuários', badge: users.length },
    { key: 'bookmakers', label: 'Configurações & links das casas', badge: bookmakers.length },
  ];

  return (
    <>
      <header className="card">
        <h1 className="text-xl font-bold text-zinc-50">Administração</h1>
        <p className="text-sm text-zinc-400">
          Aprove novos membros, ajuste permissões e mantenha os links das casas atualizados.
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

      {tab === 'requests' ? <AccessRequests pending={pending} /> : null}
      {tab === 'users' ? <UsersManager users={users} currentUserId={profile.id} /> : null}
      {tab === 'bookmakers' ? <BookmakerSettings bookmakers={bookmakers} /> : null}
    </>
  );
}

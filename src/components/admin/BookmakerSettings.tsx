'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import type { Bookmaker } from '@/models';

/** VIEW (admin) — Aba "Configurações & links": link de indicação de cada casa. */
export function BookmakerSettings({ bookmakers }: { bookmakers: Bookmaker[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(bookmakers.map((b) => [b.id, b.affiliate_url ?? ''])),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);

  async function save(bookmaker: Bookmaker) {
    setBusyId(bookmaker.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/bookmakers/${bookmaker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliate_url: drafts[bookmaker.id]?.trim() ?? '' }),
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
      setFeedback({ tone: 'success', message: `Link da ${bookmaker.name} salvo com sucesso.` });
      router.refresh();
    } catch (err) {
      setFeedback({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Não foi possível salvar o link.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(bookmaker: Bookmaker) {
    setBusyId(bookmaker.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/bookmakers/${bookmaker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_url: drafts[bookmaker.id]?.trim() ?? '',
          is_active: !bookmaker.is_active,
        }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error ?? 'Não foi possível atualizar a casa.');
      }
      router.refresh();
    } catch (err) {
      setFeedback({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Não foi possível atualizar a casa.',
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {feedback ? <Alert tone={feedback.tone}>{feedback.message}</Alert> : null}

      {bookmakers.map((bookmaker) => (
        <div key={bookmaker.id} className="card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="h-8 w-1.5 rounded-full"
                style={{ backgroundColor: bookmaker.brand_color ?? '#c8f542' }}
              />
              <div>
                <p className="text-sm font-semibold text-zinc-100">{bookmaker.name}</p>
                <p className="text-xs text-zinc-500">/{bookmaker.slug}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleActive(bookmaker)}
              disabled={busyId === bookmaker.id}
              className={bookmaker.is_active ? 'btn-ghost px-3 py-1.5 text-xs' : 'btn-primary px-3 py-1.5 text-xs'}
            >
              {bookmaker.is_active ? 'Desativar' : 'Ativar'}
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <label className="label" htmlFor={`url-${bookmaker.id}`}>
                Link de indicação / cadastro
              </label>
              <input
                id={`url-${bookmaker.id}`}
                type="url"
                className="input"
                placeholder="https://..."
                value={drafts[bookmaker.id] ?? ''}
                onChange={(event) =>
                  setDrafts((prev) => ({ ...prev, [bookmaker.id]: event.target.value }))
                }
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => save(bookmaker)}
                disabled={busyId === bookmaker.id}
                className="btn-primary w-full sm:w-auto"
              >
                {busyId === bookmaker.id ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

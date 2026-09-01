'use client';

import { useEffect, useState } from 'react';
import type { Bookmaker } from '@/models';

type Feedback = { tone: 'ok' | 'error'; message: string } | null;

/**
 * Copia texto para a área de transferência.
 * `navigator.clipboard` só existe em contexto seguro (HTTPS/localhost); fora
 * disso caímos no textarea + execCommand, que ainda funciona nos navegadores.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Cai no método alternativo abaixo.
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}

/**
 * VIEW — Ações do link de afiliado da casa: abrir, copiar e compartilhar.
 * O compartilhamento usa a folha nativa do sistema quando disponível
 * (celulares); no desktop, sem suporte, ele copia o link e avisa.
 */
export function AffiliateLinkActions({ bookmaker }: { bookmaker: Bookmaker }) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [canShare, setCanShare] = useState(false);
  const url = bookmaker.affiliate_url ?? '';

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function handleCopy() {
    const copied = await copyToClipboard(url);
    setFeedback(
      copied
        ? { tone: 'ok', message: 'Link copiado!' }
        : { tone: 'error', message: 'Não foi possível copiar. Copie manualmente pelo botão Abrir.' },
    );
  }

  async function handleShare() {
    const data = {
      title: `Cadastro ${bookmaker.name}`,
      text: `Faça seu cadastro na ${bookmaker.name}:`,
      url,
    };

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        // O usuário fechar a folha de compartilhamento não é erro.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    const copied = await copyToClipboard(url);
    setFeedback(
      copied
        ? { tone: 'ok', message: 'Compartilhamento indisponível aqui — link copiado!' }
        : { tone: 'error', message: 'Não foi possível compartilhar nem copiar o link.' },
    );
  }

  if (!url) {
    return (
      <span className="rounded-xl border border-dashed border-white/10 px-4 py-2.5 text-xs text-zinc-500">
        Link de cadastro ainda não configurado pelo administrador
      </span>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary">
          Abrir cadastro ↗
        </a>

        <button type="button" onClick={handleCopy} className="btn-ghost">
          <CopyIcon />
          Copiar link
        </button>

        <button type="button" onClick={handleShare} className="btn-ghost">
          <ShareIcon />
          {canShare ? 'Compartilhar' : 'Compartilhar link'}
        </button>
      </div>

      {feedback ? (
        <p
          className={`text-xs ${feedback.tone === 'ok' ? 'text-lime' : 'text-red-300'}`}
          role="status"
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m8.4 10.8 7.2-4.2M8.4 13.2l7.2 4.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

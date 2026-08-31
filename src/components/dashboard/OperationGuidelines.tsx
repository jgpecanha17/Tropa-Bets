'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'pa:guidelines-collapsed';

interface Rule {
  icon: string;
  title: string;
  text: string;
  tone?: 'warn' | 'danger';
}

/** Requisitos de operação — texto definido pela administração. */
const REQUIREMENTS: Rule[] = [
  {
    icon: '💰',
    title: 'Movimentação acima da baseline',
    text: 'Sempre deposite e gere volume superior ao mínimo exigido.',
  },
  {
    icon: '✅',
    title: 'Valores variados',
    text: 'Recomendamos realizar depósitos com valores variados, evitando padrões fixos nas transações.',
  },
  {
    icon: '💳',
    title: 'Mínimo de 2 depósitos por conta',
    text: 'Mesmo que sejam valores menores, faça depósitos fracionados para gerar mais atividade.',
  },
  {
    icon: '⏳',
    title: 'Depósito após a criação da conta',
    text: 'OBRIGATÓRIO depositar depois de um tempo de conta criada, para mostrar que o jogador é ativo (5 a 10 dias). Pode ser o valor mínimo.',
    tone: 'warn',
  },
  {
    icon: '❌',
    title: 'Não bater rollover e sacar (mines, aviator)',
    text: 'Isso vai dar fraude na certa! Deposita, perde tudo, ou dobra o valor da banca (apenas em slot, sem ao vivo).',
    tone: 'danger',
  },
];

const HOW_TO: Array<{ title: string; text: string }> = [
  {
    title: 'Cadastro e primeiro depósito',
    text: 'Peça para a pessoa criar a conta pelo link e realizar um depósito inicial. Lembre-se de sempre variar esse valor.',
  },
  {
    title: 'Cuidado com o IP',
    text: 'Tenha muita atenção ao movimentar as contas. Utilize sempre a conexão 4G/5G ou navegue em guia anônima para evitar cruzamento de dados.',
  },
  {
    title: 'Volume de movimentação (rollover)',
    text: 'Ao operar a conta (buscando lucro ou não), gire sempre um volume superior ao valor base depositado para manter a movimentação com padrão natural.',
  },
  {
    title: 'Tempo de retenção e recorrência',
    text: 'Mantenha o saldo na conta por pelo menos 12 horas. Além disso, realize depósitos mínimos a cada 10 dias até que a comissão/bônus de indicação seja creditada.',
  },
];

const TONES = {
  warn: 'border-amber-400/30 bg-amber-400/[0.06]',
  danger: 'border-red-500/30 bg-red-500/[0.06]',
  default: 'border-white/5 bg-white/[0.02]',
};

/**
 * VIEW — Regras de operação exibidas ao usuário no topo do painel.
 * Fica aberto por padrão; a preferência de recolher é lembrada no navegador.
 */
export function OperationGuidelines() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      // Navegador sem acesso ao storage: mantém aberto.
    }
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // Silencioso: a preferência é só uma conveniência.
    }
  }

  return (
    <section className="card border-lime/25 bg-gradient-to-b from-lime/[0.07] to-transparent">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-lime">
            Importante para o funcionamento
          </h2>
          <p className="mt-1 text-sm text-zinc-300">
            Requisitos para uma operação saudável ✅
          </p>
        </div>
        <button type="button" onClick={toggle} className="btn-ghost px-3 py-1.5 text-xs">
          {collapsed ? 'Ver regras' : 'Ocultar'}
        </button>
      </div>

      {!collapsed ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="space-y-2.5">
            {REQUIREMENTS.map((rule) => (
              <div
                key={rule.title}
                className={`rounded-xl border p-3.5 ${TONES[rule.tone ?? 'default']}`}
              >
                <p className="text-sm font-semibold text-zinc-100">
                  <span className="mr-1.5">{rule.icon}</span>
                  {rule.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{rule.text}</p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
              Como fazer corretamente
            </h3>
            <ol className="space-y-2.5">
              {HOW_TO.map((step, index) => (
                <li
                  key={step.title}
                  className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime/15 text-xs font-bold text-lime">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </section>
  );
}

import { z } from 'zod';
import type { Bookmaker } from './bookmaker.model';
import type { TransactionRow, TransactionType } from './database.types';

export type Transaction = TransactionRow;

/** Transação com a casa de aposta embutida (join usado nas listagens). */
export type TransactionWithBookmaker = Transaction & {
  bookmaker: Pick<Bookmaker, 'id' | 'name' | 'slug'> | null;
};

export const TYPE_LABEL: Record<TransactionType, string> = {
  deposit: 'Depósito',
  withdrawal: 'Saque',
};

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_RECEIPT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'application/pdf',
];

/**
 * Entrada do formulario de movimentação.
 * O valor chega como string (input do browser) e e normalizado para número.
 */
export const createTransactionSchema = z.object({
  bookmaker_id: z.string().uuid('Casa de aposta inválida.'),
  type: z.enum(['deposit', 'withdrawal'], { message: 'Selecione depósito ou saque.' }),
  amount: z.coerce
    .number({ message: 'Informe um valor numérico.' })
    .positive('O valor deve ser maior que zero.')
    .max(9_999_999.99, 'Valor acima do limite permitido.'),
  occurred_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Data inválida.'),
  notes: z.string().trim().max(280, 'Observação muito longa.').optional().or(z.literal('')),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

/** Totais exibidos nos cards do dashboard. */
export interface TransactionSummary {
  deposits: number;
  withdrawals: number;
  balance: number;
  count: number;
}

export function summarize(transactions: Transaction[]): TransactionSummary {
  return transactions.reduce<TransactionSummary>(
    (acc, tx) => {
      const amount = Number(tx.amount) || 0;
      if (tx.type === 'deposit') acc.deposits += amount;
      else acc.withdrawals += amount;
      acc.balance = acc.withdrawals - acc.deposits;
      acc.count += 1;
      return acc;
    },
    { deposits: 0, withdrawals: 0, balance: 0, count: 0 },
  );
}

import { z } from 'zod';
import type { Bookmaker } from './bookmaker.model';
import type { Profile } from './profile.model';
import type { ReceiptStatus, TransactionRow, TransactionType } from './database.types';

export type Transaction = TransactionRow;

/** Transação com a casa de aposta embutida (join usado nas listagens). */
export type TransactionWithBookmaker = Transaction & {
  bookmaker: Pick<Bookmaker, 'id' | 'name' | 'slug'> | null;
};

/** Transação com casa e dono — usada nas telas administrativas. */
export type AdminTransaction = TransactionWithBookmaker & {
  owner: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null;
};

export const RECEIPT_STATUS_LABEL: Record<ReceiptStatus, string> = {
  pending: 'Em análise',
  approved: 'Validado',
  rejected: 'Recusado',
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

/**
 * Revisão do comprovante pelo administrador: define o status e lança a
 * comissão daquela movimentação. A comissão é sempre digitada à mão — não
 * existe cálculo automático por taxa.
 */
export const reviewTransactionSchema = z.object({
  receipt_status: z.enum(['pending', 'approved', 'rejected']).optional(),
  commission_amount: z.coerce
    .number({ message: 'Informe um valor numérico para a comissão.' })
    .min(0, 'A comissão não pode ser negativa.')
    .max(9_999_999.99, 'Comissão acima do limite permitido.')
    .optional(),
  commission_note: z.string().trim().max(280, 'Observação muito longa.').optional().or(z.literal('')),
});

export type ReviewTransactionInput = z.infer<typeof reviewTransactionSchema>;

/** Totais exibidos nos cards do dashboard. */
export interface TransactionSummary {
  deposits: number;
  withdrawals: number;
  balance: number;
  commission: number;
  pendingReceipts: number;
  count: number;
}

export function summarize(transactions: Transaction[]): TransactionSummary {
  return transactions.reduce<TransactionSummary>(
    (acc, tx) => {
      const amount = Number(tx.amount) || 0;
      if (tx.type === 'deposit') acc.deposits += amount;
      else acc.withdrawals += amount;
      acc.balance = acc.withdrawals - acc.deposits;
      acc.commission += Number(tx.commission_amount) || 0;
      if (tx.receipt_status === 'pending') acc.pendingReceipts += 1;
      acc.count += 1;
      return acc;
    },
    { deposits: 0, withdrawals: 0, balance: 0, commission: 0, pendingReceipts: 0, count: 0 },
  );
}

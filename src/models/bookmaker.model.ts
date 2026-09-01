import { z } from 'zod';
import type { BookmakerRow } from './database.types';

export type Bookmaker = BookmakerRow;

/** Casas pré-configuradas (espelha o seed em supabase/schema.sql). */
export const DEFAULT_BOOKMAKERS = [
  { slug: 'betano', name: 'Betano' },
  { slug: 'betfair', name: 'Betfair' },
  { slug: 'betnacional', name: 'Betnacional' },
  { slug: 'esportivabet', name: 'EsportivaBet' },
  { slug: 'novibet', name: 'Novibet' },
  { slug: 'sportingbet', name: 'Sportingbet' },
  { slug: 'stake', name: 'Stake' },
] as const;

/** Admin edita link, aporte mínimo e visibilidade — nome/slug são fixos. */
export const updateBookmakerSchema = z.object({
  affiliate_url: z
    .string()
    .trim()
    .url('Informe uma URL válida (começando com http:// ou https://).')
    .max(500)
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  /** Baseline: aporte mínimo exigido no cadastro feito por este link. */
  min_deposit: z.coerce
    .number({ message: 'Informe um valor numérico para o aporte mínimo.' })
    .min(0, 'O aporte mínimo não pode ser negativo.')
    .max(9_999_999.99, 'Valor acima do limite permitido.')
    .optional(),
  is_active: z.boolean().optional(),
});

export type UpdateBookmakerInput = z.infer<typeof updateBookmakerSchema>;

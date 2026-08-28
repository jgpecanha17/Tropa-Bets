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

/** Admin edita apenas link, cor e visibilidade — nome/slug são fixos. */
export const updateBookmakerSchema = z.object({
  affiliate_url: z
    .string()
    .trim()
    .url('Informe uma URL válida (comecando com http:// ou https://).')
    .max(500)
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  is_active: z.boolean().optional(),
});

export type UpdateBookmakerInput = z.infer<typeof updateBookmakerSchema>;

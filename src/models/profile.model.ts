import { z } from 'zod';
import { isValidCPF, onlyDigits } from '@/lib/cpf';
import type { ProfileRow, UserRole, UserStatus } from './database.types';

export type Profile = ProfileRow;

/** Regras de domínio do perfil — usadas por services e views. */
export const ProfileRules = {
  isAdmin: (p: Profile | null): boolean => p?.role === 'admin' && p.status === 'approved',
  isApproved: (p: Profile | null): boolean => p?.status === 'approved',
  isPending: (p: Profile | null): boolean => p?.status === 'pending_approval',
  isRejected: (p: Profile | null): boolean => p?.status === 'rejected',
  /** Já informou nome completo e CPF? */
  hasIdentity: (p: Profile | null): boolean => Boolean(p?.identity_confirmed_at),
  displayName: (p: Profile | null): string =>
    p?.legal_name || p?.full_name || p?.email?.split('@')[0] || 'Usuário',
};

export const STATUS_LABEL: Record<UserStatus, string> = {
  pending_approval: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Bloqueado',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  user: 'Usuário',
  admin: 'Administrador',
};

/**
 * Nome completo e CPF do afiliado.
 * O usuário preenche uma única vez; depois disso só o administrador altera.
 */
export const identitySchema = z.object({
  legal_name: z
    .string()
    .trim()
    .min(5, 'Informe o nome completo.')
    .max(120, 'Nome muito longo.')
    .regex(/^[\p{L}][\p{L}\s.'-]+$/u, 'Use apenas letras, espaços e acentos.')
    .refine((name) => name.split(/\s+/).filter(Boolean).length >= 2, {
      message: 'Informe nome e sobrenome.',
    }),
  cpf: z
    .string()
    .transform(onlyDigits)
    .refine((cpf) => cpf.length === 11, { message: 'O CPF deve ter 11 dígitos.' })
    .refine(isValidCPF, { message: 'CPF inválido — confira os números digitados.' }),
});

export type IdentityInput = z.infer<typeof identitySchema>;

/** Schema de atualização de usuário pelo admin. */
export const updateProfileSchema = z
  .object({
    status: z.enum(['pending_approval', 'approved', 'rejected']).optional(),
    role: z.enum(['user', 'admin']).optional(),
    legal_name: identitySchema.shape.legal_name.optional(),
    cpf: identitySchema.shape.cpf.optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.role !== undefined ||
      data.legal_name !== undefined ||
      data.cpf !== undefined,
    { message: 'Informe ao menos um campo para atualizar.' },
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

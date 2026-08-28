import { z } from 'zod';
import type { ProfileRow, UserRole, UserStatus } from './database.types';

export type Profile = ProfileRow;

/** Regras de domínio do perfil — usadas por services e views. */
export const ProfileRules = {
  isAdmin: (p: Profile | null): boolean => p?.role === 'admin' && p.status === 'approved',
  isApproved: (p: Profile | null): boolean => p?.status === 'approved',
  isPending: (p: Profile | null): boolean => p?.status === 'pending_approval',
  isRejected: (p: Profile | null): boolean => p?.status === 'rejected',
  displayName: (p: Profile | null): string => p?.full_name || p?.email?.split('@')[0] || 'Usuário',
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

/** Schema de atualização de usuário pelo admin. */
export const updateProfileSchema = z
  .object({
    status: z.enum(['pending_approval', 'approved', 'rejected']).optional(),
    role: z.enum(['user', 'admin']).optional(),
  })
  .refine((data) => data.status !== undefined || data.role !== undefined, {
    message: 'Informe ao menos um campo para atualizar (status ou role).',
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

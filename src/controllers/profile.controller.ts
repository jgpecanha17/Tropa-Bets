import type { NextRequest } from 'next/server';
import { ok } from '@/lib/http';
import { identitySchema } from '@/models';
import { authService } from '@/services/auth.service';
import { profileService } from '@/services/profile.service';

/**
 * CONTROLLER — Dados do próprio afiliado.
 * Hoje cobre apenas a confirmação de nome completo e CPF (uma única vez).
 */
export const profileController = {
  /** POST /api/profile/identity  { legal_name, cpf } */
  async confirmIdentity(request: NextRequest) {
    const { profile } = await authService.requireApproved();
    const input = identitySchema.parse(await request.json());
    const data = await profileService.confirmIdentity(profile, input);
    return ok(data);
  },
};

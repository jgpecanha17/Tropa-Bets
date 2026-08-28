import type { NextRequest } from 'next/server';
import { ok } from '@/lib/http';
import { updateBookmakerSchema, updateProfileSchema } from '@/models';
import { authService } from '@/services/auth.service';
import { bookmakerService } from '@/services/bookmaker.service';
import { profileService } from '@/services/profile.service';

/**
 * CONTROLLER — Painel administrativo.
 * Cada ação válida a role de admin antes de delegar ao service.
 */
export const adminController = {
  /** GET /api/admin/users?status=pending_approval */
  async users(request: NextRequest) {
    await authService.requireAdmin();
    const status = request.nextUrl.searchParams.get('status');
    const data =
      status === 'pending_approval'
        ? await profileService.listPending()
        : await profileService.listAll();
    return ok(data);
  },

  /** PATCH /api/admin/users/:id  { status?, role? } */
  async updateUser(request: NextRequest, id: string) {
    const { profile } = await authService.requireAdmin();
    const input = updateProfileSchema.parse(await request.json());
    const data = await profileService.update(profile.id, id, input);
    return ok(data);
  },

  /** GET /api/admin/bookmakers */
  async bookmakers() {
    await authService.requireAdmin();
    return ok(await bookmakerService.listAll());
  },

  /** PATCH /api/admin/bookmakers/:id  { affiliate_url, is_active? } */
  async updateBookmaker(request: NextRequest, id: string) {
    await authService.requireAdmin();
    const input = updateBookmakerSchema.parse(await request.json());
    const data = await bookmakerService.update(id, input);
    return ok(data);
  },
};

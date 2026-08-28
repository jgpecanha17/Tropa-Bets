import type { NextRequest } from 'next/server';
import { adminController } from '@/controllers/admin.controller';
import { fail } from '@/lib/http';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return await adminController.updateUser(request, id);
  } catch (error) {
    return fail(error);
  }
}

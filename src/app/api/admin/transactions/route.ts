import type { NextRequest } from 'next/server';
import { adminController } from '@/controllers/admin.controller';
import { fail } from '@/lib/http';

export async function GET(request: NextRequest) {
  try {
    return await adminController.transactions(request);
  } catch (error) {
    return fail(error);
  }
}

import type { NextRequest } from 'next/server';
import { profileController } from '@/controllers/profile.controller';
import { fail } from '@/lib/http';

export async function POST(request: NextRequest) {
  try {
    return await profileController.confirmIdentity(request);
  } catch (error) {
    return fail(error);
  }
}

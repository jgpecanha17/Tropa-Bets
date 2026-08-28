import { NextResponse, type NextRequest } from 'next/server';
import { authService } from '@/services/auth.service';

export async function POST(request: NextRequest) {
  await authService.signOut();
  return NextResponse.redirect(new URL('/login', request.nextUrl.origin), { status: 303 });
}

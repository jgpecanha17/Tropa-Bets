import type { NextRequest } from 'next/server';
import { transactionController } from '@/controllers/transaction.controller';
import { fail } from '@/lib/http';

export async function GET(request: NextRequest) {
  try {
    return await transactionController.index(request);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    return await transactionController.store(request);
  } catch (error) {
    return fail(error);
  }
}

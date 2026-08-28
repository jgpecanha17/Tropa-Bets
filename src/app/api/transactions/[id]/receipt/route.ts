import { transactionController } from '@/controllers/transaction.controller';
import { fail } from '@/lib/http';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return await transactionController.receipt(id);
  } catch (error) {
    return fail(error);
  }
}

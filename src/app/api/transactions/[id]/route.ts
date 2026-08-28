import { transactionController } from '@/controllers/transaction.controller';
import { fail } from '@/lib/http';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return await transactionController.destroy(id);
  } catch (error) {
    return fail(error);
  }
}

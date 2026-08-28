import { adminController } from '@/controllers/admin.controller';
import { fail } from '@/lib/http';

export async function GET() {
  try {
    return await adminController.bookmakers();
  } catch (error) {
    return fail(error);
  }
}

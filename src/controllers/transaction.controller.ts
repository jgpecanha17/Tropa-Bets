import type { NextRequest } from 'next/server';
import { ok } from '@/lib/http';
import { createTransactionSchema } from '@/models';
import { authService } from '@/services/auth.service';
import { transactionService } from '@/services/transaction.service';

/**
 * CONTROLLER — Movimentações.
 * Responsável apenas por: autorizar, parsear a requisição, chamar o service
 * e devolver a resposta. Nenhuma regra de negocio mora aqui.
 */
export const transactionController = {
  /** GET /api/transactions?bookmakerId= */
  async index(request: NextRequest) {
    const { profile } = await authService.requireApproved();
    const bookmakerId = request.nextUrl.searchParams.get('bookmakerId');

    const data = bookmakerId
      ? await transactionService.listByUserAndBookmaker(profile.id, bookmakerId)
      : await transactionService.listByUser(profile.id);

    return ok(data);
  },

  /** POST /api/transactions  (multipart/form-data — inclui o comprovante) */
  async store(request: NextRequest) {
    const { profile } = await authService.requireApproved();
    const input = createTransactionSchema.parse(await request.json());
    const transaction = await transactionService.create(profile.id, input);
    return ok(transaction, 201);
  },

  /** DELETE /api/transactions/:id */
  async destroy(id: string) {
    const { profile } = await authService.requireApproved();
    await transactionService.remove(profile.id, id);
    return ok({ id });
  },

  /** GET /api/transactions/:id/receipt — devolve URL assinada temporária. */
  async receipt(id: string) {
    const { profile } = await authService.requireApproved();
    const url = await transactionService.getReceiptUrl(
      profile.id,
      id,
      profile.role === 'admin',
    );
    return ok({ url });
  },
};

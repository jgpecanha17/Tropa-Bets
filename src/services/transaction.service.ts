import { createServerSupabase } from '@/lib/supabase/server';
import { AppError, NotFound } from '@/lib/errors';
import type { CreateTransactionInput, Transaction, TransactionWithBookmaker } from '@/models';
import { bookmakerService } from './bookmaker.service';
import { storageService } from './storage.service';

const SELECT_WITH_BOOKMAKER = '*, bookmaker:bookmakers(id, name, slug)';

/** SERVICE — Regras de negocio das movimentações (depósitos e saques). */
export const transactionService = {
  /** Todas as movimentações do usuário, mais recentes primeiro. */
  async listByUser(userId: string): Promise<TransactionWithBookmaker[]> {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('transactions')
      .select(SELECT_WITH_BOOKMAKER)
      .eq('user_id', userId)
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw new AppError(`Falha ao carregar movimentações: ${error.message}`, 500);
    return (data ?? []) as unknown as TransactionWithBookmaker[];
  },

  /** Movimentações do usuário em uma casa específica. */
  async listByUserAndBookmaker(
    userId: string,
    bookmakerId: string,
  ): Promise<TransactionWithBookmaker[]> {
    const all = await this.listByUser(userId);
    return all.filter((tx) => tx.bookmaker_id === bookmakerId);
  },

  /**
   * Cria uma movimentação. Se houver comprovante, sobe para o Storage antes
   * e guarda o path no registro (a URL assinada é gerada sob demanda).
   */
  async create(
    userId: string,
    input: CreateTransactionInput,
    receipt?: File | null,
  ): Promise<Transaction> {
    const bookmaker = await bookmakerService.findById(input.bookmaker_id);

    let receiptPath: string | null = null;
    if (receipt && receipt.size > 0) {
      receiptPath = await storageService.uploadReceipt({
        file: receipt,
        userId,
        bookmakerSlug: bookmaker.slug,
      });
    }

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        bookmaker_id: input.bookmaker_id,
        type: input.type,
        amount: input.amount,
        occurred_at: input.occurred_at,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        receipt_path: receiptPath,
        receipt_status: 'pending',
      })
      .select('*')
      .maybeSingle();

    if (error) {
      // Evita comprovante órfão no bucket quando o insert falha.
      if (receiptPath) await storageService.removeReceipt(receiptPath);
      throw new AppError(`Falha ao registrar movimentação: ${error.message}`, 500);
    }
    if (!data) throw new AppError('Movimentação não foi registrada.', 500);
    return data as Transaction;
  },

  /** Exclui uma movimentação do próprio usuário (e o comprovante associado). */
  async remove(userId: string, transactionId: string): Promise<void> {
    const supabase = await createServerSupabase();
    const { data: existing, error: findError } = await supabase
      .from('transactions')
      .select('id, user_id, receipt_path')
      .eq('id', transactionId)
      .maybeSingle();

    if (findError) throw new AppError(findError.message, 500);
    if (!existing || existing.user_id !== userId) throw NotFound('Movimentação não encontrada.');

    const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
    if (error) throw new AppError(`Falha ao excluir movimentação: ${error.message}`, 500);

    if (existing.receipt_path) await storageService.removeReceipt(existing.receipt_path);
  },

  /** URL temporária do comprovante, validando a posse do registro. */
  async getReceiptUrl(userId: string, transactionId: string, isAdmin = false): Promise<string> {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('transactions')
      .select('id, user_id, receipt_path')
      .eq('id', transactionId)
      .maybeSingle();

    if (error) throw new AppError(error.message, 500);
    if (!data || (!isAdmin && data.user_id !== userId)) throw NotFound('Movimentação não encontrada.');
    if (!data.receipt_path) throw NotFound('Esta movimentação não possui comprovante.');

    const url = await storageService.getSignedUrl(data.receipt_path);
    if (!url) throw new AppError('Não foi possível gerar o link do comprovante.', 500);
    return url;
  },
};

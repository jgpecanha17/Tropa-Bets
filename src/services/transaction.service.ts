import { createServerSupabase } from '@/lib/supabase/server';
import { AppError, NotFound } from '@/lib/errors';
import type {
  AdminTransaction,
  CreateTransactionInput,
  ReceiptStatus,
  ReviewTransactionInput,
  Transaction,
  TransactionWithBookmaker,
} from '@/models';
import { bookmakerService } from './bookmaker.service';
import { storageService } from './storage.service';

const SELECT_WITH_BOOKMAKER = '*, bookmaker:bookmakers(id, name, slug)';
// O dono NÃO é buscado por embed: existem duas chaves estrangeiras de
// transactions para profiles (user_id e reviewed_by) e o PostgREST recusa o
// join por ambiguidade. Os perfis são carregados à parte e combinados aqui.
const SELECT_FOR_ADMIN = '*, bookmaker:bookmakers(id, name, slug)';

/** Filtros da visão geral do administrador. */
export interface AdminTransactionFilters {
  userId?: string;
  bookmakerId?: string;
  receiptStatus?: ReceiptStatus;
}

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

  /**
   * Todas as movimentações do sistema (somente administradores — a RLS
   * garante o acesso). Aceita filtros por usuário, casa e status do comprovante.
   */
  async listAll(filters: AdminTransactionFilters = {}): Promise<AdminTransaction[]> {
    const supabase = await createServerSupabase();
    let query = supabase
      .from('transactions')
      .select(SELECT_FOR_ADMIN)
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.userId) query = query.eq('user_id', filters.userId);
    if (filters.bookmakerId) query = query.eq('bookmaker_id', filters.bookmakerId);
    if (filters.receiptStatus) query = query.eq('receipt_status', filters.receiptStatus);

    const [{ data, error }, { data: owners, error: ownersError }] = await Promise.all([
      query,
      supabase.from('profiles').select('id, full_name, email, avatar_url'),
    ]);

    if (error) throw new AppError(`Falha ao carregar movimentações: ${error.message}`, 500);
    if (ownersError) throw new AppError(`Falha ao carregar usuários: ${ownersError.message}`, 500);

    const byId = new Map((owners ?? []).map((owner) => [owner.id, owner]));
    return ((data ?? []) as unknown as AdminTransaction[]).map((tx) => ({
      ...tx,
      owner: byId.get(tx.user_id) ?? null,
    }));
  },

  /**
   * Revisão administrativa: aprova/recusa o comprovante e lança a comissão
   * daquela movimentação. A comissão é sempre informada à mão pelo admin.
   */
  async review(
    adminId: string,
    transactionId: string,
    input: ReviewTransactionInput,
  ): Promise<Transaction> {
    const patch: Partial<Transaction> = {};

    if (input.receipt_status) {
      patch.receipt_status = input.receipt_status;
      patch.reviewed_at = input.receipt_status === 'pending' ? null : new Date().toISOString();
      patch.reviewed_by = input.receipt_status === 'pending' ? null : adminId;
    }
    if (input.commission_amount !== undefined) {
      patch.commission_amount = input.commission_amount;
    }
    if (input.commission_note !== undefined) {
      patch.commission_note = input.commission_note.trim() ? input.commission_note.trim() : null;
    }

    if (Object.keys(patch).length === 0) {
      throw new AppError('Nada para atualizar nesta movimentação.', 400);
    }

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('transactions')
      .update(patch)
      .eq('id', transactionId)
      .select('*')
      .maybeSingle();

    if (error) throw new AppError(`Falha ao revisar a movimentação: ${error.message}`, 500);
    if (!data) throw NotFound('Movimentação não encontrada.');
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

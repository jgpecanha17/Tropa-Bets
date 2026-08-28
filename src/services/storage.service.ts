import { createServerSupabase } from '@/lib/supabase/server';
import { BadRequest } from '@/lib/errors';
import { ACCEPTED_RECEIPT_TYPES, MAX_RECEIPT_BYTES } from '@/models';

const BUCKET = 'receipts';
const SIGNED_URL_TTL = 60 * 10; // 10 minutos

/**
 * SERVICE — Upload e leitura de comprovantes no Supabase Storage.
 * Caminho: <user_id>/<bookmaker_slug>/<timestamp>-<arquivo>
 */
export const storageService = {
  validate(file: File): void {
    if (file.size === 0) throw BadRequest('Arquivo de comprovante vazio.');
    if (file.size > MAX_RECEIPT_BYTES) {
      throw BadRequest('O comprovante deve ter no máximo 5 MB.');
    }
    if (file.type && !ACCEPTED_RECEIPT_TYPES.includes(file.type)) {
      throw BadRequest('Formato inválido. Envie PNG, JPG, WEBP, HEIC ou PDF.');
    }
  },

  /** Faz upload respeitando as policies do bucket e devolve o path salvo. */
  async uploadReceipt(params: {
    file: File;
    userId: string;
    bookmakerSlug: string;
  }): Promise<string> {
    const { file, userId, bookmakerSlug } = params;
    this.validate(file);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
    const path = `${userId}/${bookmakerSlug}/${Date.now()}-${safeName}`;

    const supabase = await createServerSupabase();
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

    if (error) throw BadRequest(`Falha ao enviar o comprovante: ${error.message}`);
    return path;
  },

  /** URL temporária para visualizar o comprovante (bucket privado). */
  async getSignedUrl(path: string): Promise<string | null> {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);
    if (error) return null;
    return data.signedUrl;
  },

  /** Remove o arquivo (usado ao excluir a movimentação). */
  async removeReceipt(path: string): Promise<void> {
    const supabase = await createServerSupabase();
    await supabase.storage.from(BUCKET).remove([path]);
  },
};

import { cn } from '@/lib/format';
import { STATUS_LABEL, type UserStatus, type ReceiptStatus } from '@/models';

const USER_TONES: Record<UserStatus, string> = {
  approved: 'bg-lime/15 text-lime',
  pending_approval: 'bg-amber-400/15 text-amber-300',
  rejected: 'bg-red-500/15 text-red-300',
};

const RECEIPT_TONES: Record<ReceiptStatus, string> = {
  approved: 'bg-lime/15 text-lime',
  pending: 'bg-amber-400/15 text-amber-300',
  rejected: 'bg-red-500/15 text-red-300',
};

const RECEIPT_LABEL: Record<ReceiptStatus, string> = {
  approved: 'Validado',
  pending: 'Em análise',
  rejected: 'Recusado',
};

/** VIEW — Etiqueta de status de usuário. */
export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <span className={cn('badge', USER_TONES[status])}>{STATUS_LABEL[status]}</span>;
}

/** VIEW — Etiqueta de status do comprovante. */
export function ReceiptBadge({ status, hasReceipt }: { status: ReceiptStatus; hasReceipt: boolean }) {
  if (!hasReceipt) {
    return <span className="badge bg-white/5 text-zinc-400">Sem comprovante</span>;
  }
  return <span className={cn('badge', RECEIPT_TONES[status])}>{RECEIPT_LABEL[status]}</span>;
}

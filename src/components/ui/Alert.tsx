import { cn } from '@/lib/format';

type Tone = 'error' | 'success' | 'info';

const TONES: Record<Tone, string> = {
  error: 'border-red-500/30 bg-red-500/10 text-red-200',
  success: 'border-lime/30 bg-lime/10 text-lime-soft',
  info: 'border-white/10 bg-white/5 text-zinc-300',
};

/** VIEW — Mensagem de feedback de formulario. */
export function Alert({ tone = 'info', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border px-4 py-3 text-sm', TONES[tone])} role="status">
      {children}
    </div>
  );
}

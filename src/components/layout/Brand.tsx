/** VIEW — Marca da aplicação. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime text-base font-black text-ink-950">
        TB
      </div>
      {!compact ? (
        <div className="leading-tight">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-zinc-100">Tropa</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-lime">Bets</p>
        </div>
      ) : null}
    </div>
  );
}

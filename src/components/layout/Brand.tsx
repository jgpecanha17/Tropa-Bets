/** VIEW — Marca da aplicação. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime text-base font-black text-ink-950">
        PA
      </div>
      {!compact ? (
        <div className="leading-tight">
          <p className="text-sm font-black uppercase tracking-[0.12em] text-zinc-100">Peçanha</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-lime">
            Affiliates
          </p>
        </div>
      ) : null}
    </div>
  );
}

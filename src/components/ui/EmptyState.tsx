/** VIEW — Estado vazio reutilizavel em tabelas e listas. */
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
    </div>
  );
}

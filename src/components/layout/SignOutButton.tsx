/** VIEW — Sai da sessão via POST (evita logout por prefetch de link). */
export function SignOutButton({ className = 'btn-ghost w-full' }: { className?: string }) {
  return (
    <form action="/auth/signout" method="post">
      <button type="submit" className={className}>
        Sair
      </button>
    </form>
  );
}

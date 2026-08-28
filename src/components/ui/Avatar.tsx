import { initials } from '@/lib/format';

/** VIEW — Avatar do Google com fallback em iniciais. */
export function Avatar({
  src,
  name,
  email,
  size = 40,
}: {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name ?? email ?? 'Avatar'}
        width={size}
        height={size}
        className="rounded-full border border-white/10 object-cover"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full border border-white/10 bg-ink-700 text-xs font-semibold text-lime"
      style={{ width: size, height: size }}
    >
      {initials(name, email)}
    </div>
  );
}

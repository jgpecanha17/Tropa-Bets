import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Brand } from './Brand';
import { SignOutButton } from './SignOutButton';
import { ProfileRules, ROLE_LABEL, type Profile } from '@/models';
import { cn } from '@/lib/format';

interface NavItem {
  href: string;
  label: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Minhas movimentações' },
  { href: '/admin', label: 'Administração', adminOnly: true },
];

/** VIEW — Casca da area logada: sidebar + topo com identificação do usuário. */
export function AppShell({
  profile,
  active,
  children,
}: {
  profile: Profile;
  active: string;
  children: React.ReactNode;
}) {
  const isAdmin = ProfileRules.isAdmin(profile);
  const items = NAV.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-4 p-4 lg:flex-row lg:p-6">
      <aside className="card flex shrink-0 flex-col gap-6 lg:w-64">
        <Brand />

        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
                active === item.href
                  ? 'border-l-2 border-lime bg-lime/10 text-lime'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-4 border-t border-white/5 pt-4">
          <div className="flex items-center gap-3">
            <Avatar src={profile.avatar_url} name={profile.full_name} email={profile.email} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-100">
                {ProfileRules.displayName(profile)}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-lime">
                {ROLE_LABEL[profile.role]}
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 space-y-5">{children}</main>
    </div>
  );
}

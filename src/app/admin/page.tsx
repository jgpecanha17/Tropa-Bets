import { AppShell } from '@/components/layout/AppShell';
import { AdminView } from '@/components/admin/AdminView';
import { dashboardController } from '@/controllers/dashboard.controller';

export const metadata = { title: 'Administração — Tropa Bets' };
export const dynamic = 'force-dynamic';

/** Página restrita a admins (o controller redireciona quem não tem permissão). */
export default async function AdminPage() {
  const { profile, users, bookmakers, transactions } = await dashboardController.admin();

  return (
    <AppShell profile={profile} active="/admin">
      <AdminView
        profile={profile}
        users={users}
        bookmakers={bookmakers}
        transactions={transactions}
      />
    </AppShell>
  );
}

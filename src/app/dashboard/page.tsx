import { AppShell } from '@/components/layout/AppShell';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { dashboardController } from '@/controllers/dashboard.controller';

export const metadata = { title: 'Minhas movimentações — Tropa Bets' };
export const dynamic = 'force-dynamic';

/** Página do usuário: o controller resolve dados e permissões, a view apenas renderiza. */
export default async function DashboardPage() {
  const { profile, bookmakers, transactions } = await dashboardController.index();

  return (
    <AppShell profile={profile} active="/dashboard">
      <DashboardView profile={profile} bookmakers={bookmakers} transactions={transactions} />
    </AppShell>
  );
}

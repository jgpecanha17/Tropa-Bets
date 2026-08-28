import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tropa Bets — Gestão de apostas',
  description:
    'Acompanhamento e gestão coletiva de apostas esportivas: depósitos, saques e comprovantes por casa de aposta.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

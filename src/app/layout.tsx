import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Peçanha Affiliates — Gestão de apostas',
  description:
    'Gestão de afiliados: depósitos, saques, contas abertas e comissões por casa de aposta.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

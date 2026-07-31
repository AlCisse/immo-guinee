import { Metadata } from 'next';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';

export const metadata: Metadata = {
  title: 'Tableau de Bord | ImmoGuinee',
  description: 'Gerez vos annonces immobilieres, messages et favoris depuis votre tableau de bord ImmoGuinee.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg lg:flex">
      <DashboardSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

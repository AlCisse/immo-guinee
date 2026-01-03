import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Messagerie | ImmoGuinee',
  description: 'Consultez vos messages et echangez avec les proprietaires et locataires sur ImmoGuinee.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MessagerieLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

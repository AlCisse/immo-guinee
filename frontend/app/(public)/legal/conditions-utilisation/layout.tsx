import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions Generales d\'Utilisation | ImmoGuinee',
  description: 'Consultez les conditions generales d\'utilisation de la plateforme ImmoGuinee. Regles de publication d\'annonces, responsabilites, droits des utilisateurs en Guinee.',
  alternates: {
    canonical: 'https://immoguinee.com/legal/conditions-utilisation',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CGULayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

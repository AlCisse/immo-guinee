import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions Generales d\'Utilisation | ImmoGuinee',
  description: 'Consultez les conditions generales d\'utilisation de ImmoGuinee, plateforme immobiliere en Guinee. Regles de publication, responsabilites et droits des utilisateurs.',
  alternates: {
    canonical: 'https://immoguinee.com/conditions',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ConditionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

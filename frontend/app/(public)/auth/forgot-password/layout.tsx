import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mot de Passe Oublie | ImmoGuinee',
  description: 'Reinitialiser votre mot de passe ImmoGuinee. Recuperez l\'acces a votre compte immobilier en Guinee.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import Link from 'next/link';
import { FileText, Shield, ArrowRight } from 'lucide-react';

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
            Informations Legales
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Consultez nos conditions d&apos;utilisation et notre politique de confidentialite
            pour comprendre comment nous protegeons vos donnees et regissons l&apos;utilisation
            de notre plateforme.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          {/* CGU Card */}
          <Link
            href="/legal/conditions-utilisation"
            className="group bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm border border-neutral-100 dark:border-dark-border hover:shadow-md hover:border-primary-200 transition-all"
          >
            <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
              <FileText className="w-7 h-7 text-primary-600" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
              Conditions Generales d&apos;Utilisation
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Regles d&apos;utilisation de la plateforme, droits et obligations des utilisateurs,
              services proposes et responsabilites.
            </p>
            <div className="flex items-center text-primary-600 font-medium">
              Consulter
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Privacy Policy Card */}
          <Link
            href="/legal/politique-confidentialite"
            className="group bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm border border-neutral-100 dark:border-dark-border hover:shadow-md hover:border-primary-200 transition-all"
          >
            <div className="w-14 h-14 bg-success-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-success-100 transition-colors">
              <Shield className="w-7 h-7 text-success-600" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
              Politique de Confidentialite
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Comment nous collectons, utilisons et protegeons vos donnees personnelles.
              Vos droits et nos engagements.
            </p>
            <div className="flex items-center text-success-600 font-medium">
              Consulter
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Security Highlights */}
        <div className="mt-12 bg-white dark:bg-dark-card rounded-2xl p-8 shadow-sm border border-neutral-100 dark:border-dark-border">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6">
            Notre engagement securite
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-medium text-neutral-900 dark:text-white mb-1">Chiffrement AES-256</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Documents et contrats proteges</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-medium text-neutral-900 dark:text-white mb-1">E2E pour les medias</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Cles jamais stockees sur serveur</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="font-medium text-neutral-900 dark:text-white mb-1">2FA disponible</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Double authentification</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="font-medium text-neutral-900 dark:text-white mb-1">Audit continu</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Surveillance 24/7</p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-8 text-center text-neutral-500 dark:text-neutral-400">
          <p>
            Des questions ? Contactez-nous a{' '}
            <a href="mailto:privacy@immoguinee.com" className="text-primary-600 hover:underline">
              privacy@immoguinee.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

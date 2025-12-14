'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, FileText, Shield, Scale, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ConditionsPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-orange-500 pt-6 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/"
              className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div className="flex items-center gap-3">
              <Image
                src="/images/iOS/Icon-60.png"
                alt="ImmoGuinée"
                width={40}
                height={40}
                className="rounded-xl"
              />
              <span className="font-bold text-xl text-white">ImmoGuinée</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Conditions d'utilisation
            </h1>
            <p className="text-white/80">
              Dernière mise à jour : Décembre 2025
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-dark-card rounded-2xl p-6 md:p-8 shadow-soft mb-8"
        >
          {/* Quick Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 p-4 bg-neutral-50 dark:bg-dark-bg rounded-xl">
            {[
              { icon: FileText, label: 'Acceptation', href: '#acceptation' },
              { icon: Shield, label: 'Utilisation', href: '#utilisation' },
              { icon: Scale, label: 'Responsabilités', href: '#responsabilites' },
              { icon: AlertTriangle, label: 'Restrictions', href: '#restrictions' },
            ].map((item, i) => (
              <a
                key={i}
                href={item.href}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-white dark:hover:bg-dark-card transition-colors"
              >
                <item.icon className="w-5 h-5 text-primary-500" />
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{item.label}</span>
              </a>
            ))}
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <section id="acceptation" className="mb-8">
              <h2 className="flex items-center gap-3 text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                <div className="p-2 bg-primary-50 dark:bg-primary-500/10 rounded-lg">
                  <FileText className="w-5 h-5 text-primary-500" />
                </div>
                1. Acceptation des conditions
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                En accédant et en utilisant la plateforme ImmoGuinée, vous acceptez d'être lié par les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser nos services.
              </p>
              <div className="bg-primary-50 dark:bg-primary-500/10 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary-500 mt-0.5" />
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">
                    L'utilisation de notre plateforme implique l'acceptation automatique de ces conditions.
                  </p>
                </div>
              </div>
            </section>

            <section id="utilisation" className="mb-8">
              <h2 className="flex items-center gap-3 text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                  <Shield className="w-5 h-5 text-emerald-500" />
                </div>
                2. Utilisation du service
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                ImmoGuinée est une plateforme de mise en relation entre propriétaires et locataires/acheteurs de biens immobiliers en Guinée. Nos services comprennent :
              </p>
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
                <li>La publication d'annonces immobilières</li>
                <li>La recherche et consultation d'annonces</li>
                <li>La mise en relation entre utilisateurs</li>
                <li>La messagerie entre utilisateurs</li>
                <li>La planification de visites</li>
              </ul>
            </section>

            <section id="responsabilites" className="mb-8">
              <h2 className="flex items-center gap-3 text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                  <Scale className="w-5 h-5 text-blue-500" />
                </div>
                3. Responsabilités
              </h2>
              <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-200 mt-4 mb-2">
                3.1 Responsabilités de l'utilisateur
              </h3>
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
                <li>Fournir des informations exactes et véridiques</li>
                <li>Maintenir la confidentialité de votre compte</li>
                <li>Ne pas publier de contenu illégal ou frauduleux</li>
                <li>Respecter les autres utilisateurs de la plateforme</li>
              </ul>
              <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-200 mt-4 mb-2">
                3.2 Responsabilités d'ImmoGuinée
              </h3>
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2">
                <li>Assurer le bon fonctionnement de la plateforme</li>
                <li>Protéger les données personnelles des utilisateurs</li>
                <li>Modérer le contenu publié</li>
                <li>Fournir un support technique</li>
              </ul>
            </section>

            <section id="restrictions" className="mb-8">
              <h2 className="flex items-center gap-3 text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                4. Restrictions
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Il est strictement interdit de :
              </p>
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2">
                <li>Publier de fausses annonces ou des informations trompeuses</li>
                <li>Utiliser la plateforme à des fins frauduleuses</li>
                <li>Collecter les données d'autres utilisateurs sans autorisation</li>
                <li>Perturber le fonctionnement de la plateforme</li>
                <li>Publier du contenu offensant, discriminatoire ou illégal</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                5. Propriété intellectuelle
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                Tout le contenu de la plateforme ImmoGuinée (logos, textes, images, code) est protégé par les droits de propriété intellectuelle. Toute reproduction non autorisée est interdite.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                6. Modification des conditions
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                ImmoGuinée se réserve le droit de modifier ces conditions à tout moment. Les utilisateurs seront informés de tout changement significatif par email ou notification sur la plateforme.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                7. Contact
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Pour toute question concernant ces conditions, contactez-nous :
              </p>
              <div className="bg-neutral-50 dark:bg-dark-bg rounded-xl p-4">
                <p className="text-neutral-700 dark:text-neutral-300">
                  Email : legal@immoguinee.com<br />
                  Téléphone : +224 620 00 00 00<br />
                  Adresse : Kipé, Conakry, Guinée
                </p>
              </div>
            </section>
          </div>
        </motion.div>

        {/* Related Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12"
        >
          <Link
            href="/confidentialite"
            className="bg-white dark:bg-dark-card rounded-xl p-5 shadow-soft hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
              <Shield className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Politique de confidentialité
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Comment nous protégeons vos données
              </p>
            </div>
          </Link>
          <Link
            href="/contact"
            className="bg-white dark:bg-dark-card rounded-xl p-5 shadow-soft hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <div className="p-3 bg-primary-50 dark:bg-primary-500/10 rounded-xl">
              <FileText className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Contactez-nous
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Une question ? Nous sommes là pour vous aider
              </p>
            </div>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

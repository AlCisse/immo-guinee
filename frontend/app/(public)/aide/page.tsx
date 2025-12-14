'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  HelpCircle,
  Search,
  ChevronDown,
  Home,
  User,
  CreditCard,
  Shield,
  MessageSquare,
  FileText,
  Phone,
} from 'lucide-react';

const faqCategories = [
  {
    id: 'annonces',
    name: 'Annonces',
    icon: Home,
    color: 'primary',
    questions: [
      {
        q: 'Comment publier une annonce ?',
        a: 'Pour publier une annonce, créez d\'abord un compte gratuit. Ensuite, cliquez sur "Publier une annonce", remplissez le formulaire avec les détails de votre bien (photos, description, prix, localisation) et soumettez. Votre annonce sera vérifiée par notre équipe avant publication.',
      },
      {
        q: 'Combien coûte la publication d\'une annonce ?',
        a: 'La publication d\'annonces sur ImmoGuinée est entièrement gratuite pour les particuliers. Des options de mise en avant payantes sont disponibles pour augmenter la visibilité de votre annonce.',
      },
      {
        q: 'Comment modifier ou supprimer mon annonce ?',
        a: 'Connectez-vous à votre compte, allez dans "Mes annonces", sélectionnez l\'annonce concernée et cliquez sur "Modifier" ou "Supprimer". Les modifications seront revérifiées avant publication.',
      },
      {
        q: 'Combien de temps mon annonce reste-t-elle en ligne ?',
        a: 'Les annonces restent actives pendant 60 jours. Vous pouvez les renouveler gratuitement depuis votre espace personnel avant expiration.',
      },
    ],
  },
  {
    id: 'compte',
    name: 'Compte',
    icon: User,
    color: 'blue',
    questions: [
      {
        q: 'Comment créer un compte ?',
        a: 'Cliquez sur "S\'inscrire", entrez votre nom, email et numéro de téléphone guinéen. Vous recevrez un code de vérification par SMS pour activer votre compte.',
      },
      {
        q: 'J\'ai oublié mon mot de passe, que faire ?',
        a: 'Sur la page de connexion, cliquez sur "Mot de passe oublié". Entrez votre numéro de téléphone et suivez les instructions pour réinitialiser votre mot de passe.',
      },
      {
        q: 'Comment supprimer mon compte ?',
        a: 'Contactez notre support via le formulaire de contact ou par email à support@immoguinee.com. La suppression du compte entraîne la suppression de toutes vos annonces.',
      },
    ],
  },
  {
    id: 'securite',
    name: 'Sécurité',
    icon: Shield,
    color: 'emerald',
    questions: [
      {
        q: 'Comment éviter les arnaques ?',
        a: 'Ne payez jamais avant d\'avoir visité le bien. Méfiez-vous des prix trop bas. Privilégiez les annonces avec le badge "Vérifié". Rencontrez toujours le propriétaire en personne avant tout paiement.',
      },
      {
        q: 'Comment signaler une annonce frauduleuse ?',
        a: 'Sur chaque annonce, cliquez sur l\'icône de signalement. Décrivez le problème et notre équipe traitera votre signalement sous 24h.',
      },
      {
        q: 'Mes informations personnelles sont-elles protégées ?',
        a: 'Oui, nous utilisons un cryptage de niveau bancaire. Vos données ne sont jamais partagées avec des tiers sans votre consentement. Consultez notre politique de confidentialité pour plus de détails.',
      },
    ],
  },
  {
    id: 'paiements',
    name: 'Paiements',
    icon: CreditCard,
    color: 'purple',
    questions: [
      {
        q: 'Quels modes de paiement acceptez-vous ?',
        a: 'Nous acceptons Orange Money, MTN Mobile Money, les virements bancaires et les paiements par carte bancaire pour les options premium.',
      },
      {
        q: 'Comment fonctionne le paiement sécurisé ?',
        a: 'Pour les transactions premium, nous proposons un service d\'escrow : l\'argent est conservé en sécurité jusqu\'à la signature du contrat et la remise des clés.',
      },
    ],
  },
];

export default function AidePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const filteredCategories = searchQuery
    ? faqCategories.map(cat => ({
        ...cat,
        questions: cat.questions.filter(
          q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
               q.a.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(cat => cat.questions.length > 0)
    : faqCategories;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-orange-500 pt-6 pb-16">
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
              <HelpCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Centre d'aide
            </h1>
            <p className="text-white/80 mb-6">
              Trouvez des réponses à toutes vos questions
            </p>

            {/* Search Bar */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une question..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white dark:bg-dark-card text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-8">
        {/* Category Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
        >
          {faqCategories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            const colorClasses = {
              primary: 'bg-primary-50 dark:bg-primary-500/10 text-primary-500',
              blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-500',
              emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500',
              purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-500',
            };

            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(isActive ? null : category.id)}
                className={`
                  p-4 rounded-xl transition-all text-center
                  ${isActive
                    ? 'bg-white dark:bg-dark-card shadow-lg ring-2 ring-primary-500'
                    : 'bg-white dark:bg-dark-card shadow-soft hover:shadow-md'
                  }
                `}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 ${colorClasses[category.color as keyof typeof colorClasses]}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <p className="font-medium text-sm text-neutral-900 dark:text-white">
                  {category.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {category.questions.length} questions
                </p>
              </button>
            );
          })}
        </motion.div>

        {/* FAQ List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden mb-8"
        >
          {filteredCategories.length > 0 ? (
            filteredCategories
              .filter(cat => !activeCategory || cat.id === activeCategory)
              .map((category) => (
                <div key={category.id}>
                  <div className="px-6 py-4 bg-neutral-50 dark:bg-dark-bg border-b border-neutral-100 dark:border-dark-border">
                    <h2 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                      <category.icon className="w-5 h-5 text-primary-500" />
                      {category.name}
                    </h2>
                  </div>
                  {category.questions.map((faq, i) => {
                    const questionId = `${category.id}-${i}`;
                    const isOpen = openQuestion === questionId;

                    return (
                      <div key={i} className="border-b border-neutral-100 dark:border-dark-border last:border-0">
                        <button
                          onClick={() => setOpenQuestion(isOpen ? null : questionId)}
                          className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors"
                        >
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {faq.q}
                          </span>
                          <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 pb-4 text-neutral-600 dark:text-neutral-400">
                                {faq.a}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              ))
          ) : (
            <div className="px-6 py-12 text-center">
              <HelpCircle className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">
                Aucun résultat pour "{searchQuery}"
              </p>
            </div>
          )}
        </motion.div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-primary-500 to-orange-500 rounded-2xl p-6 md:p-8 text-center mb-12"
        >
          <h2 className="text-xl font-bold text-white mb-2">
            Vous n'avez pas trouvé votre réponse ?
          </h2>
          <p className="text-white/80 mb-6">
            Notre équipe de support est disponible pour vous aider
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="w-full sm:w-auto px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              Nous contacter
            </Link>
            <a
              href="tel:+224620000000"
              className="w-full sm:w-auto px-6 py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              +224 620 00 00 00
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

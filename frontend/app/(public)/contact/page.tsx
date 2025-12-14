'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Clock,
  CheckCircle,
  Loader2,
} from 'lucide-react';

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    sujet: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-dark-card rounded-3xl p-8 text-center max-w-md w-full shadow-xl"
        >
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
            Message envoyé !
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Merci de nous avoir contactés. Notre équipe vous répondra dans les plus brefs délais.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-orange-500 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-orange-600 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour à l'accueil
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-orange-500 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4">
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
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Contactez-nous
            </h1>
            <p className="text-white/80 max-w-xl mx-auto">
              Une question, une suggestion ou besoin d'aide ? Notre équipe est là pour vous.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Info Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 space-y-4"
          >
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary-50 dark:bg-primary-500/10 rounded-xl">
                  <Phone className="w-6 h-6 text-primary-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                    Téléphone
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-2">
                    Appelez-nous directement
                  </p>
                  <a href="tel:+224620000000" className="text-primary-500 font-medium hover:underline">
                    +224 620 00 00 00
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                  <MessageSquare className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                    WhatsApp
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-2">
                    Écrivez-nous sur WhatsApp
                  </p>
                  <a
                    href="https://wa.me/224620000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-500 font-medium hover:underline"
                  >
                    Démarrer une conversation
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                  <Mail className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                    Email
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-2">
                    Envoyez-nous un email
                  </p>
                  <a href="mailto:contact@immoguinee.com" className="text-blue-500 font-medium hover:underline">
                    contact@immoguinee.com
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
                  <MapPin className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                    Adresse
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    Quartier Kipé, Commune de Ratoma<br />
                    Conakry, Guinée
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-50 dark:bg-orange-500/10 rounded-xl">
                  <Clock className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                    Horaires
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    Lun - Ven: 8h00 - 18h00<br />
                    Sam: 9h00 - 14h00
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 md:p-8 shadow-soft">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6">
                Envoyez-nous un message
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      name="nom"
                      value={formData.nom}
                      onChange={handleChange}
                      required
                      placeholder="Votre nom"
                      className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-dark-card text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="votre@email.com"
                      className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-dark-card text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleChange}
                      placeholder="+224 6XX XX XX XX"
                      className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-dark-card text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Sujet
                    </label>
                    <select
                      name="sujet"
                      value={formData.sujet}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-dark-card text-neutral-900 dark:text-white"
                    >
                      <option value="">Sélectionner un sujet</option>
                      <option value="question">Question générale</option>
                      <option value="technique">Problème technique</option>
                      <option value="annonce">À propos d'une annonce</option>
                      <option value="partenariat">Partenariat</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Décrivez votre demande..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-dark-card text-neutral-900 dark:text-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-primary-500 to-orange-500 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Envoyer le message
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 pb-12"
        >
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6 text-center">
            Questions fréquentes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                q: 'Comment publier une annonce ?',
                a: 'Créez un compte gratuit, puis cliquez sur "Publier une annonce" et remplissez le formulaire.',
              },
              {
                q: 'Les annonces sont-elles vérifiées ?',
                a: 'Oui, notre équipe vérifie chaque annonce avant publication pour garantir la qualité.',
              },
              {
                q: 'Comment contacter un propriétaire ?',
                a: "Vous pouvez l'appeler directement, lui envoyer un message ou contacter via WhatsApp.",
              },
              {
                q: 'Puis-je modifier mon annonce ?',
                a: 'Oui, connectez-vous à votre compte et accédez à "Mes annonces" pour la modifier.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white dark:bg-dark-card rounded-xl p-5 shadow-soft">
                <h3 className="font-medium text-neutral-900 dark:text-white mb-2">
                  {faq.q}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Home,
  CheckCircle,
  XCircle,
  CalendarClock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';

type VisitResponse = 'CONFIRMED' | 'UNAVAILABLE' | 'RESCHEDULE';

interface Visit {
  id: string;
  date_visite: string;
  heure_visite: string;
  client_nom: string;
  statut: string;
  listing: {
    id: string;
    titre: string;
    quartier: string;
    commune: string;
    prix: number;
    type_transaction: string;
    photos?: { url: string }[];
  };
}

function VisitResponseContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [visit, setVisit] = useState<Visit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [alreadyResponded, setAlreadyResponded] = useState(false);

  // Reschedule form
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      fetchVisitDetails();
    } else {
      setError('Token de visite manquant');
      setIsLoading(false);
    }
  }, [token]);

  const fetchVisitDetails = async () => {
    try {
      const response = await apiClient.get('/visits/response', {
        params: { token },
      });

      if (response.data.success) {
        setVisit(response.data.data.visit);
        setAlreadyResponded(response.data.data.already_responded);
      } else {
        setError('Impossible de charger les details de la visite');
      }
    } catch (err: any) {
      console.error('Error fetching visit:', err);
      setError(
        err.response?.data?.message ||
        'Visite introuvable ou lien expire'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponse = async (response: VisitResponse) => {
    if (response === 'RESCHEDULE' && !showRescheduleForm) {
      setShowRescheduleForm(true);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload: any = {
        token,
        response,
      };

      if (response === 'RESCHEDULE') {
        if (!proposedDate || !proposedTime) {
          setError('Veuillez proposer une date et une heure');
          setIsSubmitting(false);
          return;
        }
        payload.proposed_date = proposedDate;
        payload.proposed_time = proposedTime;
        payload.message = message;
      }

      const res = await apiClient.post('/visits/response', payload);

      if (res.data.success) {
        setSuccess(res.data.message);
        setAlreadyResponded(true);
      } else {
        setError(res.data.message || 'Une erreur est survenue');
      }
    } catch (err: any) {
      console.error('Error submitting response:', err);
      setError(
        err.response?.data?.message ||
        'Une erreur est survenue. Veuillez reessayer.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error && !visit) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
          Erreur
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">{error}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 font-medium"
        >
          Retour a l'accueil
        </Link>
      </div>
    );
  }

  if (success || alreadyResponded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="w-20 h-20 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
          {success || 'Reponse deja enregistree'}
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          Merci pour votre reponse. L'agent immobilier a ete notifie.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
        >
          Decouvrir nos annonces
        </Link>
      </motion.div>
    );
  }

  if (!visit) return null;

  const listingPhoto = visit.listing.photos?.[0]?.url || '/images/placeholder-property.jpg';
  const visitDate = new Date(visit.date_visite);
  const formattedDate = visitDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Visit Details Card */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden">
        {/* Property Image */}
        <div className="relative h-48 bg-neutral-200">
          <Image
            src={listingPhoto}
            alt={visit.listing.titre}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-white font-bold text-lg line-clamp-1">
              {visit.listing.titre}
            </h2>
            <div className="flex items-center gap-1 text-white/80 text-sm">
              <MapPin className="w-4 h-4" />
              {visit.listing.quartier}, {visit.listing.commune}
            </div>
          </div>
        </div>

        {/* Visit Info */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Details de la visite
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300">
              <Calendar className="w-5 h-5 text-primary-500" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300">
              <Clock className="w-5 h-5 text-primary-500" />
              <span>{visit.heure_visite}</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300">
              <Home className="w-5 h-5 text-primary-500" />
              <span>
                {visit.listing.type_transaction === 'LOCATION' ? 'Location' : 'Vente'} -{' '}
                {visit.listing.prix?.toLocaleString('fr-FR')} GNF
                {visit.listing.type_transaction === 'LOCATION' && '/mois'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Response Buttons */}
      {!showRescheduleForm ? (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white text-center mb-4">
            Confirmez-vous cette visite ?
          </h3>

          <button
            onClick={() => handleResponse('CONFIRMED')}
            disabled={isSubmitting}
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-6 h-6" />
                Oui, je confirme
              </>
            )}
          </button>

          <button
            onClick={() => handleResponse('UNAVAILABLE')}
            disabled={isSubmitting}
            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <XCircle className="w-6 h-6" />
                Non, je suis indisponible
              </>
            )}
          </button>

          <button
            onClick={() => handleResponse('RESCHEDULE')}
            disabled={isSubmitting}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <CalendarClock className="w-6 h-6" />
            Proposer une autre date
          </button>
        </div>
      ) : (
        /* Reschedule Form */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Proposer une autre date
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Date proposee
              </label>
              <input
                type="date"
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-dark-card text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Heure proposee
              </label>
              <input
                type="time"
                value={proposedTime}
                onChange={(e) => setProposedTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-dark-card text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Message (optionnel)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Ajoutez un message..."
                className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-dark-card text-neutral-900 dark:text-white resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRescheduleForm(false)}
                className="flex-1 py-3 border-2 border-neutral-200 dark:border-dark-border text-neutral-700 dark:text-neutral-300 font-semibold rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-border transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleResponse('RESCHEDULE')}
                disabled={isSubmitting || !proposedDate || !proposedTime}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Envoyer'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function VisitResponsePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-orange-500 to-primary-600 flex flex-col">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Header */}
      <div className="relative z-10 p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-white">
          <Image
            src="/images/iOS/Icon-60.png"
            alt="ImmoGuinee"
            width={40}
            height={40}
            className="rounded-xl"
          />
          <span className="font-bold text-xl">ImmoGuinee</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-start justify-center p-6 pt-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Suspense fallback={
            <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl p-8 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          }>
            <VisitResponseContent />
          </Suspense>
        </motion.div>
      </div>
    </div>
  );
}

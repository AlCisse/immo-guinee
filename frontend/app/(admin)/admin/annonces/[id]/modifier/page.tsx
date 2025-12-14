'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Building2,
  Loader2,
  MapPin,
  DollarSign,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  Ban,
  Home,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { formatMoney, propertyTypeLabels, statusLabels, getStatusColor } from '@/lib/colors';
import { clsx } from 'clsx';

interface Listing {
  id: string;
  titre: string;
  description: string;
  type_bien: string;
  loyer_mensuel: number;
  ville: string;
  quartier: string;
  statut: string;
  disponible: boolean;
  surface?: number;
  nombre_chambres?: number;
  nombre_salles_bain?: number;
  created_at: string;
  user?: {
    id: string;
    nom_complet: string;
    telephone: string;
  };
}

const STATUS_ACTIONS = [
  {
    action: 'approve',
    label: 'Approuver',
    description: 'Rendre l\'annonce visible au public',
    icon: CheckCircle,
    color: 'bg-green-500 hover:bg-green-600',
    targetStatus: 'ACTIVE'
  },
  {
    action: 'suspend',
    label: 'Suspendre',
    description: 'Masquer temporairement l\'annonce',
    icon: Clock,
    color: 'bg-orange-500 hover:bg-orange-600',
    targetStatus: 'SUSPENDU'
  },
  {
    action: 'delete',
    label: 'Supprimer',
    description: 'Supprimer définitivement l\'annonce',
    icon: Ban,
    color: 'bg-red-500 hover:bg-red-600',
    targetStatus: null
  },
];

export default function AdminEditListingPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const listingId = params.id as string;
  const [reason, setReason] = useState('');

  // Fetch listing data
  const { data: listing, isLoading, error } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: async () => {
      const response = await api.listings.get(listingId);
      return response.data?.data as Listing;
    },
  });

  // Moderation mutation
  const moderateMutation = useMutation({
    mutationFn: async ({ action, reason }: { action: string; reason?: string }) => {
      const response = await api.admin.moderateListing(listingId, { action, reason });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });

      const messages: Record<string, string> = {
        approve: 'Annonce approuvée avec succès',
        suspend: 'Annonce suspendue avec succès',
        delete: 'Annonce supprimée avec succès',
      };
      toast.success(messages[variables.action] || 'Action effectuée');

      if (variables.action === 'delete') {
        router.push('/admin/annonces');
      }
    },
    onError: () => {
      toast.error('Erreur lors de la modération');
    },
  });

  const handleAction = (action: string) => {
    const confirmMessages: Record<string, string> = {
      approve: 'Voulez-vous approuver cette annonce ?',
      suspend: 'Voulez-vous suspendre cette annonce ?',
      delete: 'Voulez-vous supprimer définitivement cette annonce ? Cette action est irréversible.',
    };

    if (confirm(confirmMessages[action])) {
      moderateMutation.mutate({ action, reason: reason || undefined });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
        <h2 className="text-xl font-semibold mb-2">Annonce introuvable</h2>
        <p className="text-neutral-500 mb-4">Cette annonce n'existe pas ou a été supprimée.</p>
        <Link href="/admin/annonces" className="text-primary-500 hover:underline">
          Retour aux annonces
        </Link>
      </div>
    );
  }

  // Filter actions based on current status
  const availableActions = STATUS_ACTIONS.filter(action => {
    if (action.action === 'approve' && listing.statut === 'ACTIVE') return false;
    if (action.action === 'suspend' && listing.statut === 'SUSPENDU') return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/annonces"
          className="p-2 bg-white dark:bg-dark-card rounded-xl border border-neutral-200 dark:border-dark-border hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Building2 className="w-7 h-7 text-primary-500" />
            Modérer l'annonce
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Modifier le statut de cette annonce
          </p>
        </div>
      </div>

      {/* Listing Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft border border-neutral-100 dark:border-dark-border"
      >
        {/* Current Status */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100 dark:border-dark-border">
          <span className="text-sm text-neutral-500">Statut actuel</span>
          <span className={clsx(
            'px-4 py-2 text-sm font-semibold rounded-full',
            getStatusColor(listing.statut)
          )}>
            {statusLabels[listing.statut] || listing.statut}
          </span>
        </div>

        {/* Listing Details */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              {listing.titre}
            </h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500">
              <span className="flex items-center gap-1">
                <Home className="w-4 h-4" />
                {propertyTypeLabels[listing.type_bien] || listing.type_bien}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {listing.ville}, {listing.quartier}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {formatMoney(listing.loyer_mensuel)}
              </span>
            </div>
          </div>

          {listing.description && (
            <p className="text-neutral-600 dark:text-neutral-400 text-sm line-clamp-3">
              {listing.description}
            </p>
          )}

          {/* Owner Info */}
          {listing.user && (
            <div className="flex items-center gap-3 pt-4 border-t border-neutral-100 dark:border-dark-border">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-500/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {listing.user.nom_complet}
                </p>
                <p className="text-sm text-neutral-500">{listing.user.telephone}</p>
              </div>
              <div className="ml-auto text-right text-sm">
                <p className="text-neutral-500 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Publié le
                </p>
                <p className="font-medium text-neutral-700 dark:text-neutral-300">
                  {new Date(listing.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          )}

          {/* View listing button */}
          <div className="pt-4">
            <button
              onClick={() => window.open(`/bien/${listing.id}`, '_blank')}
              className="flex items-center gap-2 text-primary-500 hover:text-primary-600 text-sm font-medium"
            >
              <Eye className="w-4 h-4" />
              Voir l'annonce complète
            </button>
          </div>
        </div>
      </motion.div>

      {/* Reason Input (optional) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft border border-neutral-100 dark:border-dark-border"
      >
        <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
          Motif (optionnel)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Indiquez le motif de votre décision..."
          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-bg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none"
        />
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft border border-neutral-100 dark:border-dark-border"
      >
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">
          Actions disponibles
        </h3>

        <div className="grid gap-3">
          {availableActions.map((actionItem) => (
            <button
              key={actionItem.action}
              onClick={() => handleAction(actionItem.action)}
              disabled={moderateMutation.isPending}
              className={clsx(
                'flex items-center gap-4 w-full p-4 rounded-xl text-white transition-all disabled:opacity-50',
                actionItem.color
              )}
            >
              {moderateMutation.isPending ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <actionItem.icon className="w-6 h-6" />
              )}
              <div className="text-left">
                <p className="font-semibold">{actionItem.label}</p>
                <p className="text-sm opacity-90">{actionItem.description}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Cancel Button */}
      <div className="flex justify-center">
        <Link
          href="/admin/annonces"
          className="px-6 py-3 text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-dark-border rounded-xl hover:bg-neutral-200 dark:hover:bg-dark-hover transition-colors font-medium"
        >
          Annuler
        </Link>
      </div>
    </div>
  );
}

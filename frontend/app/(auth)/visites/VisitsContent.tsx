'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  User,
  Phone,
  X,
  Calendar,
  List,
  MoreVertical,
  Edit,
  Trash2,
  MessageSquare,
  Check,
  Loader2,
  Users,
  Bell,
} from 'lucide-react';
import { api, apiClient } from '@/lib/api/client';
import { useUser } from '@/lib/auth/useAuth';
import toast from 'react-hot-toast';

// Types
type VisitStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

interface Visit {
  id: string;
  listing_id: string;
  listing?: {
    id: string;
    titre: string;
    quartier: string;
    commune: string;
  };
  client_nom: string;
  client_telephone: string;
  client_email?: string;
  date_visite: string;
  heure_visite: string;
  duree_minutes: number;
  statut: VisitStatus;
  notes?: string;
  notes_proprietaire?: string;
}

// Status configuration
const statusConfig: Record<VisitStatus, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: 'En attente', color: 'text-warning-600', bgColor: 'bg-warning-100 dark:bg-warning-500/10' },
  CONFIRMED: { label: 'Confirmee', color: 'text-primary-600', bgColor: 'bg-primary-100 dark:bg-primary-500/10' },
  COMPLETED: { label: 'Terminee', color: 'text-success-600', bgColor: 'bg-success-100 dark:bg-success-500/10' },
  CANCELLED: { label: 'Annulee', color: 'text-error-600', bgColor: 'bg-error-100 dark:bg-error-500/10' },
};

// Calendar helpers
const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Visit Card Component
function VisitCard({
  visit,
  compact = false,
  onConfirm,
  onComplete,
  onCancel,
  isLoading,
}: {
  visit: Visit;
  compact?: boolean;
  onConfirm?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const status = statusConfig[visit.statut];
  const propertyTitle = visit.listing?.titre || 'Bien immobilier';
  const propertyAddress = visit.listing ? `${visit.listing.quartier}, ${visit.listing.commune}` : 'Adresse non disponible';

  if (compact) {
    return (
      <div className={`px-2 py-1 rounded text-xs truncate ${status.bgColor} ${status.color}`}>
        {visit.heure_visite.slice(0, 5)} - {visit.client_nom.split(' ')[0]}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-dark-card rounded-xl shadow-soft p-4 relative"
    >
      {/* Status Badge */}
      <div className="flex items-start justify-between mb-3">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
          {status.label}
        </span>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
            ) : (
              <MoreVertical className="w-4 h-4 text-neutral-400" />
            )}
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-8 w-44 bg-white dark:bg-dark-card rounded-xl shadow-lg py-2 z-10"
              >
                {visit.statut === 'PENDING' && onConfirm && (
                  <button
                    onClick={() => { onConfirm(); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-dark-bg flex items-center gap-2 text-success-600"
                  >
                    <Check className="w-4 h-4" />
                    Confirmer
                  </button>
                )}
                {visit.statut === 'CONFIRMED' && onComplete && (
                  <button
                    onClick={() => { onComplete(); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-dark-bg flex items-center gap-2 text-success-600"
                  >
                    <Check className="w-4 h-4" />
                    Marquer terminee
                  </button>
                )}
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-dark-bg flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Message
                </button>
                {(visit.statut === 'PENDING' || visit.statut === 'CONFIRMED') && onCancel && (
                  <button
                    onClick={() => { onCancel(); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Annuler
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Property Info */}
      <div className="mb-3">
        <h3 className="font-semibold text-neutral-900 dark:text-white text-sm mb-1">
          {propertyTitle}
        </h3>
        <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 text-xs">
          <MapPin className="w-3.5 h-3.5" />
          <span>{propertyAddress}</span>
        </div>
      </div>

      {/* Time & Duration */}
      <div className="flex items-center gap-4 mb-3 text-sm">
        <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
          <Clock className="w-4 h-4 text-primary-500" />
          <span className="font-medium">{visit.heure_visite.slice(0, 5)}</span>
        </div>
        <span className="text-neutral-400">|</span>
        <span className="text-neutral-500 dark:text-neutral-400">{visit.duree_minutes} min</span>
      </div>

      {/* Client Info */}
      <div className="pt-3 border-t border-neutral-100 dark:border-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-medium">
            {visit.client_nom.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
              {visit.client_nom}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {visit.client_telephone}
            </p>
          </div>
          <a
            href={`tel:${visit.client_telephone}`}
            className="p-2 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Notes */}
      {visit.notes && (
        <div className="mt-3 p-2 bg-neutral-50 dark:bg-dark-bg rounded-lg">
          <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
            {visit.notes}
          </p>
        </div>
      )}
    </motion.div>
  );
}

// Contact from conversations type
interface ConversationContact {
  id: string;
  nom_complet: string;
  telephone: string;
  avatar_url?: string;
  photo_profil_url?: string;
  listing_titre?: string;
  conversation_id?: string;
  last_message_at?: string;
  last_message?: string;
}

// New Visit Modal
function NewVisitModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState({
    listing_id: '',
    client_nom: '',
    client_telephone: '',
    client_email: '',
    date_visite: '',
    heure_visite: '',
    duree_minutes: 30,
    notes: '',
    send_notification: true,
  });
  const [showContactsList, setShowContactsList] = useState(false);

  // Fetch user's OWN listings only
  const { data: listingsData } = useQuery({
    queryKey: ['my-listings-for-visit'],
    queryFn: async () => {
      const response = await api.listings.my();
      return response.data;
    },
    enabled: isOpen,
  });

  // Fetch contacts for the selected listing
  const { data: listingContactsData, isLoading: isLoadingContacts } = useQuery({
    queryKey: ['listing-contacts', formData.listing_id],
    queryFn: async () => {
      console.log('Fetching contacts for listing:', formData.listing_id);
      const response = await apiClient.get(`/listings/${formData.listing_id}/contacts`);
      console.log('Contacts response:', response.data);
      return response.data;
    },
    enabled: isOpen && !!formData.listing_id,
  });

  // Get current user from React Query
  const { data: currentUser } = useUser();

  const listings = listingsData?.data?.listings || listingsData?.listings || [];

  // Get contacts from the selected listing's conversations
  const listingContacts: ConversationContact[] = useMemo(() => {
    const contacts = listingContactsData?.data?.contacts || [];
    return contacts.map((contact: any) => ({
      id: contact.id,
      nom_complet: contact.nom_complet || 'Utilisateur',
      telephone: contact.telephone || '',
      photo_profil_url: contact.photo_profil_url,
      avatar_url: contact.photo_profil_url,
      conversation_id: contact.conversation_id,
      last_message_at: contact.last_message_at,
      last_message: contact.last_message,
    }));
  }, [listingContactsData]);

  const handleSelectContact = (contact: ConversationContact) => {
    setFormData({
      ...formData,
      client_nom: contact.nom_complet,
      client_telephone: contact.telephone,
    });
    setShowContactsList(false);
  };

  const handleListingChange = (listingId: string) => {
    setFormData({
      ...formData,
      listing_id: listingId,
      // Reset client info when property changes
      client_nom: '',
      client_telephone: '',
    });
    // Show contacts list if a property is selected
    if (listingId) {
      setShowContactsList(true);
    } else {
      setShowContactsList(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Format relative time for last message
  const formatLastMessageTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-dark-border">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Planifier une visite
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Propriete
            </label>
            <select
              value={formData.listing_id}
              onChange={(e) => handleListingChange(e.target.value)}
              required
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
            >
              <option value="">Selectionnez une propriete</option>
              {listings.map((listing: any) => (
                <option key={listing.id} value={listing.id}>
                  {listing.titre}
                </option>
              ))}
            </select>
          </div>

          {/* Client Selection from Property Conversations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Client
              </label>
              {formData.listing_id && (
                <button
                  type="button"
                  onClick={() => setShowContactsList(!showContactsList)}
                  className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
                >
                  <Users className="w-3.5 h-3.5" />
                  {showContactsList ? 'Saisir manuellement' : 'Contacts de ce bien'}
                </button>
              )}
            </div>

            {/* Loading state */}
            {isLoadingContacts && formData.listing_id && (
              <div className="flex items-center justify-center py-4 border border-neutral-200 dark:border-dark-border rounded-xl">
                <Loader2 className="w-5 h-5 text-primary-500 animate-spin mr-2" />
                <span className="text-sm text-neutral-500">Chargement des contacts...</span>
              </div>
            )}

            {/* Contacts list from property conversations */}
            {showContactsList && !isLoadingContacts && formData.listing_id ? (
              listingContacts.length > 0 ? (
                <div className="border border-neutral-200 dark:border-dark-border rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <div className="px-3 py-2 bg-primary-50 dark:bg-primary-500/10 border-b border-neutral-200 dark:border-dark-border">
                    <p className="text-xs font-medium text-primary-600 dark:text-primary-400 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {listingContacts.length} contact(s) ayant discute pour ce bien
                    </p>
                  </div>
                  {listingContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleSelectContact(contact)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors border-b border-neutral-100 dark:border-dark-border last:border-b-0"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium overflow-hidden">
                        {contact.photo_profil_url ? (
                          <img
                            src={contact.photo_profil_url}
                            alt={contact.nom_complet}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          contact.nom_complet.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-neutral-900 dark:text-white truncate">
                          {contact.nom_complet}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                          <span>{contact.telephone || 'Pas de telephone'}</span>
                          {contact.last_message_at && (
                            <>
                              <span>•</span>
                              <span>{formatLastMessageTime(contact.last_message_at)}</span>
                            </>
                          )}
                        </div>
                        {contact.last_message && (
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                            "{contact.last_message}"
                          </p>
                        )}
                      </div>
                      <Check className="w-4 h-4 text-primary-500 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="border border-neutral-200 dark:border-dark-border rounded-xl p-4 text-center">
                  <Users className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Aucun contact pour ce bien
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                    Saisissez les informations manuellement
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowContactsList(false)}
                    className="mt-2 text-xs text-primary-500 hover:text-primary-600"
                  >
                    Saisir manuellement
                  </button>
                </div>
              )
            ) : (
              <>
                <input
                  type="text"
                  value={formData.client_nom}
                  onChange={(e) => setFormData({ ...formData, client_nom: e.target.value })}
                  placeholder="Ex: Mamadou Diallo"
                  required
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </>
            )}
          </div>

          {/* Phone input - show when not selecting from list OR when list is empty */}
          {(!showContactsList || (showContactsList && listingContacts.length === 0)) && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Telephone
              </label>
              <input
                type="tel"
                value={formData.client_telephone}
                onChange={(e) => setFormData({ ...formData, client_telephone: e.target.value })}
                placeholder="+224 6XX XX XX XX"
                required
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={formData.date_visite}
                onChange={(e) => setFormData({ ...formData, date_visite: e.target.value })}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Heure
              </label>
              <input
                type="time"
                value={formData.heure_visite}
                onChange={(e) => setFormData({ ...formData, heure_visite: e.target.value })}
                required
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Notes (optionnel)
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informations supplementaires..."
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white resize-none"
            />
          </div>

          {/* Notification option */}
          <div className="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-500/10 rounded-xl">
            <input
              type="checkbox"
              id="send_notification"
              checked={formData.send_notification}
              onChange={(e) => setFormData({ ...formData, send_notification: e.target.checked })}
              className="w-4 h-4 text-primary-500 rounded border-neutral-300 focus:ring-primary-500"
            />
            <label htmlFor="send_notification" className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <Bell className="w-4 h-4 text-primary-500" />
              Envoyer une notification WhatsApp au client
            </label>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 -mt-2 ml-7">
            Le client recevra un message avec options: confirmer, indisponible, ou proposer une autre date
          </p>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-neutral-200 dark:border-dark-border text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Planification...
                </>
              ) : (
                'Planifier'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function VisitsContent() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [statusFilter, setStatusFilter] = useState<VisitStatus | 'all'>('all');
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);

  // Fetch visits
  const { data: visitsData, isLoading } = useQuery({
    queryKey: ['visits', statusFilter],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (statusFilter !== 'all') {
        params.statut = statusFilter;
      }
      const response = await api.visits.list(params);
      return response.data;
    },
  });

  const visits: Visit[] = visitsData?.data?.data || [];

  // Create visit mutation
  const createVisitMutation = useMutation({
    mutationFn: (data: any) => api.visits.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      setShowNewVisitModal(false);
      toast.success('Visite planifiee avec succes');
    },
    onError: () => {
      toast.error('Erreur lors de la planification de la visite');
    },
  });

  // Confirm visit mutation
  const confirmVisitMutation = useMutation({
    mutationFn: (id: string) => api.visits.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success('Visite confirmee');
      setActionLoadingId(null);
    },
    onError: () => {
      toast.error('Erreur lors de la confirmation');
      setActionLoadingId(null);
    },
  });

  // Complete visit mutation
  const completeVisitMutation = useMutation({
    mutationFn: (id: string) => api.visits.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success('Visite marquee comme terminee');
      setActionLoadingId(null);
    },
    onError: () => {
      toast.error('Erreur lors de la mise a jour');
      setActionLoadingId(null);
    },
  });

  // Cancel visit mutation
  const cancelVisitMutation = useMutation({
    mutationFn: (id: string) => api.visits.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success('Visite annulee');
      setActionLoadingId(null);
    },
    onError: () => {
      toast.error('Erreur lors de l\'annulation');
      setActionLoadingId(null);
    },
  });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Get visits for a specific date
  const getVisitsForDate = (date: Date) => {
    return visits.filter((visit) => {
      const visitDate = new Date(visit.date_visite);
      return isSameDay(visitDate, date);
    });
  };

  // Filter visits for selected date
  const filteredVisits = useMemo(() => {
    return getVisitsForDate(selectedDate);
  }, [selectedDate, visits]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = [];

    // Empty cells for days before first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [year, month, daysInMonth, firstDayOfMonth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Calendrier des visites
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400">
              Gerez vos rendez-vous de visite
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-white dark:bg-dark-card rounded-xl p-1 shadow-soft">
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-primary-500 text-white'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <Calendar className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary-500 text-white'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as VisitStatus | 'all')}
              className="px-4 py-2 bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 dark:text-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="CONFIRMED">Confirmee</option>
              <option value="COMPLETED">Terminee</option>
              <option value="CANCELLED">Annulee</option>
            </select>

            {/* New Visit Button */}
            <motion.button
              onClick={() => setShowNewVisitModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Nouvelle visite</span>
            </motion.button>
          </div>
        </div>

        {viewMode === 'calendar' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    {MONTHS[month]} {year}
                  </h2>
                  <button
                    onClick={goToToday}
                    className="px-3 py-1 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors"
                  >
                    Aujourd'hui
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevMonth}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                  </button>
                </div>
              </div>

              {/* Day Names */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-neutral-500 dark:text-neutral-400 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const isToday = isSameDay(date, new Date());
                  const isSelected = isSameDay(date, selectedDate);
                  const dayVisits = getVisitsForDate(date);
                  const hasVisits = dayVisits.length > 0;

                  return (
                    <motion.button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`aspect-square p-1 rounded-xl transition-colors relative ${
                        isSelected
                          ? 'bg-primary-500 text-white'
                          : isToday
                          ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400'
                          : 'hover:bg-neutral-100 dark:hover:bg-dark-bg text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <span className="text-sm font-medium">{date.getDate()}</span>

                      {/* Visit Indicators */}
                      {hasVisits && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {dayVisits.slice(0, 3).map((visit, i) => (
                            <span
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected
                                  ? 'bg-white'
                                  : visit.statut === 'CONFIRMED'
                                  ? 'bg-primary-500'
                                  : visit.statut === 'PENDING'
                                  ? 'bg-warning-500'
                                  : visit.statut === 'COMPLETED'
                                  ? 'bg-success-500'
                                  : 'bg-error-500'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-neutral-200 dark:border-dark-border">
                {Object.entries(statusConfig).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${config.bgColor.replace('100', '500').replace('/10', '')}`} />
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{config.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Day Visits */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
                {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                {filteredVisits.length} visite(s) planifiee(s)
              </p>

              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {filteredVisits.length > 0 ? (
                  filteredVisits.map((visit) => (
                    <VisitCard
                      key={visit.id}
                      visit={visit}
                      isLoading={actionLoadingId === visit.id}
                      onConfirm={() => {
                        setActionLoadingId(visit.id);
                        confirmVisitMutation.mutate(visit.id);
                      }}
                      onComplete={() => {
                        setActionLoadingId(visit.id);
                        completeVisitMutation.mutate(visit.id);
                      }}
                      onCancel={() => {
                        setActionLoadingId(visit.id);
                        cancelVisitMutation.mutate(visit.id);
                      }}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Aucune visite ce jour
                    </p>
                    <button
                      onClick={() => setShowNewVisitModal(true)}
                      className="mt-3 text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline"
                    >
                      + Planifier une visite
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft">
            <div className="p-6 border-b border-neutral-200 dark:border-dark-border">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Toutes les visites
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {visits.length} visite(s) au total
              </p>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-dark-border">
              {visits.length > 0 ? (
                visits.map((visit) => {
                  const status = statusConfig[visit.statut];
                  const visitDate = new Date(visit.date_visite);
                  const propertyTitle = visit.listing?.titre || 'Bien immobilier';
                  const propertyAddress = visit.listing ? `${visit.listing.quartier}, ${visit.listing.commune}` : '';

                  return (
                    <motion.div
                      key={visit.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Date Column */}
                        <div className="text-center flex-shrink-0 w-16">
                          <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                            {visitDate.getDate()}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase">
                            {visitDate.toLocaleDateString('fr-FR', { month: 'short' })}
                          </p>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                              {propertyTitle}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {visit.heure_visite.slice(0, 5)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {visit.client_nom}
                            </span>
                            {propertyAddress && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {propertyAddress}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${visit.client_telephone}`}
                            className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                          >
                            <Phone className="w-4 h-4 text-neutral-400" />
                          </a>
                          <button className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-lg transition-colors">
                            <MessageSquare className="w-4 h-4 text-neutral-400" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                  <p className="text-neutral-500 dark:text-neutral-400 mb-2">
                    Aucune visite trouvee
                  </p>
                  <button
                    onClick={() => setShowNewVisitModal(true)}
                    className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                  >
                    + Planifier une visite
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Visit Modal */}
      <AnimatePresence>
        {showNewVisitModal && (
          <NewVisitModal
            isOpen={showNewVisitModal}
            onClose={() => setShowNewVisitModal(false)}
            onSubmit={(data) => createVisitMutation.mutate(data)}
            isSubmitting={createVisitMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

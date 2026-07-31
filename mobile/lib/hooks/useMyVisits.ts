import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, apiClient } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Listing } from '@/types';

export interface NewVisitForm {
  listing_id: string;
  client_nom: string;
  client_telephone: string;
  date_visite: string;
  heure_visite: string;
  notes: string;
}

export interface ListingContact {
  id: string;
  nom_complet: string;
  telephone: string;
  photo_profil_url?: string;
  last_message_at?: string;
  last_message?: string;
}

export interface Visit {
  id: string;
  listing_id: string;
  proprietaire_id: string;
  visiteur_id: string;
  date_visite: string;
  heure_visite: string;
  statut: string;
  notes?: string;
  client_nom?: string;
  client_telephone?: string;
  listing?: {
    id: string;
    titre: string;
    quartier: string;
    commune: string;
    photo_principale?: string;
    main_photo_url?: string;
  };
  proprietaire?: {
    id: string;
    nom_complet: string;
    telephone: string;
    photo_profil_url?: string;
  };
  visiteur?: {
    id: string;
    nom_complet: string;
    telephone: string;
    photo_profil_url?: string;
  };
}

const initialFormData: NewVisitForm = {
  listing_id: '',
  client_nom: '',
  client_telephone: '',
  date_visite: '',
  heure_visite: '',
  notes: '',
};

export function useMyVisits() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);
  const [showVisitDetailModal, setShowVisitDetailModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showContactsList, setShowContactsList] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [newVisitForm, setNewVisitForm] = useState<NewVisitForm>(initialFormData);

  // Query - Visits
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-visits'],
    queryFn: async () => {
      const response = await api.visits.list();
      const visits =
        response.data?.data?.data || response.data?.data?.visits || response.data?.data || [];
      return Array.isArray(visits) ? visits : [];
    },
    enabled: isAuthenticated,
  });

  const visits: Visit[] = data || [];

  // Query - User's listings for dropdown
  const { data: listingsData, isLoading: isLoadingListings } = useQuery({
    queryKey: ['my-listings-for-visit'],
    queryFn: async () => {
      const response = await api.listings.my();
      let listings =
        response.data?.data?.listings ||
        response.data?.data ||
        response.data?.listings ||
        response.data ||
        [];
      if (!Array.isArray(listings)) listings = [];
      return listings;
    },
    enabled: isAuthenticated && showNewVisitModal,
  });

  const myListings: Listing[] = listingsData || [];

  // Query - Contacts for selected listing
  const { data: contactsData, isLoading: isLoadingContacts } = useQuery({
    queryKey: ['listing-contacts', newVisitForm.listing_id],
    queryFn: async () => {
      const response = await apiClient.get(`/listings/${newVisitForm.listing_id}/contacts`);
      return response.data?.data?.contacts || [];
    },
    enabled: isAuthenticated && showNewVisitModal && !!newVisitForm.listing_id,
  });

  const listingContacts: ListingContact[] = contactsData || [];

  // Mutations
  const createVisitMutation = useMutation({
    mutationFn: (data: NewVisitForm) =>
      api.visits.create({
        listing_id: data.listing_id,
        client_nom: data.client_nom,
        client_telephone: data.client_telephone,
        date_visite: data.date_visite,
        heure_visite: data.heure_visite,
        notes: data.notes || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-visits'] });
      await refetch();
      setShowNewVisitModal(false);
      resetForm();
      Alert.alert(t('common.success'), t('visits.visitScheduled'));
    },
    onError: (error: any) => {
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || t('visits.errors.createFailed')
      );
    },
  });

  const confirmVisitMutation = useMutation({
    mutationFn: (visitId: string) => api.visits.confirm(visitId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-visits'] });
      await refetch();
      Alert.alert(t('common.success'), t('visits.visitConfirmed'));
    },
    onError: (error: any) => {
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || t('visits.errors.confirmFailed')
      );
    },
  });

  const cancelVisitMutation = useMutation({
    mutationFn: (visitId: string) => api.visits.cancel(visitId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-visits'] });
      await refetch();
      Alert.alert(t('common.success'), t('visits.visitCancelled'));
    },
    onError: (error: any) => {
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || t('visits.errors.cancelFailed')
      );
    },
  });

  const deleteVisitMutation = useMutation({
    mutationFn: (visitId: string) => api.visits.delete(visitId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-visits'] });
      await refetch();
      Alert.alert(t('common.success'), t('visits.visitDeleted'));
    },
    onError: (error: any) => {
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || t('visits.errors.deleteFailed')
      );
    },
  });

  // Actions
  const resetForm = useCallback(() => {
    setNewVisitForm(initialFormData);
    setShowContactsList(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setSelectedDate(new Date());
    setSelectedTime(new Date());
  }, []);

  const handleListingChange = useCallback((listingId: string) => {
    setNewVisitForm((prev) => ({
      ...prev,
      listing_id: listingId,
      client_nom: '',
      client_telephone: '',
    }));
    setShowContactsList(!!listingId);
  }, []);

  const handleSelectContact = useCallback((contact: ListingContact) => {
    setNewVisitForm((prev) => ({
      ...prev,
      client_nom: contact.nom_complet,
      client_telephone: contact.telephone,
    }));
    setShowContactsList(false);
  }, []);

  const handleDateChange = useCallback((date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      setNewVisitForm((prev) => ({ ...prev, date_visite: formattedDate }));
    }
  }, []);

  const handleTimeChange = useCallback((date: Date | undefined) => {
    if (date) {
      setSelectedTime(date);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      setNewVisitForm((prev) => ({ ...prev, heure_visite: `${hours}:${minutes}` }));
    }
  }, []);

  const handleCreateVisit = useCallback(() => {
    if (!newVisitForm.listing_id) {
      Alert.alert(t('common.error'), t('visits.errors.selectProperty'));
      return;
    }
    if (!newVisitForm.client_nom.trim()) {
      Alert.alert(t('common.error'), t('visits.errors.clientNameRequired'));
      return;
    }
    if (!newVisitForm.client_telephone.trim()) {
      Alert.alert(t('common.error'), t('visits.errors.clientPhoneRequired'));
      return;
    }
    if (!newVisitForm.date_visite) {
      Alert.alert(t('common.error'), t('visits.errors.dateRequired'));
      return;
    }
    if (!newVisitForm.heure_visite) {
      Alert.alert(t('common.error'), t('visits.errors.timeRequired'));
      return;
    }
    createVisitMutation.mutate(newVisitForm);
  }, [newVisitForm, createVisitMutation, t]);

  const handleConfirmVisit = useCallback(
    (visitId: string) => {
      Alert.alert(t('visits.confirmVisit'), t('visits.confirmVisitQuestion'), [
        { text: t('common.no'), style: 'cancel' },
        { text: t('visits.yesConfirm'), onPress: () => confirmVisitMutation.mutate(visitId) },
      ]);
    },
    [confirmVisitMutation, t]
  );

  const handleCancelVisit = useCallback(
    (visitId: string) => {
      Alert.alert(t('visits.cancelVisit'), t('visits.cancelVisitQuestion'), [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('visits.yesCancel'),
          style: 'destructive',
          onPress: () => cancelVisitMutation.mutate(visitId),
        },
      ]);
    },
    [cancelVisitMutation, t]
  );

  const handleDeleteVisit = useCallback(
    (visitId: string) => {
      Alert.alert(t('visits.deleteVisit'), t('visits.deleteVisitQuestion'), [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteVisitMutation.mutate(visitId),
        },
      ]);
    },
    [deleteVisitMutation, t]
  );

  const openNewVisitModal = useCallback(() => {
    setShowNewVisitModal(true);
  }, []);

  const closeNewVisitModal = useCallback(() => {
    setShowNewVisitModal(false);
    resetForm();
  }, [resetForm]);

  const openVisitDetail = useCallback((visit: Visit) => {
    setSelectedVisit(visit);
    setShowVisitDetailModal(true);
  }, []);

  const closeVisitDetail = useCallback(() => {
    setShowVisitDetailModal(false);
    setSelectedVisit(null);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const updateForm = useCallback((updates: Partial<NewVisitForm>) => {
    setNewVisitForm((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    // User
    user,

    // Data
    visits,
    isLoading,
    refreshing,
    myListings,
    isLoadingListings,
    listingContacts,
    isLoadingContacts,

    // New visit modal
    showNewVisitModal,
    newVisitForm,
    showContactsList,
    showDatePicker,
    showTimePicker,
    selectedDate,
    selectedTime,
    isCreating: createVisitMutation.isPending,
    openNewVisitModal,
    closeNewVisitModal,
    updateForm,
    handleListingChange,
    handleSelectContact,
    handleDateChange,
    handleTimeChange,
    handleCreateVisit,
    setShowContactsList,
    setShowDatePicker,
    setShowTimePicker,

    // Visit detail modal
    showVisitDetailModal,
    selectedVisit,
    openVisitDetail,
    closeVisitDetail,

    // Actions
    handleConfirmVisit,
    handleCancelVisit,
    handleDeleteVisit,
    isConfirming: confirmVisitMutation.isPending,
    isCancelling: cancelVisitMutation.isPending,
    isDeleting: deleteVisitMutation.isPending,

    // Refresh
    onRefresh,
  };
}

export default useMyVisits;

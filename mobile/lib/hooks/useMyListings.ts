import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Listing } from '@/types';
import { EditFormData } from '@/components/listings/EditListingModal';

const initialFormData: EditFormData = {
  titre: '',
  description: '',
  loyer_mensuel: '',
  caution: '',
  avance: '',
  nombre_chambres: '',
  nombre_salles_bain: '',
  surface_m2: '',
  quartier: '',
  commune: '',
  adresse_complete: '',
  meuble: false,
  disponible: true,
};

export function useMyListings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>(initialFormData);
  const [deleteReason, setDeleteReason] = useState<string | null>(null);

  // Query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-listings'],
    queryFn: async () => {
      const response = await api.listings.my();
      return response.data?.data?.listings || [];
    },
    enabled: isAuthenticated,
  });

  const listings = data || [];

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditFormData }) => {
      const formData = new FormData();
      formData.append('titre', data.titre);
      formData.append('description', data.description);
      formData.append('loyer_mensuel', data.loyer_mensuel);
      if (data.caution) formData.append('caution', data.caution);
      if (data.avance) formData.append('avance', data.avance);
      if (data.nombre_chambres) formData.append('nombre_chambres', data.nombre_chambres);
      if (data.nombre_salles_bain) formData.append('nombre_salles_bain', data.nombre_salles_bain);
      if (data.surface_m2) formData.append('surface_m2', data.surface_m2);
      if (data.quartier) formData.append('quartier', data.quartier);
      if (data.commune) formData.append('commune', data.commune);
      if (data.adresse_complete) formData.append('adresse_complete', data.adresse_complete);
      formData.append('meuble', data.meuble ? '1' : '0');
      formData.append('disponible', data.disponible ? '1' : '0');
      return api.listings.update(id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      setEditModalVisible(false);
      setEditingListing(null);
      Alert.alert(t('alerts.success'), t('myListings.listingUpdated'));
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.message || t('myListings.updateFailed'));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id }: { id: string; reason: string }) => {
      return api.listings.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      setDeleteModalVisible(false);
      setEditModalVisible(false);
      setEditingListing(null);
      setDeleteReason(null);
      Alert.alert(t('alerts.success'), t('myListings.listingDeleted'));
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.message || t('myListings.deleteFailed'));
    },
  });

  // Actions
  const openEditModal = useCallback((listing: Listing) => {
    setEditingListing(listing);
    setEditForm({
      titre: listing.titre || '',
      description: listing.description || '',
      loyer_mensuel: listing.loyer_mensuel?.toString() || '',
      caution: listing.caution?.toString() || '',
      avance: listing.avance?.toString() || '',
      nombre_chambres: listing.nombre_chambres?.toString() || '',
      nombre_salles_bain: listing.nombre_salles_bain?.toString() || '',
      surface_m2: listing.surface_m2?.toString() || '',
      quartier: listing.quartier || '',
      commune: listing.commune || '',
      adresse_complete: listing.adresse_complete || '',
      meuble: listing.meuble || false,
      disponible: listing.disponible ?? true,
    });
    setEditModalVisible(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditModalVisible(false);
    setEditingListing(null);
  }, []);

  const handleFormChange = useCallback((updates: Partial<EditFormData>) => {
    setEditForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingListing) return;
    if (!editForm.titre.trim()) {
      Alert.alert(t('common.error'), t('myListings.titleRequired'));
      return;
    }
    if (!editForm.loyer_mensuel.trim()) {
      Alert.alert(t('common.error'), t('myListings.priceRequired'));
      return;
    }
    updateMutation.mutate({ id: editingListing.id, data: editForm });
  }, [editingListing, editForm, updateMutation, t]);

  const openDeleteModal = useCallback((listing?: Listing) => {
    if (listing) {
      setEditingListing(listing);
    }
    setDeleteReason(null);
    setDeleteModalVisible(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteModalVisible(false);
  }, []);

  const handleDelete = useCallback(() => {
    if (!editingListing || !deleteReason) {
      Alert.alert(t('common.error'), t('myListings.selectReason'));
      return;
    }
    deleteMutation.mutate({ id: editingListing.id, reason: deleteReason });
  }, [editingListing, deleteReason, deleteMutation, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return {
    // Data
    listings,
    isLoading,
    refreshing,

    // Edit modal
    editModalVisible,
    editForm,
    editingListing,
    isUpdating: updateMutation.isPending,
    openEditModal,
    closeEditModal,
    handleFormChange,
    handleSaveEdit,

    // Delete modal
    deleteModalVisible,
    deleteReason,
    isDeleting: deleteMutation.isPending,
    openDeleteModal,
    closeDeleteModal,
    setDeleteReason,
    handleDelete,

    // Refresh
    onRefresh,
  };
}

export default useMyListings;

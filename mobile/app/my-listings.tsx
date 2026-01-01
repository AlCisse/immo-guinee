import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Listing } from '@/types';
import Colors, { lightTheme } from '@/constants/Colors';
import { formatPrice as formatPriceUtil } from '@/lib/utils/formatPrice';

interface EditFormData {
  titre: string;
  description: string;
  loyer_mensuel: string;
  caution: string;
  avance: string;
  nombre_chambres: string;
  nombre_salles_bain: string;
  surface_m2: string;
  quartier: string;
  commune: string;
  adresse_complete: string;
  meuble: boolean;
  disponible: boolean;
}

export default function MyListingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
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
  });

  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteReason, setDeleteReason] = useState<string | null>(null);

  const deleteReasons = [
    { id: 'loue_immoguinee', label: t('myListings.rentedViaApp'), icon: 'checkmark-circle' },
    { id: 'loue_ailleurs', label: t('myListings.rentedElsewhere'), icon: 'home' },
    { id: 'plus_disponible', label: t('myListings.noLongerAvailable'), icon: 'close-circle' },
    { id: 'autre', label: t('myListings.otherReason'), icon: 'ellipsis-horizontal' },
  ];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-listings'],
    queryFn: async () => {
      const response = await api.listings.my();
      return response.data?.data?.listings || [];
    },
    enabled: isAuthenticated,
  });

  const listings = data || [];

  // Mutation to update listing
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

  const openEditModal = (listing: Listing) => {
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
  };

  const handleSaveEdit = () => {
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
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      // On peut envoyer la raison au backend pour statistiques
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

  const openDeleteModal = () => {
    setDeleteReason(null);
    setDeleteModalVisible(true);
  };

  const handleDelete = () => {
    if (!editingListing || !deleteReason) {
      Alert.alert(t('common.error'), t('myListings.selectReason'));
      return;
    }
    deleteMutation.mutate({ id: editingListing.id, reason: deleteReason });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatPrice = (listing: Listing) => {
    return formatPriceUtil(listing.loyer_mensuel);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLIE':
        return { label: t('myListings.status.published'), color: Colors.success[500] };
      case 'EN_ATTENTE':
        return { label: t('myListings.status.pending'), color: Colors.warning[500] };
      case 'ARCHIVE':
        return { label: t('myListings.status.archived'), color: Colors.neutral[500] };
      case 'BROUILLON':
        return { label: t('myListings.status.draft'), color: Colors.neutral[400] };
      default:
        return { label: status, color: Colors.neutral[400] };
    }
  };

  const renderListing = ({ item }: { item: Listing }) => {
    const imageUrl = item.main_photo_url || item.photo_principale;
    const status = getStatusBadge(item.statut);

    return (
      <TouchableOpacity
        style={styles.listingItem}
        onPress={() => router.push(`/listing/${item.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.listingImage}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="image-outline" size={24} color={Colors.neutral[300]} />
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.listingContent}>
          <Text style={styles.listingTitle} numberOfLines={1}>{item.titre}</Text>
          <View style={styles.listingLocation}>
            <Ionicons name="location-outline" size={12} color={lightTheme.colors.primary} />
            <Text style={styles.listingLocationText} numberOfLines={1}>
              {item.quartier}, {item.commune}
            </Text>
          </View>
          <Text style={styles.listingPrice}>{formatPrice(item)}</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
            <Ionicons name="create-outline" size={20} color={lightTheme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteIconButton} onPress={() => {
            setEditingListing(item);
            openDeleteModal();
          }}>
            <Ionicons name="trash-outline" size={20} color={Colors.error[500]} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('profile.myListings'),
          headerStyle: { backgroundColor: Colors.background.primary },
          headerShadowVisible: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.secondary[800]} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={lightTheme.colors.primary} />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            renderItem={renderListing}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={lightTheme.colors.primary}
                colors={[lightTheme.colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="home-outline" size={64} color={Colors.neutral[300]} />
                <Text style={styles.emptyTitle}>{t('myListings.noListings')}</Text>
                <Text style={styles.emptyText}>
                  {t('myListings.noListingsHint')}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors.secondary[800]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('myListings.editListing')}</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <ActivityIndicator size="small" color={lightTheme.colors.primary} />
              ) : (
                <Text style={styles.modalSaveText}>{t('myListings.save')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Section: Informations generales */}
            <Text style={styles.sectionTitle}>{t('myListings.generalInfo')}</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('myListings.title')} *</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.titre}
                onChangeText={(text) => setEditForm({ ...editForm, titre: text })}
                placeholder={t('myListings.titlePlaceholder')}
                placeholderTextColor={Colors.neutral[400]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('myListings.description')}</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={editForm.description}
                onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                placeholder={t('myListings.descriptionPlaceholder')}
                placeholderTextColor={Colors.neutral[400]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Section: Prix */}
            <Text style={styles.sectionTitle}>{t('myListings.priceConditions')}</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('myListings.monthlyRent')} *</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.loyer_mensuel}
                onChangeText={(text) => setEditForm({ ...editForm, loyer_mensuel: text.replace(/[^0-9]/g, '') })}
                placeholder={t('myListings.rentPlaceholder')}
                placeholderTextColor={Colors.neutral[400]}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>{t('myListings.deposit')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.caution}
                  onChangeText={(text) => setEditForm({ ...editForm, caution: text.replace(/[^0-9]/g, '') })}
                  placeholder="0"
                  placeholderTextColor={Colors.neutral[400]}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>{t('myListings.advance')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.avance}
                  onChangeText={(text) => setEditForm({ ...editForm, avance: text.replace(/[^0-9]/g, '') })}
                  placeholder="0"
                  placeholderTextColor={Colors.neutral[400]}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Section: Caracteristiques */}
            <Text style={styles.sectionTitle}>{t('myListings.characteristics')}</Text>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>{t('myListings.bedrooms')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.nombre_chambres}
                  onChangeText={(text) => setEditForm({ ...editForm, nombre_chambres: text.replace(/[^0-9]/g, '') })}
                  placeholder="0"
                  placeholderTextColor={Colors.neutral[400]}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>{t('myListings.bathrooms')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.nombre_salles_bain}
                  onChangeText={(text) => setEditForm({ ...editForm, nombre_salles_bain: text.replace(/[^0-9]/g, '') })}
                  placeholder="0"
                  placeholderTextColor={Colors.neutral[400]}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('myListings.area')}</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.surface_m2}
                onChangeText={(text) => setEditForm({ ...editForm, surface_m2: text.replace(/[^0-9]/g, '') })}
                placeholder={t('myListings.areaPlaceholder')}
                placeholderTextColor={Colors.neutral[400]}
                keyboardType="numeric"
              />
            </View>

            {/* Section: Localisation */}
            <Text style={styles.sectionTitle}>{t('myListings.location')}</Text>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>{t('myListings.commune')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.commune}
                  onChangeText={(text) => setEditForm({ ...editForm, commune: text })}
                  placeholder={t('myListings.communePlaceholder')}
                  placeholderTextColor={Colors.neutral[400]}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>{t('myListings.quartier')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.quartier}
                  onChangeText={(text) => setEditForm({ ...editForm, quartier: text })}
                  placeholder={t('myListings.quartierPlaceholder')}
                  placeholderTextColor={Colors.neutral[400]}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('myListings.fullAddress')}</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.adresse_complete}
                onChangeText={(text) => setEditForm({ ...editForm, adresse_complete: text })}
                placeholder={t('myListings.addressPlaceholder')}
                placeholderTextColor={Colors.neutral[400]}
              />
            </View>

            {/* Section: Options */}
            <Text style={styles.sectionTitle}>{t('myListings.options')}</Text>

            <View style={styles.formSwitchRow}>
              <View>
                <Text style={styles.formLabel}>{t('myListings.furnished')}</Text>
                <Text style={styles.formHint}>{t('myListings.furnishedHint')}</Text>
              </View>
              <Switch
                value={editForm.meuble}
                onValueChange={(value) => setEditForm({ ...editForm, meuble: value })}
                trackColor={{ false: Colors.neutral[300], true: lightTheme.colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.formSwitchRow}>
              <View>
                <Text style={styles.formLabel}>{t('myListings.available')}</Text>
                <Text style={styles.formHint}>{t('myListings.availableHint')}</Text>
              </View>
              <Switch
                value={editForm.disponible}
                onValueChange={(value) => setEditForm({ ...editForm, disponible: value })}
                trackColor={{ false: Colors.neutral[300], true: Colors.success[500] }}
                thumbColor="#fff"
              />
            </View>

            <View style={{ height: 50 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>{t('myListings.deleteListing')}</Text>
            <Text style={styles.deleteModalSubtitle}>{t('myListings.deleteReason')}</Text>

            {deleteReasons.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.deleteReasonOption,
                  deleteReason === reason.id && styles.deleteReasonSelected,
                ]}
                onPress={() => setDeleteReason(reason.id)}
              >
                <Ionicons
                  name={reason.icon as any}
                  size={22}
                  color={deleteReason === reason.id ? lightTheme.colors.primary : Colors.neutral[500]}
                />
                <Text
                  style={[
                    styles.deleteReasonText,
                    deleteReason === reason.id && styles.deleteReasonTextSelected,
                  ]}
                >
                  {reason.label}
                </Text>
                {deleteReason === reason.id && (
                  <Ionicons name="checkmark" size={20} color={lightTheme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteModalCancel}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.deleteModalCancelText}>{t('myListings.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteModalConfirm,
                  !deleteReason && styles.deleteModalConfirmDisabled,
                ]}
                onPress={handleDelete}
                disabled={!deleteReason || deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.deleteModalConfirmText}>{t('myListings.delete')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  listContent: {
    padding: 16,
  },
  listingItem: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  listingImage: {
    width: 110,
    height: 110,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  listingContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 6,
  },
  listingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  listingLocationText: {
    fontSize: 13,
    color: Colors.neutral[500],
    flex: 1,
  },
  listingPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: lightTheme.colors.primary,
  },
  actionButtons: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 4,
  },
  editButton: {
    padding: 10,
    justifyContent: 'center',
  },
  deleteIconButton: {
    padding: 10,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.neutral[500],
    marginTop: 8,
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: lightTheme.colors.primary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[700],
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.secondary[800],
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  formTextArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: lightTheme.colors.primary,
    marginBottom: 16,
    marginTop: 8,
  },
  formHint: {
    fontSize: 12,
    color: Colors.neutral[400],
    marginTop: 2,
  },
  // Delete button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  deleteButtonText: {
    fontSize: 16,
    color: Colors.error[500],
    fontWeight: '500',
  },
  // Delete modal
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[800],
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteModalSubtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: 20,
  },
  deleteReasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.background.secondary,
  },
  deleteReasonSelected: {
    backgroundColor: Colors.primary[50],
    borderWidth: 1,
    borderColor: lightTheme.colors.primary,
  },
  deleteReasonText: {
    flex: 1,
    fontSize: 15,
    color: Colors.secondary[700],
  },
  deleteReasonTextSelected: {
    color: lightTheme.colors.primary,
    fontWeight: '600',
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  deleteModalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[700],
  },
  deleteModalConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.error[500],
    alignItems: 'center',
  },
  deleteModalConfirmDisabled: {
    backgroundColor: Colors.neutral[300],
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

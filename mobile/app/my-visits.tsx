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
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, apiClient } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import Colors, { lightTheme } from '@/constants/Colors';
import { Listing } from '@/types';

interface NewVisitForm {
  listing_id: string;
  client_nom: string;
  client_telephone: string;
  date_visite: string;
  heure_visite: string;
  notes: string;
}

interface ListingContact {
  id: string;
  nom_complet: string;
  telephone: string;
  photo_profil_url?: string;
  last_message_at?: string;
  last_message?: string;
}

interface Visit {
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
  client_email?: string;
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
    email?: string;
    photo_profil_url?: string;
  };
  visiteur?: {
    id: string;
    nom_complet: string;
    telephone: string;
    email?: string;
    photo_profil_url?: string;
  };
}

export default function MyVisitsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);
  const [showVisitDetailModal, setShowVisitDetailModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showContactsList, setShowContactsList] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [newVisitForm, setNewVisitForm] = useState<NewVisitForm>({
    listing_id: '',
    client_nom: '',
    client_telephone: '',
    date_visite: '',
    heure_visite: '',
    notes: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-visits'],
    queryFn: async () => {
      const response = await api.visits.list();
      console.log('[my-visits] Visits response:', JSON.stringify(response.data));
      // Handle paginated response: response.data = { success, data: { data: [...visits], pagination } }
      const visits = response.data?.data?.data || response.data?.data?.visits || response.data?.data || [];
      console.log('[my-visits] Parsed visits count:', Array.isArray(visits) ? visits.length : 'not array');
      return Array.isArray(visits) ? visits : [];
    },
    enabled: isAuthenticated,
  });

  // Fetch user's listings for the dropdown - fetch when modal is open
  const { data: listingsData, isLoading: isLoadingListings } = useQuery({
    queryKey: ['my-listings-for-visit'],
    queryFn: async () => {
      const response = await api.listings.my();
      // Handle multiple response formats
      let listings = response.data?.data?.listings || response.data?.data || response.data?.listings || response.data || [];
      // Ensure it's an array
      if (!Array.isArray(listings)) {
        listings = [];
      }
      return listings;
    },
    enabled: isAuthenticated && showNewVisitModal,
  });

  const myListings: Listing[] = listingsData || [];

  // Get selected listing
  const selectedListing = myListings.find(l => l.id === newVisitForm.listing_id);

  // Fetch contacts for the selected listing
  const { data: contactsData, isLoading: isLoadingContacts } = useQuery({
    queryKey: ['listing-contacts', newVisitForm.listing_id],
    queryFn: async () => {
      const response = await apiClient.get(`/listings/${newVisitForm.listing_id}/contacts`);
      return response.data?.data?.contacts || [];
    },
    enabled: isAuthenticated && showNewVisitModal && !!newVisitForm.listing_id,
  });

  const listingContacts: ListingContact[] = contactsData || [];

  // Handle listing selection
  const handleListingChange = (listingId: string) => {
    setNewVisitForm({
      ...newVisitForm,
      listing_id: listingId,
      client_nom: '',
      client_telephone: '',
    });
    if (listingId) {
      setShowContactsList(true);
    } else {
      setShowContactsList(false);
    }
  };

  // Handle contact selection
  const handleSelectContact = (contact: ListingContact) => {
    setNewVisitForm({
      ...newVisitForm,
      client_nom: contact.nom_complet,
      client_telephone: contact.telephone,
    });
    setShowContactsList(false);
  };

  // Format relative time
  const formatLastMessageTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('visits.today');
    if (diffDays === 1) return t('visits.yesterday');
    if (diffDays < 7) return t('visits.daysAgo', { count: diffDays });
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  // Create visit mutation
  const createVisitMutation = useMutation({
    mutationFn: (data: NewVisitForm) => api.visits.create({
      listing_id: data.listing_id,
      client_nom: data.client_nom,
      client_telephone: data.client_telephone,
      date_visite: data.date_visite,
      heure_visite: data.heure_visite,
      notes: data.notes || undefined,
    }),
    onSuccess: async () => {
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['my-visits'] });
      await refetch();
      setShowNewVisitModal(false);
      resetForm();
      Alert.alert(t('common.success'), t('visits.visitScheduled'));
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || t('visits.errors.createFailed'));
    },
  });

  // Confirm visit mutation
  const confirmVisitMutation = useMutation({
    mutationFn: (visitId: string) => api.visits.confirm(visitId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-visits'] });
      await refetch();
      Alert.alert(t('common.success'), t('visits.visitConfirmed'));
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || t('visits.errors.confirmFailed'));
    },
  });

  // Cancel visit mutation
  const cancelVisitMutation = useMutation({
    mutationFn: (visitId: string) => api.visits.cancel(visitId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-visits'] });
      await refetch();
      Alert.alert(t('common.success'), t('visits.visitCancelled'));
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || t('visits.errors.cancelFailed'));
    },
  });

  // Delete visit mutation
  const deleteVisitMutation = useMutation({
    mutationFn: (visitId: string) => api.visits.delete(visitId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-visits'] });
      await refetch();
      Alert.alert(t('common.success'), t('visits.visitDeleted'));
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || t('visits.errors.deleteFailed'));
    },
  });

  // Handle confirm visit
  const handleConfirmVisit = (visitId: string) => {
    Alert.alert(
      t('visits.confirmVisit'),
      t('visits.confirmVisitQuestion'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('visits.yesConfirm'),
          onPress: () => confirmVisitMutation.mutate(visitId),
        },
      ]
    );
  };

  // Handle cancel visit
  const handleCancelVisit = (visitId: string) => {
    Alert.alert(
      t('visits.cancelVisit'),
      t('visits.cancelVisitQuestion'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('visits.yesCancel'),
          style: 'destructive',
          onPress: () => cancelVisitMutation.mutate(visitId),
        },
      ]
    );
  };

  // Handle delete visit
  const handleDeleteVisit = (visitId: string) => {
    Alert.alert(
      t('visits.deleteVisit'),
      t('visits.deleteVisitQuestion'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteVisitMutation.mutate(visitId),
        },
      ]
    );
  };

  const resetForm = () => {
    setNewVisitForm({
      listing_id: '',
      client_nom: '',
      client_telephone: '',
      date_visite: '',
      heure_visite: '',
      notes: '',
    });
    setShowContactsList(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setSelectedDate(new Date());
    setSelectedTime(new Date());
  };

  // Handle date change
  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
      setNewVisitForm({ ...newVisitForm, date_visite: formattedDate });
    }
  };

  // Handle time change
  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedTime(date);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      setNewVisitForm({ ...newVisitForm, heure_visite: `${hours}:${minutes}` });
    }
  };

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleCreateVisit = () => {
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
  };

  const visits = data || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMEE':
        return { label: t('visits.confirmed'), color: Colors.success[500], icon: 'checkmark-circle' };
      case 'EN_ATTENTE':
        return { label: t('visits.pending'), color: Colors.warning[500], icon: 'time' };
      case 'ANNULEE':
        return { label: t('visits.cancelled'), color: Colors.error[500], icon: 'close-circle' };
      case 'TERMINEE':
        return { label: t('visits.completed'), color: Colors.neutral[500], icon: 'checkmark-done-circle' };
      default:
        return { label: status, color: Colors.neutral[400], icon: 'ellipse' };
    }
  };

  const renderVisit = ({ item }: { item: Visit }) => {
    const listing = item.listing;
    const imageUrl = listing?.main_photo_url || listing?.photo_principale;
    const status = getStatusBadge(item.statut);
    const isOwner = user?.id === item.proprietaire_id;
    const isPending = item.statut === 'EN_ATTENTE' || item.statut === 'PENDING';
    const isConfirmed = item.statut === 'CONFIRMEE';
    // Visiteur peut confirmer (si en attente) et annuler (si en attente ou confirmee)
    // Proprietaire peut seulement supprimer
    const canConfirm = isPending; // Les deux peuvent confirmer
    const canCancel = isPending || isConfirmed; // Les deux peuvent annuler
    const canDelete = isOwner; // Seul le proprietaire peut supprimer

    return (
      <TouchableOpacity
        style={styles.visitItem}
        onPress={() => {
          setSelectedVisit(item);
          setShowVisitDetailModal(true);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.visitImage}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="home-outline" size={24} color={Colors.neutral[300]} />
            </View>
          )}
        </View>
        <View style={styles.visitContent}>
          <Text style={styles.visitTitle} numberOfLines={1}>
            {listing?.titre || t('visits.listing')}
          </Text>
          <View style={styles.visitLocation}>
            <Ionicons name="location-outline" size={12} color={lightTheme.colors.primary} />
            <Text style={styles.visitLocationText} numberOfLines={1}>
              {listing?.quartier}, {listing?.commune}
            </Text>
          </View>
          <View style={styles.visitDateTime}>
            <View style={styles.dateTimeItem}>
              <Ionicons name="calendar-outline" size={14} color={Colors.neutral[500]} />
              <Text style={styles.dateTimeText}>{formatDate(item.date_visite)}</Text>
            </View>
            <View style={styles.dateTimeItem}>
              <Ionicons name="time-outline" size={14} color={Colors.neutral[500]} />
              <Text style={styles.dateTimeText}>{formatTime(item.heure_visite)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.visitActions}>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Ionicons name={status.icon as any} size={12} color="#fff" />
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
          <View style={styles.actionButtons}>
            {canConfirm && (
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => handleConfirmVisit(item.id)}
                disabled={confirmVisitMutation.isPending}
              >
                {confirmVisitMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.success[600]} />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={20} color={Colors.success[600]} />
                )}
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelVisit(item.id)}
                disabled={cancelVisitMutation.isPending}
              >
                {cancelVisitMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.warning[600]} />
                ) : (
                  <Ionicons name="close-circle-outline" size={20} color={Colors.warning[600]} />
                )}
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteVisit(item.id)}
                disabled={deleteVisitMutation.isPending}
              >
                {deleteVisitMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.error[500]} />
                ) : (
                  <Ionicons name="trash-outline" size={20} color={Colors.error[500]} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('visits.myVisits'),
          headerStyle: { backgroundColor: Colors.background.primary },
          headerShadowVisible: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.secondary[800]} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowNewVisitModal(true)} style={styles.addButton}>
              <Ionicons name="add" size={28} color={lightTheme.colors.primary} />
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
            data={visits}
            keyExtractor={(item) => item.id}
            renderItem={renderVisit}
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
                <Ionicons name="calendar-outline" size={64} color={Colors.neutral[300]} />
                <Text style={styles.emptyTitle}>{t('visits.noVisits')}</Text>
                <Text style={styles.emptyText}>
                  {t('visits.noVisitsHint')}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* New Visit Modal */}
      <Modal
        visible={showNewVisitModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewVisitModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowNewVisitModal(false); resetForm(); }}>
              <Ionicons name="close" size={28} color={Colors.secondary[800]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('visits.newVisit')}</Text>
            <TouchableOpacity onPress={handleCreateVisit} disabled={createVisitMutation.isPending}>
              {createVisitMutation.isPending ? (
                <ActivityIndicator size="small" color={lightTheme.colors.primary} />
              ) : (
                <Text style={styles.modalSaveText}>{t('visits.create')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Property Selection - Inline List */}
            <Text style={styles.sectionTitle}>{t('visits.property')}</Text>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('visits.selectListing')}</Text>

              {isLoadingListings ? (
                <View style={styles.loadingContacts}>
                  <ActivityIndicator size="small" color={lightTheme.colors.primary} />
                  <Text style={styles.loadingContactsText}>{t('common.loading')}</Text>
                </View>
              ) : myListings.length === 0 ? (
                <View style={styles.noContacts}>
                  <Ionicons name="home-outline" size={32} color={Colors.neutral[300]} />
                  <Text style={styles.noContactsText}>{t('visits.noListing')}</Text>
                </View>
              ) : (
                <View style={styles.propertyList}>
                  {myListings.map((listing) => (
                    <TouchableOpacity
                      key={listing.id}
                      style={[
                        styles.propertyItem,
                        newVisitForm.listing_id === listing.id && styles.propertyItemSelected,
                      ]}
                      onPress={() => handleListingChange(listing.id)}
                    >
                      {(listing.main_photo_url || listing.photo_principale) ? (
                        <Image
                          source={{ uri: listing.main_photo_url || listing.photo_principale }}
                          style={styles.propertyItemImage}
                        />
                      ) : (
                        <View style={[styles.propertyItemImage, styles.propertyItemImagePlaceholder]}>
                          <Ionicons name="home-outline" size={20} color={Colors.neutral[400]} />
                        </View>
                      )}
                      <View style={styles.propertyItemInfo}>
                        <Text style={styles.propertyItemTitle} numberOfLines={2}>{listing.titre}</Text>
                        <Text style={styles.propertyItemLocation} numberOfLines={1}>
                          {listing.quartier}, {listing.commune}
                        </Text>
                      </View>
                      {newVisitForm.listing_id === listing.id && (
                        <Ionicons name="checkmark-circle" size={22} color={lightTheme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Client Selection */}
            <Text style={styles.sectionTitle}>{t('visits.client')}</Text>
            <View style={styles.formGroup}>
              <View style={styles.clientLabelRow}>
                <Text style={styles.formLabel}>{t('visits.client')} *</Text>
                {newVisitForm.listing_id && (
                  <TouchableOpacity onPress={() => setShowContactsList(!showContactsList)}>
                    <Text style={styles.toggleContactsText}>
                      {showContactsList ? t('visits.enterManually') : t('visits.listingContacts')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Loading contacts */}
              {isLoadingContacts && newVisitForm.listing_id && (
                <View style={styles.loadingContacts}>
                  <ActivityIndicator size="small" color={lightTheme.colors.primary} />
                  <Text style={styles.loadingContactsText}>{t('visits.loadingContacts')}</Text>
                </View>
              )}

              {/* Contacts list */}
              {showContactsList && !isLoadingContacts && newVisitForm.listing_id ? (
                listingContacts.length > 0 ? (
                  <View style={styles.contactsList}>
                    <View style={styles.contactsHeader}>
                      <Ionicons name="chatbubbles-outline" size={14} color={lightTheme.colors.primary} />
                      <Text style={styles.contactsHeaderText}>
                        {t('visits.contactsCount', { count: listingContacts.length })}
                      </Text>
                    </View>
                    {listingContacts.map((contact) => (
                      <TouchableOpacity
                        key={contact.id}
                        style={styles.contactItem}
                        onPress={() => handleSelectContact(contact)}
                      >
                        <View style={styles.contactAvatar}>
                          {contact.photo_profil_url ? (
                            <Image source={{ uri: contact.photo_profil_url }} style={styles.contactAvatarImage} />
                          ) : (
                            <Text style={styles.contactAvatarText}>
                              {contact.nom_complet.charAt(0).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <View style={styles.contactInfo}>
                          <Text style={styles.contactName}>{contact.nom_complet}</Text>
                          <View style={styles.contactMeta}>
                            <Text style={styles.contactPhone}>{contact.telephone || t('visits.noPhone')}</Text>
                            {contact.last_message_at && (
                              <>
                                <Text style={styles.contactMetaDot}>•</Text>
                                <Text style={styles.contactDate}>{formatLastMessageTime(contact.last_message_at)}</Text>
                              </>
                            )}
                          </View>
                          {contact.last_message && (
                            <Text style={styles.contactLastMessage} numberOfLines={1}>
                              "{contact.last_message}"
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noContacts}>
                    <Ionicons name="people-outline" size={32} color={Colors.neutral[300]} />
                    <Text style={styles.noContactsText}>{t('visits.noContactsForListing')}</Text>
                    <TouchableOpacity onPress={() => setShowContactsList(false)}>
                      <Text style={styles.noContactsLink}>{t('visits.enterManually')}</Text>
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                <>
                  <TextInput
                    style={styles.formInput}
                    value={newVisitForm.client_nom}
                    onChangeText={(text) => setNewVisitForm({ ...newVisitForm, client_nom: text })}
                    placeholder={t('visits.namePlaceholder')}
                    placeholderTextColor={Colors.neutral[400]}
                  />
                  <View style={[styles.formGroup, { marginTop: 12 }]}>
                    <Text style={styles.formLabel}>{t('visits.phone')} *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={newVisitForm.client_telephone}
                      onChangeText={(text) => setNewVisitForm({ ...newVisitForm, client_telephone: text })}
                      placeholder="+224 6XX XX XX XX"
                      placeholderTextColor={Colors.neutral[400]}
                      keyboardType="phone-pad"
                    />
                  </View>
                </>
              )}
            </View>

            {/* Date & Time */}
            <Text style={styles.sectionTitle}>{t('visits.dateTime')}</Text>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>{t('visits.date')} *</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={lightTheme.colors.primary} />
                  <Text style={[
                    styles.datePickerText,
                    !newVisitForm.date_visite && styles.datePickerPlaceholder
                  ]}>
                    {newVisitForm.date_visite ? formatDisplayDate(newVisitForm.date_visite) : t('visits.chooseDate')}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>{t('visits.time')} *</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color={lightTheme.colors.primary} />
                  <Text style={[
                    styles.datePickerText,
                    !newVisitForm.heure_visite && styles.datePickerPlaceholder
                  ]}>
                    {newVisitForm.heure_visite || t('visits.chooseTime')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Picker */}
            {showDatePicker && (
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerHeaderText}>{t('visits.chooseDate')}</Text>
                  <TouchableOpacity
                    style={styles.pickerOkButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.pickerOkText}>{t('common.ok')}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  locale="fr-FR"
                  style={styles.picker}
                />
              </View>
            )}

            {/* Time Picker */}
            {showTimePicker && (
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerHeaderText}>{t('visits.selectTime')}</Text>
                  <TouchableOpacity
                    style={styles.pickerOkButton}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={styles.pickerOkText}>{t('common.ok')}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  is24Hour={true}
                  locale="fr-FR"
                  style={styles.picker}
                />
              </View>
            )}

            {/* Quick time buttons */}
            <View style={styles.quickTimeButtons}>
              {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.quickTimeButton,
                    newVisitForm.heure_visite === time && styles.quickTimeButtonSelected,
                  ]}
                  onPress={() => setNewVisitForm({ ...newVisitForm, heure_visite: time })}
                >
                  <Text style={[
                    styles.quickTimeText,
                    newVisitForm.heure_visite === time && styles.quickTimeTextSelected,
                  ]}>{time}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={styles.sectionTitle}>{t('visits.notesOptional')}</Text>
            <View style={styles.formGroup}>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={newVisitForm.notes}
                onChangeText={(text) => setNewVisitForm({ ...newVisitForm, notes: text })}
                placeholder={t('visits.additionalInfo')}
                placeholderTextColor={Colors.neutral[400]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Visit Detail Modal */}
      <Modal
        visible={showVisitDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowVisitDetailModal(false)}
      >
        <View style={styles.detailModalContainer}>
          <View style={styles.detailModalHeader}>
            <TouchableOpacity onPress={() => setShowVisitDetailModal(false)}>
              <Ionicons name="close" size={28} color={Colors.secondary[800]} />
            </TouchableOpacity>
            <Text style={styles.detailModalTitle}>{t('visits.visitDetails')}</Text>
            <View style={{ width: 28 }} />
          </View>

          {selectedVisit && (
            <ScrollView style={styles.detailModalContent} showsVerticalScrollIndicator={false}>
              {/* Listing Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>{t('visits.property')}</Text>
                <TouchableOpacity
                  style={styles.detailListingCard}
                  onPress={() => {
                    setShowVisitDetailModal(false);
                    if (selectedVisit.listing) {
                      router.push(`/listing/${selectedVisit.listing.id}`);
                    }
                  }}
                >
                  {(selectedVisit.listing?.main_photo_url || selectedVisit.listing?.photo_principale) ? (
                    <Image
                      source={{ uri: selectedVisit.listing?.main_photo_url || selectedVisit.listing?.photo_principale }}
                      style={styles.detailListingImage}
                    />
                  ) : (
                    <View style={[styles.detailListingImage, styles.detailListingImagePlaceholder]}>
                      <Ionicons name="home-outline" size={32} color={Colors.neutral[300]} />
                    </View>
                  )}
                  <View style={styles.detailListingInfo}>
                    <Text style={styles.detailListingTitle} numberOfLines={2}>
                      {selectedVisit.listing?.titre || t('visits.listing')}
                    </Text>
                    <View style={styles.detailListingLocation}>
                      <Ionicons name="location-outline" size={14} color={lightTheme.colors.primary} />
                      <Text style={styles.detailListingLocationText}>
                        {selectedVisit.listing?.quartier}, {selectedVisit.listing?.commune}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.neutral[400]} />
                </TouchableOpacity>
              </View>

              {/* Date & Time */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>{t('visits.dateTime')}</Text>
                <View style={styles.detailDateTimeRow}>
                  <View style={styles.detailDateTimeItem}>
                    <Ionicons name="calendar-outline" size={20} color={lightTheme.colors.primary} />
                    <Text style={styles.detailDateTimeText}>
                      {new Date(selectedVisit.date_visite).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.detailDateTimeItem}>
                    <Ionicons name="time-outline" size={20} color={lightTheme.colors.primary} />
                    <Text style={styles.detailDateTimeText}>
                      {selectedVisit.heure_visite.substring(0, 5)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Status */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>{t('common.status') || 'Status'}</Text>
                <View style={[styles.detailStatusBadge, { backgroundColor: getStatusBadge(selectedVisit.statut).color }]}>
                  <Ionicons name={getStatusBadge(selectedVisit.statut).icon as any} size={16} color="#fff" />
                  <Text style={styles.detailStatusText}>{getStatusBadge(selectedVisit.statut).label}</Text>
                </View>
              </View>

              {/* Contact Info - Show owner or visitor depending on who is viewing */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  {user?.id === selectedVisit.proprietaire_id ? t('visits.visitor') : t('visits.owner')}
                </Text>
                <View style={styles.detailContactCard}>
                  <View style={styles.detailContactAvatar}>
                    {(user?.id === selectedVisit.proprietaire_id
                      ? selectedVisit.visiteur?.photo_profil_url
                      : selectedVisit.proprietaire?.photo_profil_url
                    ) ? (
                      <Image
                        source={{
                          uri: user?.id === selectedVisit.proprietaire_id
                            ? selectedVisit.visiteur?.photo_profil_url
                            : selectedVisit.proprietaire?.photo_profil_url
                        }}
                        style={styles.detailContactAvatarImage}
                      />
                    ) : (
                      <Text style={styles.detailContactAvatarText}>
                        {(user?.id === selectedVisit.proprietaire_id
                          ? (selectedVisit.client_nom || selectedVisit.visiteur?.nom_complet || 'V')
                          : (selectedVisit.proprietaire?.nom_complet || 'P')
                        ).charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.detailContactInfo}>
                    <Text style={styles.detailContactName}>
                      {user?.id === selectedVisit.proprietaire_id
                        ? (selectedVisit.client_nom || selectedVisit.visiteur?.nom_complet || t('visits.visitor'))
                        : (selectedVisit.proprietaire?.nom_complet || t('visits.owner'))
                      }
                    </Text>
                    <Text style={styles.detailContactPhone}>
                      {user?.id === selectedVisit.proprietaire_id
                        ? (selectedVisit.client_telephone || selectedVisit.visiteur?.telephone || t('visits.notAvailable'))
                        : (selectedVisit.proprietaire?.telephone || t('visits.notAvailable'))
                      }
                    </Text>
                  </View>
                </View>

                {/* Call and Message buttons */}
                <View style={styles.detailContactActions}>
                  <TouchableOpacity
                    style={styles.detailContactActionBtn}
                    onPress={() => {
                      const phone = user?.id === selectedVisit.proprietaire_id
                        ? (selectedVisit.client_telephone || selectedVisit.visiteur?.telephone)
                        : selectedVisit.proprietaire?.telephone;
                      if (phone) {
                        Linking.openURL(`tel:${phone}`);
                      }
                    }}
                  >
                    <Ionicons name="call-outline" size={20} color="#fff" />
                    <Text style={styles.detailContactActionText}>{t('visits.call')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.detailContactActionBtn, styles.detailContactActionBtnSecondary]}
                    onPress={() => {
                      const phone = user?.id === selectedVisit.proprietaire_id
                        ? (selectedVisit.client_telephone || selectedVisit.visiteur?.telephone)
                        : selectedVisit.proprietaire?.telephone;
                      if (phone) {
                        Linking.openURL(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`);
                      }
                    }}
                  >
                    <Ionicons name="logo-whatsapp" size={20} color={lightTheme.colors.primary} />
                    <Text style={[styles.detailContactActionText, styles.detailContactActionTextSecondary]}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notes */}
              {selectedVisit.notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{t('visits.notes')}</Text>
                  <View style={styles.detailNotesCard}>
                    <Text style={styles.detailNotesText}>{selectedVisit.notes}</Text>
                  </View>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.detailActions}>
                {(selectedVisit.statut === 'EN_ATTENTE' || selectedVisit.statut === 'PENDING') && (
                  <TouchableOpacity
                    style={[styles.detailActionBtn, styles.detailActionBtnConfirm]}
                    onPress={() => {
                      setShowVisitDetailModal(false);
                      handleConfirmVisit(selectedVisit.id);
                    }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.detailActionBtnText}>{t('common.confirm')}</Text>
                  </TouchableOpacity>
                )}
                {(selectedVisit.statut === 'EN_ATTENTE' || selectedVisit.statut === 'PENDING' || selectedVisit.statut === 'CONFIRMEE') && (
                  <TouchableOpacity
                    style={[styles.detailActionBtn, styles.detailActionBtnCancel]}
                    onPress={() => {
                      setShowVisitDetailModal(false);
                      handleCancelVisit(selectedVisit.id);
                    }}
                  >
                    <Ionicons name="close-circle-outline" size={20} color={Colors.warning[600]} />
                    <Text style={[styles.detailActionBtnText, { color: Colors.warning[600] }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                )}
                {user?.id === selectedVisit.proprietaire_id && (
                  <TouchableOpacity
                    style={[styles.detailActionBtn, styles.detailActionBtnDelete]}
                    onPress={() => {
                      setShowVisitDetailModal(false);
                      handleDeleteVisit(selectedVisit.id);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.error[500]} />
                    <Text style={[styles.detailActionBtnText, { color: Colors.error[500] }]}>{t('common.delete')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
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
  visitItem: {
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
  visitImage: {
    height: 120,
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
  visitContent: {
    padding: 14,
  },
  visitTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 6,
  },
  visitLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  visitLocationText: {
    fontSize: 13,
    color: Colors.neutral[500],
    flex: 1,
  },
  visitDateTime: {
    flexDirection: 'row',
    gap: 16,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 14,
    color: Colors.secondary[800],
    fontWeight: '500',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  visitActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    alignItems: 'flex-end',
    gap: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmButton: {
    padding: 8,
    backgroundColor: Colors.success[50],
    borderRadius: 8,
  },
  cancelButton: {
    padding: 8,
    backgroundColor: Colors.warning[50],
    borderRadius: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: Colors.error[50],
    borderRadius: 8,
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
  addButton: {
    padding: 8,
    marginRight: -8,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: lightTheme.colors.primary,
    marginBottom: 12,
    marginTop: 8,
  },
  formGroup: {
    marginBottom: 16,
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
    minHeight: 80,
    paddingTop: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  // Listing selector
  listingSelector: {
    marginHorizontal: -4,
  },
  listingOption: {
    width: 120,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.background.secondary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  listingOptionSelected: {
    borderColor: lightTheme.colors.primary,
  },
  listingOptionImage: {
    width: '100%',
    height: 80,
  },
  listingOptionPlaceholder: {
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingOptionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.secondary[700],
    padding: 8,
  },
  listingOptionCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  noListings: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingVertical: 40,
    marginTop: 20,
  },
  noListingsText: {
    fontSize: 13,
    color: Colors.neutral[400],
    marginTop: 4,
  },
  // Quick time buttons
  quickTimeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickTimeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  quickTimeButtonSelected: {
    backgroundColor: lightTheme.colors.primary,
    borderColor: lightTheme.colors.primary,
  },
  quickTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.secondary[700],
  },
  quickTimeTextSelected: {
    color: '#fff',
  },
  // Dropdown styles
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  dropdownSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  dropdownImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  dropdownImagePlaceholder: {
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownSelectedText: {
    fontSize: 16,
    color: Colors.secondary[800],
    flex: 1,
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: Colors.neutral[400],
  },
  // Client section
  clientLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleContactsText: {
    fontSize: 13,
    color: lightTheme.colors.primary,
    fontWeight: '500',
  },
  loadingContacts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingContactsText: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  // Contacts list
  contactsList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    overflow: 'hidden',
  },
  contactsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: lightTheme.colors.primary + '10',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  contactsHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: lightTheme.colors.primary,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: lightTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  contactAvatarImage: {
    width: '100%',
    height: '100%',
  },
  contactAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  contactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
  contactMetaDot: {
    fontSize: 13,
    color: Colors.neutral[400],
    marginHorizontal: 6,
  },
  contactDate: {
    fontSize: 12,
    color: Colors.neutral[400],
  },
  contactLastMessage: {
    fontSize: 12,
    color: Colors.neutral[400],
    marginTop: 4,
    fontStyle: 'italic',
  },
  noContacts: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
  },
  noContactsText: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: 8,
  },
  noContactsLink: {
    fontSize: 13,
    color: lightTheme.colors.primary,
    marginTop: 8,
    fontWeight: '500',
  },
  // Property picker modal
  pickerModalContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  pickerModalContent: {
    flex: 1,
    padding: 16,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pickerItemSelected: {
    borderColor: lightTheme.colors.primary,
    backgroundColor: lightTheme.colors.primary + '10',
  },
  pickerItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  pickerItemImagePlaceholder: {
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemInfo: {
    flex: 1,
  },
  pickerItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  pickerItemLocation: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 4,
  },
  noListingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[700],
    marginTop: 12,
  },
  // Property list styles
  propertyList: {
    gap: 8,
  },
  propertyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  propertyItemSelected: {
    borderColor: lightTheme.colors.primary,
    backgroundColor: lightTheme.colors.primary + '15',
  },
  propertyItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  propertyItemImagePlaceholder: {
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyItemInfo: {
    flex: 1,
  },
  propertyItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  propertyItemLocation: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  // Date picker styles
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: 10,
  },
  datePickerText: {
    fontSize: 15,
    color: Colors.secondary[800],
    flex: 1,
  },
  datePickerPlaceholder: {
    color: Colors.neutral[400],
  },
  pickerContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  pickerHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  pickerOkButton: {
    backgroundColor: lightTheme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pickerOkText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  picker: {
    height: 150,
  },
  // Detail Modal Styles
  detailModalContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  detailModalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[500],
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailListingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  detailListingImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  detailListingImagePlaceholder: {
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailListingInfo: {
    flex: 1,
  },
  detailListingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginBottom: 6,
  },
  detailListingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailListingLocationText: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
  detailDateTimeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailDateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
  },
  detailDateTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.secondary[800],
    flex: 1,
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  detailStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  detailContactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    gap: 14,
    marginBottom: 12,
  },
  detailContactAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: lightTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  detailContactAvatarImage: {
    width: '100%',
    height: '100%',
  },
  detailContactAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  detailContactInfo: {
    flex: 1,
  },
  detailContactName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginBottom: 4,
  },
  detailContactPhone: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  detailContactActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailContactActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  detailContactActionBtnSecondary: {
    backgroundColor: lightTheme.colors.primary + '15',
  },
  detailContactActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  detailContactActionTextSecondary: {
    color: lightTheme.colors.primary,
  },
  detailNotesCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
  },
  detailNotesText: {
    fontSize: 14,
    color: Colors.secondary[700],
    lineHeight: 22,
  },
  detailActions: {
    gap: 10,
    marginTop: 8,
  },
  detailActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  detailActionBtnConfirm: {
    backgroundColor: Colors.success[500],
    borderColor: Colors.success[500],
  },
  detailActionBtnCancel: {
    backgroundColor: Colors.warning[50],
    borderColor: Colors.warning[100],
  },
  detailActionBtnDelete: {
    backgroundColor: Colors.error[50],
    borderColor: Colors.error[100],
  },
  detailActionBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

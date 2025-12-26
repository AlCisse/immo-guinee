import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  useWindowDimensions,
  Share,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Listing } from '@/types';
import Colors, { lightTheme } from '@/constants/Colors';

const AMENITY_ICONS: Record<string, string> = {
  wifi: 'wifi-outline',
  parking: 'car-outline',
  piscine: 'water-outline',
  climatisation: 'snow-outline',
  gardien: 'shield-checkmark-outline',
  jardin: 'leaf-outline',
  terrasse: 'sunny-outline',
  buanderie: 'shirt-outline',
  ascenseur: 'arrow-up-outline',
  gym: 'barbell-outline',
  balcon: 'expand-outline',
  cuisine: 'restaurant-outline',
  forage: 'water-outline',
  seg_uniquement: 'flash-outline',
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'WiFi',
  parking: 'Parking',
  piscine: 'Piscine',
  climatisation: 'Climatisation',
  gardien: 'Gardien',
  jardin: 'Jardin',
  terrasse: 'Terrasse',
  buanderie: 'Buanderie',
  ascenseur: 'Ascenseur',
  gym: 'Salle de sport',
  balcon: 'Balcon',
  cuisine: 'Cuisine equipee',
  forage: 'Forage',
  seg_uniquement: 'SEG uniquement',
};

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const isTablet = width >= 768;
  const imageHeight = isTablet ? 400 : 300;

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const response = await api.listings.get(id!);
      return response.data?.data?.listing as Listing;
    },
    enabled: !!id,
  });

  const { data: isFavorite, refetch: refetchFavorite } = useQuery({
    queryKey: ['favorite', id],
    queryFn: async () => {
      const response = await api.favorites.check(id!);
      return response.data?.data?.is_favorite || false;
    },
    enabled: !!id && isAuthenticated,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: () => api.favorites.toggle(id!),
    onSuccess: () => {
      refetchFavorite();
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: (error: any) => {
      Alert.alert('Erreur', error?.response?.data?.message || 'Impossible de modifier les favoris');
    },
  });

  // Format phone number for Guinée (+224)
  const formatPhoneForCall = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    // Si le numéro commence par 6 (mobile guinéen), ajouter +224
    if (cleaned.startsWith('6') && cleaned.length === 9) {
      return `+224${cleaned}`;
    }
    // Si déjà avec 224
    if (cleaned.startsWith('224')) {
      return `+${cleaned}`;
    }
    return phone;
  };

  const formatPhoneForWhatsApp = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    // Si le numéro commence par 6 (mobile guinéen), ajouter 224
    if (cleaned.startsWith('6') && cleaned.length === 9) {
      return `224${cleaned}`;
    }
    // Si commence par +, enlever le +
    if (cleaned.startsWith('224')) {
      return cleaned;
    }
    return cleaned;
  };

  const handleCall = () => {
    const phone = listing?.user?.telephone;
    if (!phone) {
      Alert.alert('Erreur', 'Numero de telephone non disponible');
      return;
    }
    const formattedPhone = formatPhoneForCall(phone);
    Linking.openURL(`tel:${formattedPhone}`);
  };

  const handleWhatsApp = () => {
    const phone = listing?.user?.telephone;
    if (!phone) {
      Alert.alert('Erreur', 'Numero de telephone non disponible');
      return;
    }
    const formattedPhone = formatPhoneForWhatsApp(phone);
    const message = encodeURIComponent(`Bonjour, je suis intéressé par votre annonce "${listing?.titre}" sur ImmoGuinée.`);
    Linking.openURL(`https://wa.me/${formattedPhone}?text=${message}`);
  };

  const [isStartingChat, setIsStartingChat] = useState(false);

  const handleMessage = async () => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour envoyer un message', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }

    if (!id || !listing) return;

    // Don't allow messaging your own listing
    if (listing.user?.id === user?.id) {
      Alert.alert('Action impossible', 'Vous ne pouvez pas vous envoyer un message a vous-meme');
      return;
    }

    try {
      setIsStartingChat(true);
      // Start or get existing conversation
      const response = await api.messaging.startConversation({ listing_id: id });
      const conversation = response.data?.data?.conversation;

      if (conversation?.id) {
        router.push(`/chat/${conversation.id}` as any);
      } else {
        Alert.alert('Erreur', 'Impossible de demarrer la conversation');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error?.response?.data?.message || 'Impossible de demarrer la conversation');
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleFavorite = () => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour ajouter aux favoris', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }
    toggleFavoriteMutation.mutate();
  };

  const handleShare = async () => {
    if (!listing) return;

    try {
      const url = `https://immoguinee.com/bien/${listing.id}`;
      const message = `${listing.titre} - ${listing.formatted_price || `${listing.loyer_mensuel?.toLocaleString()} GNF`}\n${listing.quartier}, ${listing.commune}\n\n${url}`;

      await Share.share({
        message,
        url: Platform.OS === 'ios' ? url : undefined,
        title: listing.titre,
      });
    } catch (error) {
      // Share cancelled or failed - no action needed
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightTheme.colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorText}>Annonce non trouvee</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images = listing.photos?.map(p => p.url) || [];
  if (listing.main_photo_url && !images.includes(listing.main_photo_url)) {
    images.unshift(listing.main_photo_url);
  }
  if (listing.photo_principale && !images.includes(listing.photo_principale)) {
    images.unshift(listing.photo_principale);
  }

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M GNF`;
    }
    return `${price.toLocaleString()} GNF`;
  };

  const getPriceLabel = () => {
    if (listing.type_transaction === 'VENTE') return '';
    if (listing.type_transaction === 'LOCATION_COURTE') return '/jour';
    return '/mois';
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header with absolute positioning for better touch handling */}
      <View style={[styles.customHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerRightContainer}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShare}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="share-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleFavorite}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? '#EF4444' : '#fff'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={[styles.imageGallery, { height: imageHeight }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(index);
            }}
          >
            {images.length > 0 ? (
              images.map((img, index) => (
                <Image key={index} source={{ uri: img }} style={[styles.galleryImage, { width, height: imageHeight }]} resizeMode="cover" />
              ))
            ) : (
              <View style={[styles.galleryImage, styles.imagePlaceholder, { width, height: imageHeight }]}>
                <Ionicons name="image-outline" size={64} color={Colors.neutral[300]} />
              </View>
            )}
          </ScrollView>
          {images.length > 1 && (
            <View style={styles.imagePagination}>
              <View style={styles.paginationBg}>
                <Text style={styles.paginationText}>{currentImageIndex + 1} / {images.length}</Text>
              </View>
            </View>
          )}
          <View style={[
            styles.transactionBadge,
            listing.type_transaction === 'VENTE' ? styles.transactionBadgeVente : styles.transactionBadgeLocation,
          ]}>
            <Text style={styles.transactionBadgeText}>
              {listing.type_transaction === 'VENTE'
                ? 'Vente'
                : listing.type_transaction === 'LOCATION_COURTE'
                ? 'Courte duree'
                : 'Location'}
            </Text>
          </View>
        </View>

        <View style={[styles.content, isTablet && styles.contentTablet]}>
          {/* Title & Price */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{listing.titre}</Text>
            <Text style={styles.price}>
              {formatPrice(listing.loyer_mensuel)}
              <Text style={styles.priceLabel}>{getPriceLabel()}</Text>
            </Text>
          </View>

          {/* Location */}
          <View style={styles.locationSection}>
            <View style={styles.locationIcon}>
              <Ionicons name="location" size={18} color={lightTheme.colors.primary} />
            </View>
            <Text style={styles.location}>
              {listing.quartier}, {listing.commune}
            </Text>
          </View>

          {/* Quick Info */}
          <View style={styles.quickInfo}>
            {listing.nombre_chambres ? (
              <View style={styles.quickInfoItem}>
                <View style={styles.quickInfoIcon}>
                  <Ionicons name="bed-outline" size={22} color={lightTheme.colors.primary} />
                </View>
                <Text style={styles.quickInfoValue}>{listing.nombre_chambres}</Text>
                <Text style={styles.quickInfoLabel}>Chambres</Text>
              </View>
            ) : null}
            {listing.nombre_salles_bain ? (
              <View style={styles.quickInfoItem}>
                <View style={styles.quickInfoIcon}>
                  <Ionicons name="water-outline" size={22} color={lightTheme.colors.primary} />
                </View>
                <Text style={styles.quickInfoValue}>{listing.nombre_salles_bain}</Text>
                <Text style={styles.quickInfoLabel}>Salles de bain</Text>
              </View>
            ) : null}
            {listing.surface_m2 ? (
              <View style={styles.quickInfoItem}>
                <View style={styles.quickInfoIcon}>
                  <Ionicons name="resize-outline" size={22} color={lightTheme.colors.primary} />
                </View>
                <Text style={styles.quickInfoValue}>{listing.surface_m2}</Text>
                <Text style={styles.quickInfoLabel}>m²</Text>
              </View>
            ) : null}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Type de bien</Text>
                <Text style={styles.detailValue}>{listing.type_bien}</Text>
              </View>
              {listing.meuble !== undefined && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Meuble</Text>
                  <Text style={styles.detailValue}>{listing.meuble ? 'Oui' : 'Non'}</Text>
                </View>
              )}
              {listing.caution ? (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Caution</Text>
                  <Text style={styles.detailValue}>{formatPrice(listing.caution)}</Text>
                </View>
              ) : null}
              {listing.avance ? (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Avance</Text>
                  <Text style={styles.detailValue}>{listing.avance} mois</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Amenities */}
          {listing.commodites && listing.commodites.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Equipements</Text>
              <View style={styles.amenitiesGrid}>
                {listing.commodites.map((amenity, index) => (
                  <View key={index} style={styles.amenityItem}>
                    <Ionicons
                      name={(AMENITY_ICONS[amenity] || 'checkmark-circle-outline') as any}
                      size={18}
                      color={lightTheme.colors.primary}
                    />
                    <Text style={styles.amenityLabel}>
                      {AMENITY_LABELS[amenity] || amenity}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Owner */}
          {listing.user && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Proprietaire</Text>
              <View style={styles.ownerCard}>
                {listing.user.photo_profil ? (
                  <Image source={{ uri: listing.user.photo_profil }} style={styles.ownerAvatar} />
                ) : (
                  <View style={[styles.ownerAvatar, styles.ownerAvatarPlaceholder]}>
                    <Text style={styles.ownerAvatarText}>
                      {listing.user.nom_complet?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <View style={styles.ownerInfo}>
                  <Text style={styles.ownerName}>{listing.user.nom_complet}</Text>
                  <Text style={styles.ownerType}>
                    {listing.user.type_compte === 'AGENCE'
                      ? 'Agence'
                      : listing.user.type_compte === 'PROFESSIONNEL'
                      ? 'Professionnel'
                      : 'Particulier'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.ownerCallBtn} onPress={handleCall}>
                  <Ionicons name="call" size={20} color={lightTheme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Spacer for bottom buttons */}
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Contact Buttons */}
      <View style={[styles.contactBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={styles.callButton} onPress={handleCall} activeOpacity={0.8}>
          <Ionicons name="call" size={20} color="#fff" />
          <Text style={styles.callButtonText}>Appeler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.messageButton}
          onPress={handleMessage}
          activeOpacity={0.8}
          disabled={isStartingChat}
        >
          {isStartingChat ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="chatbubble" size={20} color="#fff" />
              <Text style={styles.messageButtonText}>Messages</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: lightTheme.colors.primary,
    borderRadius: 14,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  customHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 100,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  imageGallery: {
    position: 'relative',
  },
  galleryImage: {
    // resizeMode is set on Image component directly
  },
  imagePlaceholder: {
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePagination: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  paginationBg: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  paginationText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  transactionBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  transactionBadgeLocation: {
    backgroundColor: lightTheme.colors.primary,
  },
  transactionBadgeVente: {
    backgroundColor: Colors.secondary[500],
  },
  transactionBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  contentTablet: {
    paddingHorizontal: 32,
  },
  titleSection: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 10,
    lineHeight: 32,
  },
  price: {
    fontSize: 26,
    fontWeight: '800',
    color: lightTheme.colors.primary,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.neutral[500],
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  location: {
    fontSize: 16,
    color: Colors.neutral[600],
    flex: 1,
  },
  quickInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 28,
  },
  quickInfoItem: {
    alignItems: 'center',
  },
  quickInfoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickInfoValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  quickInfoLabel: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 14,
  },
  description: {
    fontSize: 15,
    color: Colors.neutral[600],
    lineHeight: 24,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    width: '45%',
    backgroundColor: Colors.background.secondary,
    padding: 14,
    borderRadius: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary[50],
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  amenityLabel: {
    fontSize: 14,
    color: Colors.secondary[800],
    fontWeight: '500',
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 16,
  },
  ownerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  ownerAvatarPlaceholder: {
    backgroundColor: lightTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerAvatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  ownerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  ownerName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  ownerType: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  ownerCallBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 15,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: lightTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.success[500],
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: Colors.success[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

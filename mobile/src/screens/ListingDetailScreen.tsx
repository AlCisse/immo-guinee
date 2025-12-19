import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS } from '../constants/config';
import { Listing, RootStackParamList } from '../types';
import { getListing, recordListingView, getSimilarListings } from '../services/listings';
import { useFavoritesStore } from '../store/favoritesStore';
import { useAuthStore } from '../store/authStore';
import {
  formatPriceWithPeriod,
  formatSurface,
  formatDate,
  getPropertyTypeLabel,
  getTransactionTypeLabel,
  formatPhoneNumber,
} from '../utils/format';
import ListingCard from '../components/ListingCard';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DetailRouteProp = RouteProp<RootStackParamList, 'ListingDetail'>;

const ListingDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetailRouteProp>();
  const { id } = route.params;

  const { isAuthenticated } = useAuthStore();
  const { isFavorite, toggleFavoriteOptimistic } = useFavoritesStore();

  const [listing, setListing] = useState<Listing | null>(null);
  const [similarListings, setSimilarListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    fetchListing();
  }, [id]);

  const fetchListing = async () => {
    setIsLoading(true);
    try {
      const [data, similar] = await Promise.all([
        getListing(id),
        getSimilarListings(id, 4),
      ]);
      setListing(data);
      setSimilarListings(similar);

      // Record view
      recordListingView(id).catch(() => {});
    } catch (error) {
      console.error('Error fetching listing:', error);
      Alert.alert('Erreur', 'Impossible de charger cette annonce');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour ajouter aux favoris');
      return;
    }
    try {
      await toggleFavoriteOptimistic(id);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
    }
  };

  const handleCall = () => {
    if (!listing?.user?.telephone) return;
    Linking.openURL(`tel:${listing.user.telephone}`);
  };

  const handleWhatsApp = () => {
    if (!listing?.user?.telephone) return;
    const phone = listing.user.telephone.replace(/\D/g, '');
    const message = `Bonjour, je suis intéressé par votre annonce "${listing.titre}" sur ImmoGuinée.`;
    Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`);
  };

  const handleMessage = () => {
    // Navigate to chat - implementation depends on your chat flow
    Alert.alert('À venir', 'La messagerie sera bientôt disponible');
  };

  const handleVisit = () => {
    navigation.navigate('VisitBooking', { listingId: id });
  };

  if (isLoading || !listing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  const images = listing.medias?.filter((m) => m.type === 'IMAGE') || [];
  const favorite = isFavorite(listing.id);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {images.length > 0 ? (
              images.map((media, index) => (
                <Image
                  key={media.id}
                  source={{ uri: media.url }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ))
            ) : (
              <View style={[styles.image, styles.noImage]}>
                <Text style={styles.noImageText}>Pas d'image</Text>
              </View>
            )}
          </ScrollView>

          {/* Image Indicators */}
          {images.length > 1 && (
            <View style={styles.imageIndicators}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === activeImageIndex && styles.indicatorActive,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Badges */}
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {getTransactionTypeLabel(listing.type_transaction)}
              </Text>
            </View>
            {listing.certifie && (
              <View style={[styles.badge, styles.certifiedBadge]}>
                <Text style={styles.badgeText}>✓ Certifié</Text>
              </View>
            )}
          </View>

          {/* Favorite Button */}
          <TouchableOpacity style={styles.favoriteButton} onPress={handleFavorite}>
            <Text style={styles.favoriteIcon}>{favorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Price & Title */}
          <Text style={styles.price}>
            {formatPriceWithPeriod(listing.prix, listing.prix_periode)}
          </Text>
          <Text style={styles.title}>{listing.titre}</Text>
          <Text style={styles.location}>
            📍 {listing.adresse}
            {listing.quartier && `, ${listing.quartier}`}
            {listing.commune && `, ${listing.commune}`}, {listing.ville}
          </Text>

          {/* Quick Info */}
          <View style={styles.quickInfo}>
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoValue}>{formatSurface(listing.surface)}</Text>
              <Text style={styles.quickInfoLabel}>Surface</Text>
            </View>
            {listing.nb_chambres && (
              <View style={styles.quickInfoItem}>
                <Text style={styles.quickInfoValue}>{listing.nb_chambres}</Text>
                <Text style={styles.quickInfoLabel}>Chambres</Text>
              </View>
            )}
            {listing.nb_salles_bain && (
              <View style={styles.quickInfoItem}>
                <Text style={styles.quickInfoValue}>{listing.nb_salles_bain}</Text>
                <Text style={styles.quickInfoLabel}>SdB</Text>
              </View>
            )}
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoValue}>{getPropertyTypeLabel(listing.type_bien)}</Text>
              <Text style={styles.quickInfoLabel}>Type</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>

          {/* Amenities */}
          {listing.amenities && listing.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Équipements</Text>
              <View style={styles.amenitiesContainer}>
                {listing.amenities.map((amenity) => (
                  <View key={amenity.id} style={styles.amenityChip}>
                    <Text style={styles.amenityText}>{amenity.nom}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type de bien</Text>
                <Text style={styles.detailValue}>
                  {getPropertyTypeLabel(listing.type_bien)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction</Text>
                <Text style={styles.detailValue}>
                  {listing.type_transaction === 'VENTE' ? 'Vente' : 'Location'}
                </Text>
              </View>
              {listing.meuble !== null && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Meublé</Text>
                  <Text style={styles.detailValue}>
                    {listing.meuble ? 'Oui' : 'Non'}
                  </Text>
                </View>
              )}
              {listing.annee_construction && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Année de construction</Text>
                  <Text style={styles.detailValue}>{listing.annee_construction}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Publié le</Text>
                <Text style={styles.detailValue}>{formatDate(listing.created_at)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vues</Text>
                <Text style={styles.detailValue}>{listing.vues}</Text>
              </View>
            </View>
          </View>

          {/* Owner Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Annonceur</Text>
            <View style={styles.ownerCard}>
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerInitial}>
                  {listing.user.prenom?.charAt(0) || listing.user.nom?.charAt(0) || '?'}
                </Text>
              </View>
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>
                  {listing.user.prenom} {listing.user.nom}
                </Text>
                <Text style={styles.ownerRole}>{listing.user.role}</Text>
              </View>
            </View>
          </View>

          {/* Similar Listings */}
          {similarListings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Annonces similaires</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.similarContainer}
              >
                {similarListings.map((item) => (
                  <View key={item.id} style={styles.similarCard}>
                    <ListingCard
                      listing={item}
                      onPress={() =>
                        navigation.push('ListingDetail', { id: item.id })
                      }
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <SafeAreaView edges={['bottom']} style={styles.bottomActions}>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <Text style={styles.actionIcon}>📞</Text>
            <Text style={styles.actionText}>Appeler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction]}
            onPress={handleVisit}
          >
            <Text style={styles.primaryActionText}>Réserver une visite</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: width,
    height: 280,
    backgroundColor: COLORS.gray[200],
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: COLORS.gray[400],
    fontSize: 16,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  certifiedBadge: {
    backgroundColor: COLORS.success,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    fontSize: 20,
  },
  content: {
    padding: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary[600],
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    color: COLORS.gray[600],
    marginBottom: 16,
    lineHeight: 20,
  },
  quickInfo: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  quickInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  quickInfoLabel: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: COLORS.gray[700],
    lineHeight: 22,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  amenityText: {
    fontSize: 13,
    color: COLORS.gray[700],
  },
  detailsGrid: {},
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.gray[500],
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.gray[900],
    fontWeight: '500',
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    padding: 12,
    borderRadius: 12,
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ownerInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  ownerInfo: {},
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  ownerRole: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  similarContainer: {
    gap: 12,
  },
  similarCard: {
    marginRight: 12,
  },
  bottomActions: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.gray[100],
    gap: 6,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionText: {
    fontSize: 13,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  primaryAction: {
    flex: 2,
    backgroundColor: COLORS.primary[500],
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ListingDetailScreen;

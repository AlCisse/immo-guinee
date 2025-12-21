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
  useWindowDimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Listing } from '@/types';
import Colors, { lightTheme } from '@/constants/Colors';

const PROPERTY_TYPES = [
  { value: '', label: 'Tous', icon: 'grid-outline' },
  { value: 'APPARTEMENT', label: 'Appartement', icon: 'business-outline' },
  { value: 'MAISON', label: 'Maison', icon: 'home-outline' },
  { value: 'VILLA', label: 'Villa', icon: 'home-outline' },
  { value: 'STUDIO', label: 'Studio', icon: 'bed-outline' },
  { value: 'TERRAIN', label: 'Terrain', icon: 'map-outline' },
  { value: 'BUREAU', label: 'Bureau', icon: 'briefcase-outline' },
];

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { width, height } = useWindowDimensions();
  const [selectedType, setSelectedType] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Responsive breakpoints
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;
  const numColumns = isLargeTablet ? 3 : isTablet ? 2 : 1;
  const horizontalPadding = isTablet ? 24 : 16;
  const cardGap = isTablet ? 16 : 12;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['listings', 'home', selectedType],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 20 };
      if (selectedType) params.type_bien = selectedType;
      const response = await api.listings.list(params);
      return response.data?.data?.listings || [];
    },
  });

  const listings = data || [];

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: (listingId: string) => api.favorites.toggle(listingId),
    onSuccess: (response, listingId) => {
      const isFav = response.data?.data?.is_favorite;
      setFavorites(prev => {
        const next = new Set(prev);
        if (isFav) {
          next.add(listingId);
        } else {
          next.delete(listingId);
        }
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: (error: any) => {
      console.error('Toggle favorite error:', error?.response?.data || error?.message);
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
    },
  });

  const handleToggleFavorite = (listingId: string) => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour ajouter aux favoris', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }
    toggleFavoriteMutation.mutate(listingId);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatPrice = (listing: Listing) => {
    const price = listing.loyer_mensuel;
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M GNF`;
    }
    return `${price.toLocaleString()} GNF`;
  };

  const getPriceLabel = (listing: Listing) => {
    if (listing.type_transaction === 'VENTE') return '';
    if (listing.type_transaction === 'LOCATION_COURTE') return '/jour';
    return '/mois';
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'VENTE': return 'Vente';
      case 'LOCATION_COURTE': return 'Courte durée';
      default: return 'Location';
    }
  };

  const renderListingCard = ({ item, index }: { item: Listing; index: number }) => {
    const imageUrl = item.main_photo_url || item.photo_principale || item.photos?.[0]?.url;
    const cardWidth = numColumns === 1
      ? width - (horizontalPadding * 2)
      : (width - (horizontalPadding * 2) - (cardGap * (numColumns - 1))) / numColumns;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            width: numColumns === 1 ? '100%' : cardWidth,
            marginRight: numColumns > 1 && (index + 1) % numColumns !== 0 ? cardGap : 0,
          }
        ]}
        onPress={() => router.push(`/listing/${item.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={48} color={Colors.neutral[300]} />
            </View>
          )}
          {/* Transaction Badge */}
          <View style={[
            styles.badge,
            item.type_transaction === 'VENTE' ? styles.badgeVente : styles.badgeLocation
          ]}>
            <Text style={styles.badgeText}>{getTransactionLabel(item.type_transaction)}</Text>
          </View>
          {/* Favorite button */}
          <TouchableOpacity
            style={styles.favoriteBtn}
            activeOpacity={0.8}
            onPress={(e) => {
              e.stopPropagation();
              handleToggleFavorite(item.id);
            }}
          >
            <Ionicons
              name={favorites.has(item.id) ? 'heart' : 'heart-outline'}
              size={20}
              color={favorites.has(item.id) ? '#EF4444' : '#fff'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={1}>{item.titre}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={lightTheme.colors.primary} />
            <Text style={styles.location} numberOfLines={1}>
              {item.quartier}, {item.commune}
            </Text>
          </View>

          <View style={styles.detailsRow}>
            {item.nombre_chambres ? (
              <View style={styles.detail}>
                <Ionicons name="bed-outline" size={16} color={Colors.neutral[500]} />
                <Text style={styles.detailText}>{item.nombre_chambres}</Text>
              </View>
            ) : null}
            {item.surface_m2 ? (
              <View style={styles.detail}>
                <Ionicons name="resize-outline" size={16} color={Colors.neutral[500]} />
                <Text style={styles.detailText}>{item.surface_m2} m²</Text>
              </View>
            ) : null}
            {item.meuble ? (
              <View style={styles.detailChip}>
                <Text style={styles.detailChipText}>Meublé</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {formatPrice(item)}
              <Text style={styles.priceLabel}>{getPriceLabel(item)}</Text>
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <View>
          <Text style={styles.greeting}>Bienvenue sur</Text>
          <Text style={styles.logo}>
            <Text style={styles.logoImmo}>Immo</Text>
            <Text style={styles.logoGuinee}>Guinée</Text>
          </Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
          <Ionicons name="notifications-outline" size={24} color={Colors.secondary[800]} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TouchableOpacity
        style={[styles.searchBar, { marginHorizontal: horizontalPadding }]}
        onPress={() => router.push('/search')}
        activeOpacity={0.8}
      >
        <View style={styles.searchIcon}>
          <Ionicons name="search" size={20} color={lightTheme.colors.primary} />
        </View>
        <Text style={styles.searchPlaceholder}>Rechercher un bien immobilier...</Text>
        <View style={styles.filterIcon}>
          <Ionicons name="options-outline" size={18} color={Colors.neutral[500]} />
        </View>
      </TouchableOpacity>

      {/* Property Types Filter - Scrollable */}
      <View style={styles.typesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.typesContainer, { paddingHorizontal: horizontalPadding }]}
        >
          {PROPERTY_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeButton,
                selectedType === type.value && styles.typeButtonActive,
              ]}
              onPress={() => setSelectedType(type.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={type.icon as any}
                size={18}
                color={selectedType === type.value ? '#fff' : Colors.neutral[600]}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  selectedType === type.value && styles.typeButtonTextActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Section Title */}
      <View style={[styles.sectionHeader, { paddingHorizontal: horizontalPadding }]}>
        <Text style={styles.sectionTitle}>Annonces récentes</Text>
        <TouchableOpacity onPress={() => router.push('/search')}>
          <Text style={styles.seeAllText}>Voir tout</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightTheme.colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          key={numColumns}
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderListingCard}
          numColumns={numColumns}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
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
              <Text style={styles.emptyTitle}>Aucune annonce</Text>
              <Text style={styles.emptyText}>
                Aucune annonce disponible pour le moment
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: Colors.background.primary,
  },
  greeting: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginBottom: 2,
  },
  logo: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoImmo: {
    color: Colors.secondary[800],
  },
  logoGuinee: {
    color: lightTheme.colors.primary,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: Colors.neutral[400],
  },
  filterIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  typesSection: {
    backgroundColor: Colors.background.primary,
    paddingBottom: 16,
    marginBottom: 8,
  },
  typesContainer: {
    gap: 10,
    paddingVertical: 4,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: Colors.background.primary,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: lightTheme.colors.primary,
    borderColor: lightTheme.colors.primary,
  },
  typeButtonText: {
    fontSize: 13,
    color: Colors.neutral[600],
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: Colors.background.secondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.colors.primary,
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
    paddingBottom: 100,
  },
  columnWrapper: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeLocation: {
    backgroundColor: lightTheme.colors.primary,
  },
  badgeVente: {
    backgroundColor: Colors.secondary[500],
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  location: {
    fontSize: 13,
    color: Colors.neutral[500],
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: Colors.neutral[600],
    fontWeight: '500',
  },
  detailChip: {
    backgroundColor: Colors.success[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailChipText: {
    fontSize: 11,
    color: Colors.success[700],
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: lightTheme.colors.primary,
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.neutral[500],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  emptyText: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
});

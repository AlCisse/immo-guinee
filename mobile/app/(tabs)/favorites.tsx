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
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import Colors, { lightTheme } from '@/constants/Colors';

export default function FavoritesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? 24 : 16;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const response = await api.favorites.list();
      return response.data?.data?.favorites || [];
    },
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: (listingId: string) => api.favorites.remove(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: () => {
      Alert.alert('Erreur', 'Impossible de retirer le favori');
    },
  });

  const favorites = data || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleRemoveFavorite = (listingId: string) => {
    Alert.alert(
      'Retirer des favoris',
      'Voulez-vous retirer cette annonce de vos favoris ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => removeMutation.mutate(listingId),
        },
      ]
    );
  };

  const formatPrice = (price: number, type: string) => {
    const formatted = price >= 1000000
      ? `${(price / 1000000).toFixed(1)}M`
      : `${(price / 1000).toFixed(0)}K`;
    const suffix = type === 'VENTE' ? '' : type === 'LOCATION_COURTE' ? '/jour' : '/mois';
    return `${formatted} GNF${suffix}`;
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          <Text style={styles.headerTitle}>Favoris</Text>
        </View>
        <View style={styles.authRequired}>
          <View style={styles.authIconContainer}>
            <Ionicons name="heart-outline" size={48} color={lightTheme.colors.primary} />
          </View>
          <Text style={styles.authTitle}>Connectez-vous</Text>
          <Text style={styles.authText}>
            Connectez-vous pour voir et gerer vos favoris
          </Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.authButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleImageError = (listingId: string) => {
    setFailedImages(prev => new Set(prev).add(listingId));
  };

  const renderFavoriteItem = ({ item }: { item: any }) => {
    // L'API retourne directement le listing, pas item.listing
    const listing = item;
    if (!listing) return null;

    // Try multiple possible photo fields
    const imageUrl =
      listing.photo_principale ||
      listing.main_photo_url ||
      listing.listing_photos?.[0]?.medium_url ||
      listing.listing_photos?.[0]?.url ||
      listing.photos?.[0]?.medium_url ||
      listing.photos?.[0]?.url ||
      null;

    const showPlaceholder = !imageUrl || failedImages.has(listing.id);

    return (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => router.push(`/listing/${listing.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.listItemImage}>
          {showPlaceholder ? (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="image-outline" size={24} color={Colors.neutral[300]} />
            </View>
          ) : (
            <Image
              source={{ uri: imageUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
              onError={() => handleImageError(listing.id)}
            />
          )}
        </View>
        <View style={styles.listItemContent}>
          <Text style={styles.listItemTitle} numberOfLines={1}>{listing.titre}</Text>
          <View style={styles.listItemLocation}>
            <Ionicons name="location-outline" size={12} color={lightTheme.colors.primary} />
            <Text style={styles.listItemLocationText} numberOfLines={1}>
              {listing.quartier}, {listing.commune}
            </Text>
          </View>
          <Text style={styles.listItemPrice}>
            {formatPrice(listing.prix || listing.loyer_mensuel, listing.type_transaction)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFavorite(listing.id)}
        >
          <Ionicons name="heart" size={24} color="#EF4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <Text style={styles.headerTitle}>Favoris</Text>
        <View style={styles.headerCountBadge}>
          <Text style={styles.headerCount}>{favorites.length}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightTheme.colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderFavoriteItem}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
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
              <View style={styles.emptyIconContainer}>
                <Ionicons name="heart-outline" size={48} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Aucun favori</Text>
              <Text style={styles.emptyText}>
                Ajoutez des annonces a vos favoris pour les retrouver facilement
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.push('/search')}
                activeOpacity={0.8}
              >
                <Ionicons name="search-outline" size={18} color="#fff" />
                <Text style={styles.browseButtonText}>Parcourir les annonces</Text>
              </TouchableOpacity>
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
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    gap: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.secondary[800],
    letterSpacing: -0.5,
  },
  headerCountBadge: {
    backgroundColor: lightTheme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
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
    paddingVertical: 16,
  },
  listItem: {
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
  listItemImage: {
    width: 110,
    height: 110,
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
  listItemContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 6,
  },
  listItemLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  listItemLocationText: {
    fontSize: 13,
    color: Colors.neutral[500],
    flex: 1,
  },
  listItemPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: lightTheme.colors.primary,
  },
  removeButton: {
    padding: 14,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  emptyText: {
    fontSize: 15,
    color: Colors.neutral[500],
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  browseButton: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: lightTheme.colors.primary,
    borderRadius: 14,
    shadowColor: lightTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  authRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  authIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  authText: {
    fontSize: 15,
    color: Colors.neutral[500],
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  authButton: {
    marginTop: 28,
    paddingHorizontal: 40,
    paddingVertical: 16,
    backgroundColor: lightTheme.colors.primary,
    borderRadius: 14,
    shadowColor: lightTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

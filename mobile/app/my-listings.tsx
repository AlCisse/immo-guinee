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
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Listing } from '@/types';
import Colors, { lightTheme } from '@/constants/Colors';

export default function MyListingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-listings'],
    queryFn: async () => {
      const response = await api.listings.my();
      return response.data?.data?.listings || [];
    },
    enabled: isAuthenticated,
  });

  const listings = data || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatPrice = (listing: Listing) => {
    const price = listing.loyer_mensuel || 0;
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M GNF`;
    }
    return `${price?.toLocaleString()} GNF`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLIE':
        return { label: 'Publie', color: Colors.success[500] };
      case 'EN_ATTENTE':
        return { label: 'En attente', color: Colors.warning[500] };
      case 'ARCHIVE':
        return { label: 'Archive', color: Colors.neutral[500] };
      case 'BROUILLON':
        return { label: 'Brouillon', color: Colors.neutral[400] };
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
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create-outline" size={20} color={lightTheme.colors.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Mes annonces',
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
            <Text style={styles.loadingText}>Chargement...</Text>
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
                <Text style={styles.emptyTitle}>Aucune annonce</Text>
                <Text style={styles.emptyText}>
                  Vous n'avez pas encore publie d'annonce
                </Text>
              </View>
            }
          />
        )}
      </View>
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
  editButton: {
    padding: 14,
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
});

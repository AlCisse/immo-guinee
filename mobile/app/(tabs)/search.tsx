import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Listing, ListingFilters } from '@/types';
import Colors, { lightTheme } from '@/constants/Colors';
import { formatPrice as formatPriceUtil } from '@/lib/utils/formatPrice';

const PROPERTY_TYPES = [
  { value: '', label: 'Tous' },
  { value: 'APPARTEMENT', label: 'Appartement' },
  { value: 'MAISON', label: 'Maison' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'STUDIO', label: 'Studio' },
  { value: 'TERRAIN', label: 'Terrain' },
  { value: 'BUREAU', label: 'Bureau' },
  { value: 'COMMERCIAL', label: 'Commercial' },
];

const TRANSACTION_TYPES = [
  { value: '', label: 'Tous' },
  { value: 'LOCATION', label: 'Location' },
  { value: 'LOCATION_COURTE', label: 'Courte durée' },
  { value: 'VENTE', label: 'Vente' },
];

export default function SearchScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ListingFilters>({});

  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? 24 : 16;
  const numColumns = isTablet ? 2 : 1;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['listings', 'search', searchQuery, filters],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 50 };
      if (searchQuery) params.q = searchQuery;
      if (filters.type_bien) params.type_bien = filters.type_bien;
      if (filters.type_transaction) params.type_transaction = filters.type_transaction;
      if (filters.commune) params.commune = filters.commune;
      if (filters.prix_min) params.prix_min = filters.prix_min;
      if (filters.prix_max) params.prix_max = filters.prix_max;
      if (filters.chambres_min) params.chambres_min = filters.chambres_min;
      if (filters.meuble !== undefined) params.meuble = filters.meuble ? '1' : '0';

      try {
        // Use search endpoint for text search support
        const response = await api.listings.search(params);
        return response.data?.data?.listings || [];
      } catch (err: any) {
        if (__DEV__) console.error('Search API error:', err?.response?.data || err?.message || err);
        throw err;
      }
    },
  });

  const listings = data || [];

  const formatPrice = (listing: Listing) => {
    return formatPriceUtil(listing.loyer_mensuel, { showCurrency: false });
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const renderListingItem = ({ item, index }: { item: Listing; index: number }) => {
    const imageUrl = item.main_photo_url || item.photo_principale || item.photos?.[0]?.url;
    const cardWidth = numColumns === 1
      ? width - (horizontalPadding * 2)
      : (width - (horizontalPadding * 2) - 12) / 2;

    return (
      <TouchableOpacity
        style={[
          styles.listItem,
          numColumns > 1 && {
            width: cardWidth,
            marginRight: index % 2 === 0 ? 12 : 0,
          }
        ]}
        onPress={() => router.push(`/listing/${item.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.listItemImage}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="image-outline" size={24} color={Colors.neutral[300]} />
            </View>
          )}
          <View style={[
            styles.typeBadge,
            item.type_transaction === 'VENTE' ? styles.badgeVente : styles.badgeLocation
          ]}>
            <Text style={styles.typeBadgeText}>
              {item.type_transaction === 'VENTE' ? 'Vente' : 'Location'}
            </Text>
          </View>
        </View>
        <View style={styles.listItemContent}>
          <Text style={styles.listItemTitle} numberOfLines={1}>{item.titre}</Text>
          <View style={styles.listItemLocation}>
            <Ionicons name="location-outline" size={12} color={lightTheme.colors.primary} />
            <Text style={styles.listItemLocationText} numberOfLines={1}>
              {item.quartier}, {item.commune}
            </Text>
          </View>
          <View style={styles.listItemDetails}>
            {item.nombre_chambres ? (
              <View style={styles.detailItem}>
                <Ionicons name="bed-outline" size={14} color={Colors.neutral[500]} />
                <Text style={styles.detailText}>{item.nombre_chambres}</Text>
              </View>
            ) : null}
            {item.nombre_salles_bain ? (
              <View style={styles.detailItem}>
                <Ionicons name="water-outline" size={14} color={Colors.neutral[500]} />
                <Text style={styles.detailText}>{item.nombre_salles_bain}</Text>
              </View>
            ) : null}
            {item.commodites?.includes('cuisine') ? (
              <View style={styles.detailItem}>
                <Ionicons name="restaurant-outline" size={14} color={Colors.neutral[500]} />
                <Text style={styles.detailText}>1</Text>
              </View>
            ) : null}
            {item.commodites?.includes('balcon') ? (
              <View style={styles.detailItem}>
                <Ionicons name="expand-outline" size={14} color={Colors.neutral[500]} />
                <Text style={styles.detailText}>1</Text>
              </View>
            ) : null}
            {item.surface_m2 ? (
              <View style={styles.detailItem}>
                <Ionicons name="resize-outline" size={14} color={Colors.neutral[500]} />
                <Text style={styles.detailText}>{item.surface_m2} m²</Text>
              </View>
            ) : null}
          </View>
          <Text style={[
            styles.listItemPrice,
            { color: item.type_transaction === 'VENTE' ? lightTheme.colors.primary : Colors.accent[500] }
          ]}>
            {formatPrice(item)} GNF
            <Text style={styles.listItemPriceLabel}>
              {item.type_transaction === 'VENTE' ? '' :
               item.type_transaction === 'LOCATION_COURTE' ? '/jour' : '/mois'}
            </Text>
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={lightTheme.colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par quartier, commune..."
            placeholderTextColor={Colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.neutral[400]} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons
            name="options-outline"
            size={22}
            color={activeFiltersCount > 0 ? '#fff' : Colors.secondary[800]}
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      <View style={[styles.resultsHeader, { paddingHorizontal: horizontalPadding }]}>
        <Text style={styles.resultsCount}>
          {listings.length} résultat{listings.length > 1 ? 's' : ''}
        </Text>
        {activeFiltersCount > 0 && (
          <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
            <Ionicons name="close" size={14} color={lightTheme.colors.primary} />
            <Text style={styles.clearFilters}>Effacer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightTheme.colors.primary} />
          <Text style={styles.loadingText}>Recherche en cours...</Text>
        </View>
      ) : isError ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={Colors.error[400]} />
          <Text style={styles.emptyTitle}>Erreur de connexion</Text>
          <Text style={styles.emptyText}>
            Impossible de charger les résultats
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          key={numColumns}
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderListingItem}
          numColumns={numColumns}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color={Colors.neutral[300]} />
              <Text style={styles.emptyTitle}>Aucun résultat</Text>
              <Text style={styles.emptyText}>
                Essayez de modifier vos critères de recherche
              </Text>
            </View>
          }
        />
      )}

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowFilters(false)}
            >
              <Ionicons name="close" size={24} color={Colors.secondary[800]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Type de bien */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Type de bien</Text>
              <View style={styles.filterOptions}>
                {PROPERTY_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.filterOption,
                      filters.type_bien === type.value && styles.filterOptionActive,
                    ]}
                    onPress={() => setFilters({ ...filters, type_bien: type.value || undefined })}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.type_bien === type.value && styles.filterOptionTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Type de transaction */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Type de transaction</Text>
              <View style={styles.filterOptions}>
                {TRANSACTION_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.filterOption,
                      filters.type_transaction === type.value && styles.filterOptionActive,
                    ]}
                    onPress={() => setFilters({ ...filters, type_transaction: type.value || undefined })}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.type_transaction === type.value && styles.filterOptionTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Chambres */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Chambres minimum</Text>
              <View style={styles.filterOptions}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.filterOption,
                      styles.filterOptionSmall,
                      filters.chambres_min === num && styles.filterOptionActive,
                    ]}
                    onPress={() => setFilters({
                      ...filters,
                      chambres_min: filters.chambres_min === num ? undefined : num
                    })}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.chambres_min === num && styles.filterOptionTextActive,
                      ]}
                    >
                      {num}+
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Meublé */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Meublé</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filters.meuble === undefined && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilters({ ...filters, meuble: undefined })}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.meuble === undefined && styles.filterOptionTextActive,
                    ]}
                  >
                    Tous
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filters.meuble === true && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilters({ ...filters, meuble: true })}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.meuble === true && styles.filterOptionTextActive,
                    ]}
                  >
                    Oui
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filters.meuble === false && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilters({ ...filters, meuble: false })}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.meuble === false && styles.filterOptionTextActive,
                    ]}
                  >
                    Non
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setFilters({})}
            >
              <Text style={styles.clearButtonText}>Effacer tout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>
                Appliquer ({listings.length})
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
    paddingVertical: 12,
    gap: 12,
    backgroundColor: Colors.background.primary,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.secondary[800],
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: lightTheme.colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error[500],
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  resultsCount: {
    fontSize: 14,
    color: Colors.neutral[600],
    fontWeight: '500',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearFilters: {
    fontSize: 14,
    color: lightTheme.colors.primary,
    fontWeight: '600',
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
    paddingTop: 16,
    paddingBottom: 100,
  },
  columnWrapper: {
    marginBottom: 12,
  },
  listItem: {
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
    height: 140,
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
  typeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeLocation: {
    backgroundColor: Colors.accent[500],
  },
  badgeVente: {
    backgroundColor: lightTheme.colors.primary,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  listItemContent: {
    padding: 14,
  },
  listItemTitle: {
    fontSize: 15,
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
    fontSize: 12,
    color: Colors.neutral[500],
    flex: 1,
  },
  listItemDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.neutral[600],
  },
  listItemPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: lightTheme.colors.primary,
  },
  listItemPriceLabel: {
    fontSize: 12,
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
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: lightTheme.colors.primary,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 28,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginBottom: 14,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterOption: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.neutral[100],
  },
  filterOptionSmall: {
    paddingHorizontal: 20,
  },
  filterOptionActive: {
    backgroundColor: lightTheme.colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    color: Colors.secondary[800],
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  applyButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: lightTheme.colors.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, PROPERTY_TYPES, REGIONS, TRANSACTION_TYPES } from '../constants/config';
import { Listing, SearchFilters, RootStackParamList } from '../types';
import { getListings, searchListings } from '../services/listings';
import ListingCard from '../components/ListingCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type SearchRouteProp = RouteProp<RootStackParamList, 'Search'>;

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SearchRouteProp>();
  const initialFilters = route.params?.filters || {};

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchListings = useCallback(async (resetPage = false) => {
    const currentPage = resetPage ? 1 : page;

    if (!resetPage && !hasMore) return;

    setIsLoading(true);
    try {
      const response = searchQuery
        ? await searchListings(searchQuery, filters, currentPage)
        : await getListings({ ...filters, page: currentPage, limit: 20 });

      if (resetPage) {
        setListings(response.data);
      } else {
        setListings((prev) => [...prev, ...response.data]);
      }

      setHasMore(response.meta.current_page < response.meta.last_page);
      if (resetPage) setPage(1);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filters, page, hasMore]);

  useEffect(() => {
    fetchListings(true);
  }, [filters]);

  const handleSearch = () => {
    fetchListings(true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      setPage((p) => p + 1);
      fetchListings();
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === prev[key] ? undefined : value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const activeFiltersCount = Object.values(filters).filter((v) => v !== undefined).length;

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor={COLORS.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.filterIcon}>⚙️</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickFilters}
      >
        <TouchableOpacity
          style={[
            styles.quickFilterChip,
            filters.type_transaction === 'LOCATION' && styles.quickFilterChipActive,
          ]}
          onPress={() => handleFilterChange('type_transaction', 'LOCATION')}
        >
          <Text
            style={[
              styles.quickFilterText,
              filters.type_transaction === 'LOCATION' && styles.quickFilterTextActive,
            ]}
          >
            À louer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.quickFilterChip,
            filters.type_transaction === 'VENTE' && styles.quickFilterChipActive,
          ]}
          onPress={() => handleFilterChange('type_transaction', 'VENTE')}
        >
          <Text
            style={[
              styles.quickFilterText,
              filters.type_transaction === 'VENTE' && styles.quickFilterTextActive,
            ]}
          >
            À vendre
          </Text>
        </TouchableOpacity>
        {Object.entries(PROPERTY_TYPES).slice(0, 4).map(([key, value]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.quickFilterChip,
              filters.type_bien === key && styles.quickFilterChipActive,
            ]}
            onPress={() => handleFilterChange('type_bien', key)}
          >
            <Text
              style={[
                styles.quickFilterText,
                filters.type_bien === key && styles.quickFilterTextActive,
              ]}
            >
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {listings.length} résultat{listings.length !== 1 ? 's' : ''}
        </Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'grid' && styles.viewButtonActive]}
            onPress={() => setViewMode('grid')}
          >
            <Text>▦</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'list' && styles.viewButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Text>☰</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Listing }) => (
    <View style={viewMode === 'grid' ? styles.gridItem : styles.listItem}>
      <ListingCard
        listing={item}
        variant={viewMode}
        onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={listings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun résultat trouvé</Text>
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.clearFiltersText}>Effacer les filtres</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary[500]} style={styles.loader} />
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={viewMode === 'grid' ? styles.columnWrapper : undefined}
      />

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.modalClose}>Fermer</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filtres</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.modalReset}>Réinitialiser</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Transaction Type */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Type de transaction</Text>
              <View style={styles.filterOptions}>
                {Object.entries(TRANSACTION_TYPES).map(([key, value]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.filterOption,
                      filters.type_transaction === key && styles.filterOptionActive,
                    ]}
                    onPress={() => handleFilterChange('type_transaction', key)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.type_transaction === key && styles.filterOptionTextActive,
                      ]}
                    >
                      {value === 'VENTE' ? 'Vente' : 'Location'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Property Type */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Type de bien</Text>
              <View style={styles.filterOptions}>
                {Object.entries(PROPERTY_TYPES).map(([key, value]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.filterOption,
                      filters.type_bien === key && styles.filterOptionActive,
                    ]}
                    onPress={() => handleFilterChange('type_bien', key)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.type_bien === key && styles.filterOptionTextActive,
                      ]}
                    >
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Region */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Région</Text>
              <View style={styles.filterOptions}>
                {REGIONS.map((region) => (
                  <TouchableOpacity
                    key={region}
                    style={[
                      styles.filterOption,
                      filters.ville === region && styles.filterOptionActive,
                    ]}
                    onPress={() => handleFilterChange('ville', region)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.ville === region && styles.filterOptionTextActive,
                      ]}
                    >
                      {region}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.gray[900],
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary[100],
  },
  filterIcon: {
    fontSize: 18,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.primary[500],
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  quickFilters: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    marginRight: 8,
  },
  quickFilterChipActive: {
    backgroundColor: COLORS.primary[500],
  },
  quickFilterText: {
    fontSize: 13,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  quickFilterTextActive: {
    color: '#fff',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  resultsCount: {
    fontSize: 14,
    color: COLORS.gray[500],
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  viewButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray[100],
  },
  viewButtonActive: {
    backgroundColor: COLORS.primary[100],
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
  },
  listItem: {
    width: '100%',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray[500],
    marginBottom: 12,
  },
  clearFiltersText: {
    fontSize: 14,
    color: COLORS.primary[500],
    fontWeight: '500',
  },
  loader: {
    paddingVertical: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  modalClose: {
    fontSize: 16,
    color: COLORS.gray[600],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  modalReset: {
    fontSize: 14,
    color: COLORS.primary[500],
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  filterOptionActive: {
    backgroundColor: COLORS.primary[500],
  },
  filterOptionText: {
    fontSize: 14,
    color: COLORS.gray[700],
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  applyButton: {
    backgroundColor: COLORS.primary[500],
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SearchScreen;

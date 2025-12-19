import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, PROPERTY_TYPES, REGIONS } from '../constants/config';
import { Listing, RootStackParamList } from '../types';
import { getFeaturedListings, getRecentListings } from '../services/listings';
import { useAuthStore } from '../store/authStore';
import ListingCard from '../components/ListingCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PropertyTypeButton: React.FC<{
  label: string;
  icon: string;
  onPress: () => void;
}> = ({ label, icon, onPress }) => (
  <TouchableOpacity style={styles.propertyTypeButton} onPress={onPress}>
    <Text style={styles.propertyTypeIcon}>{icon}</Text>
    <Text style={styles.propertyTypeLabel}>{label}</Text>
  </TouchableOpacity>
);

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();

  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      const [featured, recent] = await Promise.all([
        getFeaturedListings(6),
        getRecentListings(10),
      ]);
      setFeaturedListings(featured);
      setRecentListings(recent);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSearch = () => {
    navigation.navigate('Search', { filters: {} });
  };

  const handlePropertyTypePress = (type: string) => {
    navigation.navigate('Search', { filters: { type_bien: type } });
  };

  const handleRegionPress = (region: string) => {
    navigation.navigate('Search', { filters: { ville: region } });
  };

  const propertyTypes = [
    { key: 'APPARTEMENT', label: 'Appartement', icon: '🏢' },
    { key: 'MAISON', label: 'Maison', icon: '🏠' },
    { key: 'TERRAIN', label: 'Terrain', icon: '🌍' },
    { key: 'BUREAU', label: 'Bureau', icon: '🏬' },
    { key: 'MAGASIN', label: 'Magasin', icon: '🏪' },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Bonjour{user?.prenom ? `, ${user.prenom}` : ''} 👋
            </Text>
            <Text style={styles.headerTitle}>Trouvez votre bien idéal</Text>
          </View>
        </View>

        {/* Search Bar */}
        <TouchableOpacity style={styles.searchBar} onPress={handleSearch}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Rechercher un bien...</Text>
        </TouchableOpacity>

        {/* Property Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type de bien</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.propertyTypesContainer}
          >
            {propertyTypes.map((type) => (
              <PropertyTypeButton
                key={type.key}
                label={type.label}
                icon={type.icon}
                onPress={() => handlePropertyTypePress(type.key)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Featured Listings */}
        {featuredListings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>À la une</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Search', {})}>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListContainer}
            >
              {featuredListings.map((listing) => (
                <View key={listing.id} style={styles.featuredCard}>
                  <ListingCard
                    listing={listing}
                    onPress={() =>
                      navigation.navigate('ListingDetail', { id: listing.id })
                    }
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Regions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explorer par région</Text>
          <View style={styles.regionsGrid}>
            {REGIONS.slice(0, 4).map((region) => (
              <TouchableOpacity
                key={region}
                style={styles.regionButton}
                onPress={() => handleRegionPress(region)}
              >
                <Text style={styles.regionText}>{region}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Listings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Annonces récentes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Search', {})}>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.recentGrid}>
            {recentListings.slice(0, 6).map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onPress={() =>
                  navigation.navigate('ListingDetail', { id: listing.id })
                }
              />
            ))}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: COLORS.gray[400],
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[900],
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary[500],
    fontWeight: '500',
  },
  propertyTypesContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  propertyTypeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  propertyTypeIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  propertyTypeLabel: {
    fontSize: 11,
    color: COLORS.gray[600],
    fontWeight: '500',
  },
  horizontalListContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  featuredCard: {
    marginRight: 12,
  },
  regionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  regionButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  regionText: {
    fontSize: 13,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  recentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  bottomPadding: {
    height: 20,
  },
});

export default HomeScreen;

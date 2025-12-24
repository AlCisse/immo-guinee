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
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import Colors, { lightTheme } from '@/constants/Colors';

interface Visit {
  id: string;
  listing_id: string;
  date_visite: string;
  heure_visite: string;
  statut: string;
  notes?: string;
  listing?: {
    id: string;
    titre: string;
    quartier: string;
    commune: string;
    photo_principale?: string;
    main_photo_url?: string;
  };
}

export default function MyVisitsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-visits'],
    queryFn: async () => {
      const response = await api.visits.list();
      return response.data?.data?.visits || response.data?.data || [];
    },
    enabled: isAuthenticated,
  });

  const visits = data || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
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
        return { label: 'Confirmee', color: Colors.success[500], icon: 'checkmark-circle' };
      case 'EN_ATTENTE':
        return { label: 'En attente', color: Colors.warning[500], icon: 'time' };
      case 'ANNULEE':
        return { label: 'Annulee', color: Colors.error[500], icon: 'close-circle' };
      case 'TERMINEE':
        return { label: 'Terminee', color: Colors.neutral[500], icon: 'checkmark-done-circle' };
      default:
        return { label: status, color: Colors.neutral[400], icon: 'ellipse' };
    }
  };

  const renderVisit = ({ item }: { item: Visit }) => {
    const listing = item.listing;
    const imageUrl = listing?.main_photo_url || listing?.photo_principale;
    const status = getStatusBadge(item.statut);

    return (
      <TouchableOpacity
        style={styles.visitItem}
        onPress={() => listing && router.push(`/listing/${listing.id}`)}
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
            {listing?.titre || 'Annonce'}
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
        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
          <Ionicons name={status.icon as any} size={12} color="#fff" />
          <Text style={styles.statusText}>{status.label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Mes visites',
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
                <Text style={styles.emptyTitle}>Aucune visite</Text>
                <Text style={styles.emptyText}>
                  Vous n'avez pas encore programme de visite
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

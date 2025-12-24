import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import Colors, { lightTheme } from '@/constants/Colors';

interface Contract {
  id: string;
  numero_contrat: string;
  type_contrat: string;
  statut: string;
  date_debut: string;
  date_fin?: string;
  montant_loyer?: number;
  listing?: {
    titre: string;
    quartier: string;
    commune: string;
  };
}

export default function MyContractsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-contracts'],
    queryFn: async () => {
      const response = await api.contracts.my();
      return response.data?.data?.contracts || response.data?.data || [];
    },
    enabled: isAuthenticated,
  });

  const contracts = data || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIF':
        return { label: 'Actif', color: Colors.success[500], icon: 'checkmark-circle' };
      case 'EN_ATTENTE':
        return { label: 'En attente', color: Colors.warning[500], icon: 'time' };
      case 'SIGNE':
        return { label: 'Signe', color: Colors.success[600], icon: 'document-text' };
      case 'RESILIE':
        return { label: 'Resilie', color: Colors.error[500], icon: 'close-circle' };
      case 'TERMINE':
        return { label: 'Termine', color: Colors.neutral[500], icon: 'checkmark-done-circle' };
      default:
        return { label: status, color: Colors.neutral[400], icon: 'document' };
    }
  };

  const getContractTypeLabel = (type: string) => {
    switch (type) {
      case 'LOCATION':
        return 'Contrat de location';
      case 'VENTE':
        return 'Contrat de vente';
      case 'LOCATION_COURTE':
        return 'Location courte duree';
      default:
        return type;
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return '-';
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M GNF`;
    }
    return `${price.toLocaleString()} GNF`;
  };

  const renderContract = ({ item }: { item: Contract }) => {
    const status = getStatusBadge(item.statut);

    return (
      <TouchableOpacity
        style={styles.contractItem}
        activeOpacity={0.8}
      >
        <View style={styles.contractHeader}>
          <View style={styles.contractIcon}>
            <Ionicons name="document-text-outline" size={24} color={lightTheme.colors.primary} />
          </View>
          <View style={styles.contractInfo}>
            <Text style={styles.contractNumber}>{item.numero_contrat}</Text>
            <Text style={styles.contractType}>{getContractTypeLabel(item.type_contrat)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
        </View>

        {item.listing && (
          <View style={styles.listingInfo}>
            <Ionicons name="home-outline" size={14} color={Colors.neutral[500]} />
            <Text style={styles.listingText} numberOfLines={1}>
              {item.listing.titre}
            </Text>
          </View>
        )}

        <View style={styles.contractDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Debut</Text>
            <Text style={styles.detailValue}>{formatDate(item.date_debut)}</Text>
          </View>
          {item.date_fin && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Fin</Text>
              <Text style={styles.detailValue}>{formatDate(item.date_fin)}</Text>
            </View>
          )}
          {item.montant_loyer && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Loyer</Text>
              <Text style={styles.detailValuePrice}>{formatPrice(item.montant_loyer)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Mes contrats',
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
            data={contracts}
            keyExtractor={(item) => item.id}
            renderItem={renderContract}
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
                <Ionicons name="document-text-outline" size={64} color={Colors.neutral[300]} />
                <Text style={styles.emptyTitle}>Aucun contrat</Text>
                <Text style={styles.emptyText}>
                  Vous n'avez pas encore de contrat
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
  contractItem: {
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  contractHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contractIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contractInfo: {
    flex: 1,
  },
  contractNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 2,
  },
  contractType: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  listingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  listingText: {
    fontSize: 14,
    color: Colors.neutral[600],
    flex: 1,
  },
  contractDetails: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    gap: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  detailValuePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: lightTheme.colors.primary,
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

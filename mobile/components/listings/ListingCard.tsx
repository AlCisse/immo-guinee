import { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Listing } from '@/types';
import Colors, { lightTheme } from '@/constants/Colors';
import { formatPrice } from '@/lib/utils/formatPrice';

interface ListingCardProps {
  listing: Listing;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const ListingCard = memo(function ListingCard({
  listing,
  onPress,
  onEdit,
  onDelete,
}: ListingCardProps) {
  const { t } = useTranslation();
  const imageUrl = listing.main_photo_url || listing.photo_principale;
  const status = getStatusBadge(listing.statut, t);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
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

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {listing.titre}
        </Text>
        <View style={styles.location}>
          <Ionicons name="location-outline" size={12} color={lightTheme.colors.primary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {listing.quartier}, {listing.commune}
          </Text>
        </View>
        <Text style={styles.price}>{formatPrice(listing.loyer_mensuel)}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
          <Ionicons name="create-outline" size={20} color={lightTheme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
          <Ionicons name="trash-outline" size={20} color={Colors.error[500]} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

function getStatusBadge(status: string, t: (key: string) => string) {
  switch (status) {
    case 'PUBLIE':
      return { label: t('myListings.status.published'), color: Colors.success[500] };
    case 'EN_ATTENTE':
      return { label: t('myListings.status.pending'), color: Colors.warning[500] };
    case 'ARCHIVE':
      return { label: t('myListings.status.archived'), color: Colors.neutral[500] };
    case 'BROUILLON':
      return { label: t('myListings.status.draft'), color: Colors.neutral[400] };
    default:
      return { label: status, color: Colors.neutral[400] };
  }
}

const styles = StyleSheet.create({
  container: {
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
  imageContainer: {
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
  content: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 6,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: Colors.neutral[500],
    flex: 1,
  },
  price: {
    fontSize: 17,
    fontWeight: '800',
    color: lightTheme.colors.primary,
  },
  actions: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 10,
    justifyContent: 'center',
  },
});

export default ListingCard;

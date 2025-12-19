import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

import { Listing } from '../types';
import { COLORS } from '../constants/config';
import {
  formatPriceWithPeriod,
  formatSurface,
  getPropertyTypeLabel,
  getTransactionTypeLabel,
} from '../utils/format';
import { useFavoritesStore } from '../store/favoritesStore';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface Props {
  listing: Listing;
  onPress: () => void;
  variant?: 'grid' | 'list';
}

const ListingCard: React.FC<Props> = ({ listing, onPress, variant = 'grid' }) => {
  const { isAuthenticated } = useAuthStore();
  const { isFavorite, toggleFavoriteOptimistic } = useFavoritesStore();
  const favorite = isFavorite(listing.id);

  const primaryImage = listing.medias?.find((m) => m.is_primary) || listing.medias?.[0];
  const imageUrl = primaryImage?.url || 'https://via.placeholder.com/300x200?text=No+Image';

  const handleFavorite = async () => {
    if (!isAuthenticated) return;
    try {
      await toggleFavoriteOptimistic(listing.id);
    } catch (error) {
      // Error handled in store
    }
  };

  if (variant === 'list') {
    return (
      <TouchableOpacity style={styles.listCard} onPress={onPress} activeOpacity={0.8}>
        <Image source={{ uri: imageUrl }} style={styles.listImage} />
        <View style={styles.listContent}>
          <View style={styles.listHeader}>
            <Text style={styles.badge}>
              {getTransactionTypeLabel(listing.type_transaction)}
            </Text>
            {listing.certifie && <Text style={styles.certifiedBadge}>Certifié</Text>}
          </View>
          <Text style={styles.listTitle} numberOfLines={1}>
            {listing.titre}
          </Text>
          <Text style={styles.listLocation} numberOfLines={1}>
            {listing.commune ? `${listing.commune}, ` : ''}{listing.ville}
          </Text>
          <View style={styles.listFooter}>
            <Text style={styles.listPrice}>
              {formatPriceWithPeriod(listing.prix, listing.prix_periode)}
            </Text>
            <View style={styles.listSpecs}>
              <Text style={styles.specText}>{formatSurface(listing.surface)}</Text>
              {listing.nb_chambres && (
                <Text style={styles.specText}> • {listing.nb_chambres} ch</Text>
              )}
            </View>
          </View>
        </View>
        {isAuthenticated && (
          <TouchableOpacity style={styles.listFavorite} onPress={handleFavorite}>
            <Text style={styles.favoriteIcon}>{favorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.gridCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUrl }} style={styles.gridImage} />
        <View style={styles.badgeContainer}>
          <Text style={styles.badge}>
            {getTransactionTypeLabel(listing.type_transaction)}
          </Text>
        </View>
        {isAuthenticated && (
          <TouchableOpacity style={styles.favoriteButton} onPress={handleFavorite}>
            <Text style={styles.favoriteIcon}>{favorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        )}
        {listing.certifie && (
          <View style={styles.certifiedContainer}>
            <Text style={styles.certifiedBadge}>✓</Text>
          </View>
        )}
      </View>
      <View style={styles.gridContent}>
        <Text style={styles.price}>
          {formatPriceWithPeriod(listing.prix, listing.prix_periode)}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {listing.titre}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {listing.commune ? `${listing.commune}, ` : ''}{listing.ville}
        </Text>
        <View style={styles.specs}>
          <Text style={styles.specText}>{formatSurface(listing.surface)}</Text>
          {listing.nb_chambres && (
            <Text style={styles.specText}>{listing.nb_chambres} ch</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Grid styles
  gridCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.gray[200],
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  badge: {
    backgroundColor: COLORS.primary[500],
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    fontSize: 16,
  },
  certifiedContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certifiedBadge: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gridContent: {
    padding: 10,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary[600],
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 2,
  },
  location: {
    fontSize: 11,
    color: COLORS.gray[500],
    marginBottom: 6,
  },
  specs: {
    flexDirection: 'row',
    gap: 8,
  },
  specText: {
    fontSize: 10,
    color: COLORS.gray[600],
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // List styles
  listCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  listImage: {
    width: 120,
    height: 100,
    backgroundColor: COLORS.gray[200],
  },
  listContent: {
    flex: 1,
    padding: 10,
  },
  listHeader: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 2,
  },
  listLocation: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginBottom: 6,
  },
  listFooter: {
    marginTop: 'auto',
  },
  listPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary[600],
    marginBottom: 4,
  },
  listSpecs: {
    flexDirection: 'row',
  },
  listFavorite: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ListingCard;

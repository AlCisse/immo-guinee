import { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors, { lightTheme } from '@/constants/Colors';

interface Visit {
  id: string;
  listing_id: string;
  proprietaire_id: string;
  visiteur_id: string;
  date_visite: string;
  heure_visite: string;
  statut: string;
  notes?: string;
  client_nom?: string;
  client_telephone?: string;
  listing?: {
    id: string;
    titre: string;
    quartier: string;
    commune: string;
    photo_principale?: string;
    main_photo_url?: string;
  };
}

interface VisitCardProps {
  visit: Visit;
  userId?: string;
  isConfirming: boolean;
  isCancelling: boolean;
  isDeleting: boolean;
  onPress: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function getStatusBadge(status: string, t: (key: string) => string) {
  switch (status) {
    case 'CONFIRMEE':
      return { label: t('visits.confirmed'), color: Colors.success[500], icon: 'checkmark-circle' };
    case 'EN_ATTENTE':
      return { label: t('visits.pending'), color: Colors.warning[500], icon: 'time' };
    case 'ANNULEE':
      return { label: t('visits.cancelled'), color: Colors.error[500], icon: 'close-circle' };
    case 'TERMINEE':
      return {
        label: t('visits.completed'),
        color: Colors.neutral[500],
        icon: 'checkmark-done-circle',
      };
    default:
      return { label: status, color: Colors.neutral[400], icon: 'ellipse' };
  }
}

export const VisitCard = memo(function VisitCard({
  visit,
  userId,
  isConfirming,
  isCancelling,
  isDeleting,
  onPress,
  onConfirm,
  onCancel,
  onDelete,
}: VisitCardProps) {
  const { t, i18n } = useTranslation();
  const listing = visit.listing;
  const imageUrl = listing?.main_photo_url || listing?.photo_principale;
  const status = getStatusBadge(visit.statut, t);
  const isOwner = userId === visit.proprietaire_id;
  const isPending = visit.statut === 'EN_ATTENTE' || visit.statut === 'PENDING';
  const isConfirmed = visit.statut === 'CONFIRMEE';
  const canConfirm = isPending;
  const canCancel = isPending || isConfirmed;
  const canDelete = isOwner;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  return (
    <TouchableOpacity style={styles.visitItem} onPress={onPress} activeOpacity={0.8}>
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
          {listing?.titre || t('visits.listing')}
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
            <Text style={styles.dateTimeText}>{formatDate(visit.date_visite)}</Text>
          </View>
          <View style={styles.dateTimeItem}>
            <Ionicons name="time-outline" size={14} color={Colors.neutral[500]} />
            <Text style={styles.dateTimeText}>{formatTime(visit.heure_visite)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.visitActions}>
        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
          <Ionicons name={status.icon as any} size={12} color="#fff" />
          <Text style={styles.statusText}>{status.label}</Text>
        </View>
        <View style={styles.actionButtons}>
          {canConfirm && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              disabled={isConfirming}
              accessibilityRole="button"
              accessibilityLabel={t('visits.confirmVisit')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isConfirming ? (
                <ActivityIndicator size="small" color={Colors.success[600]} />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={20} color={Colors.success[600]} />
              )}
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isCancelling}
              accessibilityRole="button"
              accessibilityLabel={t('visits.cancelVisit')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color={Colors.warning[600]} />
              ) : (
                <Ionicons name="close-circle-outline" size={20} color={Colors.warning[600]} />
              )}
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={onDelete}
              disabled={isDeleting}
              accessibilityRole="button"
              accessibilityLabel={t('visits.deleteVisit')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={Colors.error[500]} />
              ) : (
                <Ionicons name="trash-outline" size={20} color={Colors.error[500]} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
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
  visitActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    alignItems: 'flex-end',
    gap: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmButton: {
    padding: 8,
    backgroundColor: Colors.success[50],
    borderRadius: 8,
  },
  cancelButton: {
    padding: 8,
    backgroundColor: Colors.warning[50],
    borderRadius: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: Colors.error[50],
    borderRadius: 8,
  },
});

export default VisitCard;

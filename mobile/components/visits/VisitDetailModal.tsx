import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors, { lightTheme } from '@/constants/Colors';
import { getStatusBadge } from './VisitCard';

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
  proprietaire?: {
    id: string;
    nom_complet: string;
    telephone: string;
    photo_profil_url?: string;
  };
  visiteur?: {
    id: string;
    nom_complet: string;
    telephone: string;
    photo_profil_url?: string;
  };
}

interface VisitDetailModalProps {
  visible: boolean;
  visit: Visit | null;
  userId?: string;
  onClose: () => void;
  onConfirm: (visitId: string) => void;
  onCancel: (visitId: string) => void;
  onDelete: (visitId: string) => void;
  onViewListing: (listingId: string) => void;
}

export function VisitDetailModal({
  visible,
  visit,
  userId,
  onClose,
  onConfirm,
  onCancel,
  onDelete,
  onViewListing,
}: VisitDetailModalProps) {
  const { t, i18n } = useTranslation();

  if (!visit) return null;

  const status = getStatusBadge(visit.statut, t);
  const isOwner = userId === visit.proprietaire_id;
  const isPending = visit.statut === 'EN_ATTENTE' || visit.statut === 'PENDING';
  const isConfirmed = visit.statut === 'CONFIRMEE';

  const contactPhone = isOwner
    ? visit.client_telephone || visit.visiteur?.telephone
    : visit.proprietaire?.telephone;

  const contactName = isOwner
    ? visit.client_nom || visit.visiteur?.nom_complet || t('visits.visitor')
    : visit.proprietaire?.nom_complet || t('visits.owner');

  const contactAvatar = isOwner
    ? visit.visiteur?.photo_profil_url
    : visit.proprietaire?.photo_profil_url;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={Colors.secondary[800]} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('visits.visitDetails')}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Listing Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('visits.property')}</Text>
            <TouchableOpacity
              style={styles.listingCard}
              onPress={() => visit.listing && onViewListing(visit.listing.id)}
            >
              {visit.listing?.main_photo_url || visit.listing?.photo_principale ? (
                <Image
                  source={{ uri: visit.listing?.main_photo_url || visit.listing?.photo_principale }}
                  style={styles.listingImage}
                />
              ) : (
                <View style={[styles.listingImage, styles.listingImagePlaceholder]}>
                  <Ionicons name="home-outline" size={32} color={Colors.neutral[300]} />
                </View>
              )}
              <View style={styles.listingInfo}>
                <Text style={styles.listingTitle} numberOfLines={2}>
                  {visit.listing?.titre || t('visits.listing')}
                </Text>
                <View style={styles.listingLocation}>
                  <Ionicons name="location-outline" size={14} color={lightTheme.colors.primary} />
                  <Text style={styles.listingLocationText}>
                    {visit.listing?.quartier}, {visit.listing?.commune}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[400]} />
            </TouchableOpacity>
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('visits.dateTime')}</Text>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeItem}>
                <Ionicons name="calendar-outline" size={20} color={lightTheme.colors.primary} />
                <Text style={styles.dateTimeText}>
                  {new Date(visit.date_visite).toLocaleDateString(
                    i18n.language === 'fr' ? 'fr-FR' : 'en-US',
                    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
                  )}
                </Text>
              </View>
              <View style={styles.dateTimeItem}>
                <Ionicons name="time-outline" size={20} color={lightTheme.colors.primary} />
                <Text style={styles.dateTimeText}>{visit.heure_visite.substring(0, 5)}</Text>
              </View>
            </View>
          </View>

          {/* Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('common.status') || 'Status'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Ionicons name={status.icon as any} size={16} color="#fff" />
              <Text style={styles.statusText}>{status.label}</Text>
            </View>
          </View>

          {/* Contact Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isOwner ? t('visits.visitor') : t('visits.owner')}
            </Text>
            <View style={styles.contactCard}>
              <View style={styles.contactAvatar}>
                {contactAvatar ? (
                  <Image source={{ uri: contactAvatar }} style={styles.contactAvatarImage} />
                ) : (
                  <Text style={styles.contactAvatarText}>
                    {contactName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contactName}</Text>
                <Text style={styles.contactPhone}>{contactPhone || t('visits.notAvailable')}</Text>
              </View>
            </View>

            <View style={styles.contactActions}>
              <TouchableOpacity
                style={styles.contactActionBtn}
                onPress={() => contactPhone && Linking.openURL(`tel:${contactPhone}`)}
              >
                <Ionicons name="call-outline" size={20} color="#fff" />
                <Text style={styles.contactActionText}>{t('visits.call')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactActionBtn, styles.contactActionBtnSecondary]}
                onPress={() =>
                  contactPhone &&
                  Linking.openURL(`https://wa.me/${contactPhone.replace(/[^0-9]/g, '')}`)
                }
              >
                <Ionicons name="logo-whatsapp" size={20} color={lightTheme.colors.primary} />
                <Text style={[styles.contactActionText, styles.contactActionTextSecondary]}>
                  WhatsApp
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes */}
          {visit.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('visits.notes')}</Text>
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>{visit.notes}</Text>
              </View>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            {isPending && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnConfirm]}
                onPress={() => {
                  onClose();
                  onConfirm(visit.id);
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            )}
            {(isPending || isConfirmed) && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnCancel]}
                onPress={() => {
                  onClose();
                  onCancel(visit.id);
                }}
              >
                <Ionicons name="close-circle-outline" size={20} color={Colors.warning[600]} />
                <Text style={[styles.actionBtnText, { color: Colors.warning[600] }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            )}
            {isOwner && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDelete]}
                onPress={() => {
                  onClose();
                  onDelete(visit.id);
                }}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error[500]} />
                <Text style={[styles.actionBtnText, { color: Colors.error[500] }]}>
                  {t('common.delete')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[500],
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  listingImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  listingImagePlaceholder: {
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginBottom: 6,
  },
  listingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listingLocationText: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.secondary[800],
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    gap: 14,
    marginBottom: 12,
  },
  contactAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: lightTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  contactAvatarImage: {
    width: '100%',
    height: '100%',
  },
  contactAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
  },
  contactActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  contactActionBtnSecondary: {
    backgroundColor: lightTheme.colors.primary + '15',
  },
  contactActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  contactActionTextSecondary: {
    color: lightTheme.colors.primary,
  },
  notesCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
  },
  notesText: {
    fontSize: 14,
    color: Colors.secondary[700],
    lineHeight: 22,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  actionBtnConfirm: {
    backgroundColor: Colors.success[500],
    borderColor: Colors.success[500],
  },
  actionBtnCancel: {
    backgroundColor: Colors.warning[50],
    borderColor: Colors.warning[100],
  },
  actionBtnDelete: {
    backgroundColor: Colors.error[50],
    borderColor: Colors.error[100],
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default VisitDetailModal;

import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors, { lightTheme } from '@/constants/Colors';

interface DeleteReason {
  id: string;
  label: string;
  icon: string;
}

interface DeleteListingModalProps {
  visible: boolean;
  selectedReason: string | null;
  isPending: boolean;
  onClose: () => void;
  onDelete: () => void;
  onSelectReason: (reasonId: string) => void;
}

export function DeleteListingModal({
  visible,
  selectedReason,
  isPending,
  onClose,
  onDelete,
  onSelectReason,
}: DeleteListingModalProps) {
  const { t } = useTranslation();

  const deleteReasons: DeleteReason[] = [
    { id: 'loue_immoguinee', label: t('myListings.rentedViaApp'), icon: 'checkmark-circle' },
    { id: 'loue_ailleurs', label: t('myListings.rentedElsewhere'), icon: 'home' },
    { id: 'plus_disponible', label: t('myListings.noLongerAvailable'), icon: 'close-circle' },
    { id: 'autre', label: t('myListings.otherReason'), icon: 'ellipsis-horizontal' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('myListings.deleteListing')}</Text>
          <Text style={styles.subtitle}>{t('myListings.deleteReason')}</Text>

          {deleteReasons.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[styles.reasonOption, selectedReason === reason.id && styles.reasonSelected]}
              onPress={() => onSelectReason(reason.id)}
            >
              <Ionicons
                name={reason.icon as any}
                size={22}
                color={
                  selectedReason === reason.id ? lightTheme.colors.primary : Colors.neutral[500]
                }
              />
              <Text
                style={[
                  styles.reasonText,
                  selectedReason === reason.id && styles.reasonTextSelected,
                ]}
              >
                {reason.label}
              </Text>
              {selectedReason === reason.id && (
                <Ionicons name="checkmark" size={20} color={lightTheme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>{t('myListings.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, !selectedReason && styles.confirmDisabled]}
              onPress={onDelete}
              disabled={!selectedReason || isPending}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmText}>{t('myListings.delete')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: Colors.background.primary,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[800],
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: 20,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.background.secondary,
  },
  reasonSelected: {
    backgroundColor: Colors.primary[50],
    borderWidth: 1,
    borderColor: lightTheme.colors.primary,
  },
  reasonText: {
    flex: 1,
    fontSize: 15,
    color: Colors.secondary[700],
  },
  reasonTextSelected: {
    color: lightTheme.colors.primary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[700],
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.error[500],
    alignItems: 'center',
  },
  confirmDisabled: {
    backgroundColor: Colors.neutral[300],
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default DeleteListingModal;

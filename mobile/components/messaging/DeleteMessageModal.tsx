import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface DeleteMessageModalProps {
  visible: boolean;
  onClose: () => void;
  onDeleteForMe: () => Promise<void>;
  onDeleteForEveryone?: () => Promise<void>;
  canDeleteForEveryone: boolean;
  messagePreview?: string;
}

export function DeleteMessageModal({
  visible,
  onClose,
  onDeleteForMe,
  onDeleteForEveryone,
  canDeleteForEveryone,
  messagePreview,
}: DeleteMessageModalProps) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteType, setDeleteType] = useState<'me' | 'everyone' | null>(null);

  const handleDeleteForMe = async () => {
    setIsDeleting(true);
    setDeleteType('me');
    try {
      await onDeleteForMe();
      onClose();
    } catch (error) {
      console.error('Failed to delete message:', error);
    } finally {
      setIsDeleting(false);
      setDeleteType(null);
    }
  };

  const handleDeleteForEveryone = async () => {
    if (!onDeleteForEveryone) return;
    setIsDeleting(true);
    setDeleteType('everyone');
    try {
      await onDeleteForEveryone();
      onClose();
    } catch (error) {
      console.error('Failed to delete message for everyone:', error);
    } finally {
      setIsDeleting(false);
      setDeleteType(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
            <Text style={styles.title}>{t('chat.deleteMessage.title')}</Text>
          </View>

          {messagePreview && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewText} numberOfLines={2}>
                "{messagePreview}"
              </Text>
            </View>
          )}

          <View style={styles.options}>
            <TouchableOpacity
              style={styles.option}
              onPress={handleDeleteForMe}
              disabled={isDeleting}
            >
              <View style={styles.optionContent}>
                <Ionicons name="person-outline" size={20} color="#374151" />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{t('chat.deleteMessage.deleteForMe')}</Text>
                  <Text style={styles.optionDescription}>
                    {t('chat.deleteMessage.deleteForMeDesc')}
                  </Text>
                </View>
              </View>
              {isDeleting && deleteType === 'me' && (
                <ActivityIndicator size="small" color="#10B981" />
              )}
            </TouchableOpacity>

            {canDeleteForEveryone && onDeleteForEveryone && (
              <TouchableOpacity
                style={styles.option}
                onPress={handleDeleteForEveryone}
                disabled={isDeleting}
              >
                <View style={styles.optionContent}>
                  <Ionicons name="people-outline" size={20} color="#374151" />
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{t('chat.deleteMessage.deleteForEveryone')}</Text>
                    <Text style={styles.optionDescription}>
                      {t('chat.deleteMessage.deleteForEveryoneDesc')}
                    </Text>
                  </View>
                </View>
                {isDeleting && deleteType === 'everyone' && (
                  <ActivityIndicator size="small" color="#10B981" />
                )}
              </TouchableOpacity>
            )}

            {!canDeleteForEveryone && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                <Text style={styles.infoText}>
                  {t('chat.deleteMessage.timeLimit')}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isDeleting}
          >
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  previewContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  previewText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  options: {
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default DeleteMessageModal;

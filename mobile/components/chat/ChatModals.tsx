import { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors, { lightTheme } from '@/constants/Colors';
import { PickedMedia, formatFileSize } from '@/lib/media';

interface MediaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickImage: () => void;
  onPickVideo: () => void;
}

export const MediaPickerModal = memo(function MediaPickerModal({
  visible,
  onClose,
  onTakePhoto,
  onPickImage,
  onPickVideo,
}: MediaPickerModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.mediaPickerOverlay} onPress={onClose}>
        <View style={styles.mediaPickerContent}>
          <View style={styles.mediaPickerHeader}>
            <Text style={styles.mediaPickerTitle}>{t('chat.shareMedia')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.neutral[500]} />
            </TouchableOpacity>
          </View>
          <View style={styles.mediaPickerOptions}>
            <TouchableOpacity style={styles.mediaPickerOption} onPress={onTakePhoto}>
              <View style={[styles.mediaPickerIcon, { backgroundColor: Colors.primary[100] }]}>
                <Ionicons name="camera" size={28} color={lightTheme.colors.primary} />
              </View>
              <Text style={styles.mediaPickerOptionText}>{t('chat.takePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaPickerOption} onPress={onPickImage}>
              <View style={[styles.mediaPickerIcon, { backgroundColor: Colors.success[100] }]}>
                <Ionicons name="image" size={28} color={Colors.success[600]} />
              </View>
              <Text style={styles.mediaPickerOptionText}>{t('chat.imageGallery')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaPickerOption} onPress={onPickVideo}>
              <View style={[styles.mediaPickerIcon, { backgroundColor: Colors.warning[100] }]}>
                <Ionicons name="videocam" size={28} color={Colors.warning[600]} />
              </View>
              <Text style={styles.mediaPickerOptionText}>{t('chat.videoGallery')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
});

interface MediaPreviewProps {
  media: PickedMedia | null;
  isSending: boolean;
  onClose: () => void;
  onSend: () => void;
}

export const MediaPreview = memo(function MediaPreview({
  media,
  isSending,
  onClose,
  onSend,
}: MediaPreviewProps) {
  const { t } = useTranslation();

  if (!media) return null;

  return (
    <View style={styles.mediaPreviewOverlay}>
      <View style={styles.mediaPreviewContent}>
        <TouchableOpacity style={styles.mediaPreviewClose} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        {media.type === 'image' ? (
          <Image source={{ uri: media.uri }} style={styles.mediaPreviewImage} />
        ) : (
          <View style={styles.mediaPreviewVideo}>
            <Ionicons name="videocam" size={48} color="#fff" />
            <Text style={styles.mediaPreviewVideoText}>{t('chat.video')}</Text>
          </View>
        )}
        <View style={styles.mediaPreviewInfo}>
          <Text style={styles.mediaPreviewSize}>{formatFileSize(media.fileSize)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.mediaPreviewSend, isSending && styles.mediaPreviewSendDisabled]}
          onPress={onSend}
          disabled={isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.mediaPreviewSendText}>{t('chat.send')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

interface FullscreenMediaViewerProps {
  media: { uri: string; type: 'image' | 'video' } | null;
  onClose: () => void;
}

export const FullscreenMediaViewer = memo(function FullscreenMediaViewer({
  media,
  onClose,
}: FullscreenMediaViewerProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={!!media} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.fullscreenMediaOverlay}>
        <TouchableOpacity style={styles.fullscreenMediaClose} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        {media?.type === 'image' ? (
          <Image source={{ uri: media.uri }} style={styles.fullscreenImage} resizeMode="contain" />
        ) : media?.type === 'video' ? (
          <View style={styles.fullscreenVideoContainer}>
            <Ionicons name="videocam" size={64} color="rgba(255,255,255,0.5)" />
            <Text style={styles.fullscreenVideoText}>{t('chat.videoPlaybackUnavailable')}</Text>
            <Text style={styles.fullscreenVideoSubtext}>{t('chat.openWithExternalApp')}</Text>
          </View>
        ) : null}
        <View style={styles.fullscreenMediaBadge}>
          <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.7)" />
          <Text style={styles.fullscreenMediaBadgeText}>{t('chat.e2eEncryption')}</Text>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  // Media picker modal
  mediaPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  mediaPickerContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  mediaPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  mediaPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  mediaPickerOptions: {
    paddingTop: 16,
  },
  mediaPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  mediaPickerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mediaPickerOptionText: {
    fontSize: 16,
    color: Colors.secondary[800],
  },
  // Media preview overlay
  mediaPreviewOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  mediaPreviewContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreviewClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  mediaPreviewImage: {
    width: '90%',
    height: '60%',
    borderRadius: 12,
    resizeMode: 'contain',
  },
  mediaPreviewVideo: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreviewVideoText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 16,
  },
  mediaPreviewInfo: {
    marginTop: 16,
  },
  mediaPreviewSize: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  mediaPreviewSend: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 28,
    gap: 8,
  },
  mediaPreviewSendDisabled: {
    opacity: 0.6,
  },
  mediaPreviewSendText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Fullscreen media viewer
  fullscreenMediaOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenMediaClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fullscreenImage: {
    width: '100%',
    height: '80%',
  },
  fullscreenVideoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  fullscreenVideoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    marginTop: 16,
    fontWeight: '500',
  },
  fullscreenVideoSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 8,
  },
  fullscreenMediaBadge: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  fullscreenMediaBadgeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
});

export default { MediaPickerModal, MediaPreview, FullscreenMediaViewer };

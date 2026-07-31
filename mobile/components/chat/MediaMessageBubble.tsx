import { memo } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors, { lightTheme } from '@/constants/Colors';
import { Message } from '@/types';

interface MediaMessageBubbleProps {
  message: Message & { localMediaReady?: boolean };
  isMe: boolean;
  mediaType: 'image' | 'video';
  cachedUri: string | null;
  isDownloading: boolean;
  onPress: (message: Message, type: 'image' | 'video') => void;
}

export const MediaMessageBubble = memo(function MediaMessageBubble({
  message,
  isMe,
  mediaType,
  cachedUri,
  isDownloading,
  onPress,
}: MediaMessageBubbleProps) {
  const { t } = useTranslation();
  const isE2EFromOther = !isMe && !!message.encrypted_media_id && !message.media_url;

  if (mediaType === 'video') {
    return (
      <TouchableOpacity
        style={styles.encryptedVideoContainer}
        onPress={() => onPress(message, 'video')}
        activeOpacity={0.8}
        disabled={isDownloading}
      >
        {cachedUri ? (
          <>
            <Image source={{ uri: cachedUri }} style={styles.encryptedImage} />
            <View style={styles.encryptedVideoIcon}>
              <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
            </View>
          </>
        ) : isDownloading ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={[styles.encryptedMediaLoadingText, { color: '#fff' }]}>
              {t('chat.downloading')}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="videocam-outline" size={32} color="rgba(255,255,255,0.8)" />
            <Text style={[styles.encryptedMediaLoadingText, { color: 'rgba(255,255,255,0.8)' }]}>
              {isE2EFromOther ? t('chat.tapToView') : t('chat.encryptedVideo')}
            </Text>
          </>
        )}
        <View style={[styles.e2eBadge, { marginTop: 8 }]}>
          <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.6)" />
          <Text style={[styles.e2eBadgeText, { color: 'rgba(255,255,255,0.6)' }]}>
            {t('chat.encryptedE2E')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Image message
  return (
    <TouchableOpacity
      style={styles.encryptedImageContainer}
      onPress={() => onPress(message, 'image')}
      activeOpacity={0.8}
      disabled={isDownloading}
    >
      {cachedUri ? (
        <Image source={{ uri: cachedUri }} style={styles.encryptedImage} />
      ) : isDownloading ? (
        <View style={styles.encryptedMediaLoading}>
          <ActivityIndicator size="small" color={lightTheme.colors.primary} />
          <Text style={styles.encryptedMediaLoadingText}>{t('chat.downloading')}</Text>
        </View>
      ) : (
        <View style={styles.encryptedMediaLoading}>
          <Ionicons name="image-outline" size={32} color={Colors.neutral[400]} />
          <Text style={styles.encryptedMediaLoadingText}>
            {isE2EFromOther ? t('chat.tapToView') : t('chat.encryptedImage')}
          </Text>
        </View>
      )}
      <View style={styles.e2eBadge}>
        <Ionicons name="lock-closed" size={10} color={Colors.neutral[400]} />
        <Text style={styles.e2eBadgeText}>{t('chat.encryptedE2E')}</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  encryptedImageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  encryptedImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  encryptedVideoContainer: {
    width: 200,
    height: 150,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  encryptedVideoIcon: {
    position: 'absolute',
  },
  encryptedMediaLoading: {
    width: 200,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    marginBottom: 4,
  },
  encryptedMediaLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.neutral[500],
  },
  e2eBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  e2eBadgeText: {
    fontSize: 10,
    color: Colors.neutral[400],
  },
});

export default MediaMessageBubble;

import { memo } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors, { lightTheme } from '@/constants/Colors';
import { Message } from '@/types';

interface VoiceMessageBubbleProps {
  message: Message & { localMediaReady?: boolean };
  isMe: boolean;
  isPlaying: boolean;
  audioPosition: number;
  audioDuration: number;
  onPlay: (message: Message) => void;
}

export const VoiceMessageBubble = memo(function VoiceMessageBubble({
  message,
  isMe,
  isPlaying,
  audioPosition,
  audioDuration,
  onPlay,
}: VoiceMessageBubbleProps) {
  const { t } = useTranslation();
  const progress = audioDuration > 0 && isPlaying ? (audioPosition / audioDuration) * 100 : 0;
  const hasAudio = !!(message.media_url || message.encrypted_media_id);

  // For E2E encrypted messages from others that were just received via WebSocket
  const isE2EFromOther = !isMe && !!message.encrypted_media_id && !message.media_url;
  const isDownloading = isE2EFromOther && message.localMediaReady === false;

  const formatDuration = (millis: number) => {
    const seconds = Math.floor(millis / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.voiceMessageContainer,
        isMe ? styles.voiceMessageMe : styles.voiceMessageOther,
      ]}
      onPress={() => hasAudio && !isDownloading && onPlay(message)}
      activeOpacity={0.7}
      disabled={!hasAudio || isDownloading}
    >
      <View style={styles.voicePlayButton}>
        {isDownloading ? (
          <ActivityIndicator size="small" color={lightTheme.colors.primary} />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color={isMe ? '#fff' : lightTheme.colors.primary}
          />
        )}
      </View>
      <View style={styles.voiceWaveContainer}>
        <View style={styles.voiceWaveBackground}>
          <View style={[styles.voiceWaveProgress, { width: `${progress}%` }]} />
        </View>
        <Text style={[styles.voiceDuration, isMe && styles.voiceDurationMe]}>
          {isDownloading
            ? t('chat.downloading')
            : isPlaying
              ? formatDuration(audioPosition)
              : t('messages.voiceMessage')}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  voiceMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 180,
  },
  voiceMessageMe: {},
  voiceMessageOther: {},
  voicePlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  voiceWaveContainer: {
    flex: 1,
  },
  voiceWaveBackground: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  voiceWaveProgress: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  voiceDuration: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
  voiceDurationMe: {
    color: 'rgba(255,255,255,0.8)',
  },
});

export default VoiceMessageBubble;

import { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors, { lightTheme } from '@/constants/Colors';
import { RecordingState, formatVoiceDuration } from '@/lib/media';

interface RecordingUIProps {
  recordingState: RecordingState | null;
  recordingAnimValue: Animated.Value;
  onCancel: () => void;
  onStop: () => void;
}

export const RecordingUI = memo(function RecordingUI({
  recordingState,
  recordingAnimValue,
  onCancel,
  onStop,
}: RecordingUIProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.recordingContainer}>
      <View style={styles.recordingContent}>
        <Animated.View
          style={[styles.recordingPulse, { transform: [{ scale: recordingAnimValue }] }]}
        >
          <View style={styles.recordingDot} />
        </Animated.View>
        <Text style={styles.recordingDuration}>
          {recordingState
            ? formatVoiceDuration(Math.floor(recordingState.durationMs / 1000))
            : '0:00'}
        </Text>
        <Text style={styles.recordingText}>{t('chat.recording')}</Text>
      </View>
      <View style={styles.recordingActions}>
        <TouchableOpacity style={styles.recordingCancelButton} onPress={onCancel}>
          <Ionicons name="close" size={24} color={Colors.error[500]} />
          <Text style={styles.recordingCancelText}>{t('chat.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.recordingStopButton} onPress={onStop}>
          <Ionicons name="send" size={24} color="#fff" />
          <Text style={styles.recordingStopText}>{t('chat.send')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  recordingContainer: {
    backgroundColor: Colors.background.primary,
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  recordingContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingPulse: {
    marginBottom: 12,
  },
  recordingDot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.error[500],
  },
  recordingDuration: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 4,
  },
  recordingText: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  recordingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  recordingCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  recordingCancelText: {
    fontSize: 16,
    color: Colors.error[500],
    fontWeight: '500',
  },
  recordingStopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 8,
  },
  recordingStopText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default RecordingUI;

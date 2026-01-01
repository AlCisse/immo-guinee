import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds
  primaryColor?: string;
}

export function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 300, // 5 minutes default
  primaryColor = '#10B981',
}: VoiceRecorderProps) {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnims = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.5),
    new Animated.Value(0.4),
    new Animated.Value(0.6),
    new Animated.Value(0.3),
  ]).current;

  // Request microphone permission
  useEffect(() => {
    const requestPermission = async () => {
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        setPermissionGranted(granted);
        if (!granted) {
          Alert.alert(
            t('chat.voiceRecording.permissionRequired'),
            t('chat.voiceRecording.microphoneAccess'),
            [{ text: t('common.ok'), onPress: onCancel }]
          );
        }
      } catch (error) {
        if (__DEV__) console.error('Error requesting audio permission:', error);
        onCancel();
      }
    };

    requestPermission();

    return () => {
      stopRecording(true);
    };
  }, [t, onCancel]);

  // Pulse animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Waveform animation
      const waveAnimations = waveAnims.map((anim, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 0.8 + Math.random() * 0.2,
              duration: 200 + index * 50,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.2 + Math.random() * 0.3,
              duration: 200 + index * 50,
              useNativeDriver: true,
            }),
          ])
        )
      );
      waveAnimations.forEach((anim) => anim.start());

      return () => {
        pulse.stop();
        waveAnimations.forEach((anim) => anim.stop());
      };
    }
  }, [isRecording]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!permissionGranted) return;

    try {
      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create recording with optimized settings for voice
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setDuration(0);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording(false);
          }
          return newDuration;
        });
      }, 1000);
    } catch (error) {
      if (__DEV__) console.error('Error starting recording:', error);
      Alert.alert(t('common.error'), t('chat.errors.startRecording'));
    }
  }, [permissionGranted, maxDuration]);

  // Stop recording
  const stopRecording = useCallback(
    async (cancelled: boolean) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (!recordingRef.current) return;

      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        const finalDuration = duration;

        // Reset audio mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });

        recordingRef.current = null;
        setIsRecording(false);

        if (!cancelled && uri && finalDuration >= 1) {
          onRecordingComplete(uri, finalDuration);
        } else if (!cancelled && finalDuration < 1) {
          Alert.alert('Message trop court', 'Maintenez pour enregistrer un message plus long.');
          onCancel();
        } else {
          onCancel();
        }
      } catch (error) {
        if (__DEV__) console.error('Error stopping recording:', error);
        onCancel();
      }
    },
    [duration, onRecordingComplete, onCancel]
  );

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-start recording when component mounts
  useEffect(() => {
    if (permissionGranted && !isRecording) {
      startRecording();
    }
  }, [permissionGranted]);

  return (
    <View style={styles.container}>
      {/* Waveform visualization */}
      <View style={styles.waveformContainer}>
        {waveAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.waveBar,
              {
                backgroundColor: primaryColor,
                transform: [{ scaleY: anim }],
              },
            ]}
          />
        ))}
      </View>

      {/* Duration */}
      <View style={styles.durationContainer}>
        <Animated.View
          style={[
            styles.recordingDot,
            {
              backgroundColor: '#EF4444',
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        <Text style={styles.maxDurationText}>/ {formatDuration(maxDuration)}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Cancel button */}
        <TouchableOpacity
          style={[styles.controlButton, styles.cancelButton]}
          onPress={() => stopRecording(true)}
        >
          <Ionicons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>

        {/* Stop/Send button */}
        <TouchableOpacity
          style={[styles.controlButton, styles.sendButton, { backgroundColor: primaryColor }]}
          onPress={() => stopRecording(false)}
        >
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Hint */}
      <Text style={styles.hintText}>
        Appuyez sur le bouton vert pour envoyer
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    gap: 4,
    marginBottom: 12,
  },
  waveBar: {
    width: 4,
    height: 30,
    borderRadius: 2,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  durationText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    fontVariant: ['tabular-nums'],
  },
  maxDurationText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 8,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
  sendButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hintText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default VoiceRecorder;

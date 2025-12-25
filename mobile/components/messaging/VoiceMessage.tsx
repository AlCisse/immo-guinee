import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

interface VoiceMessageProps {
  uri: string;
  duration?: number; // Duration in seconds
  isOwn?: boolean; // Is this message from the current user
  primaryColor?: string;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
}

// Playback speed options
const PLAYBACK_SPEEDS = [1, 1.5, 2];

export function VoiceMessage({
  uri,
  duration: initialDuration,
  isOwn = false,
  primaryColor = '#10B981',
  onPlaybackStart,
  onPlaybackEnd,
}: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(initialDuration || 0);
  const [speedIndex, setSpeedIndex] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Generate random waveform bars (simulate waveform data)
  const waveformBars = useRef(
    Array.from({ length: 20 }, () => 0.2 + Math.random() * 0.8)
  ).current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Update progress animation
  useEffect(() => {
    if (totalDuration > 0) {
      Animated.timing(progressAnim, {
        toValue: currentPosition / totalDuration,
        duration: 100,
        useNativeDriver: false,
      }).start();
    }
  }, [currentPosition, totalDuration]);

  // Handle playback status updates
  const onPlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        setIsLoading(false);
        return;
      }

      setIsPlaying(status.isPlaying);
      setCurrentPosition(status.positionMillis / 1000);

      if (status.durationMillis && totalDuration === 0) {
        setTotalDuration(status.durationMillis / 1000);
      }

      if (status.didJustFinish) {
        setIsPlaying(false);
        setCurrentPosition(0);
        onPlaybackEnd?.();
        progressAnim.setValue(0);
      }
    },
    [totalDuration, onPlaybackEnd]
  );

  // Load and play audio
  const loadAndPlay = useCallback(async () => {
    try {
      setIsLoading(true);

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Unload previous sound if exists
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Load new sound
      const { sound, status } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: true,
          rate: PLAYBACK_SPEEDS[speedIndex],
          shouldCorrectPitch: true,
        },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setIsLoading(false);
      onPlaybackStart?.();
    } catch (error) {
      if (__DEV__) console.error('Error loading audio:', error);
      setIsLoading(false);
    }
  }, [uri, speedIndex, onPlaybackStatusUpdate, onPlaybackStart]);

  // Toggle play/pause
  const togglePlayback = useCallback(async () => {
    if (isLoading) return;

    if (!soundRef.current) {
      await loadAndPlay();
      return;
    }

    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) {
      await loadAndPlay();
      return;
    }

    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      // If finished, replay from start
      if (status.didJustFinish || status.positionMillis >= (status.durationMillis || 0)) {
        await soundRef.current.setPositionAsync(0);
      }
      await soundRef.current.playAsync();
    }
  }, [isLoading, loadAndPlay]);

  // Cycle through playback speeds
  const cycleSpeed = useCallback(async () => {
    const newIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(newIndex);

    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        await soundRef.current.setRateAsync(PLAYBACK_SPEEDS[newIndex], true);
      }
    }
  }, [speedIndex]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate remaining time
  const remainingTime = totalDuration - currentPosition;

  return (
    <View
      style={[
        styles.container,
        isOwn ? styles.ownMessage : styles.otherMessage,
        { backgroundColor: isOwn ? primaryColor : '#F3F4F6' },
      ]}
    >
      {/* Play/Pause button */}
      <TouchableOpacity
        style={[
          styles.playButton,
          { backgroundColor: isOwn ? 'rgba(255,255,255,0.2)' : '#E5E7EB' },
        ]}
        onPress={togglePlayback}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={isOwn ? '#FFFFFF' : '#6B7280'}
          />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={20}
            color={isOwn ? '#FFFFFF' : '#1F2937'}
          />
        )}
      </TouchableOpacity>

      {/* Waveform and progress */}
      <View style={styles.waveformContainer}>
        <View style={styles.waveform}>
          {waveformBars.map((height, index) => {
            const progressWidth = progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 100],
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.waveBar,
                  {
                    height: height * 24,
                    backgroundColor:
                      index / waveformBars.length <= currentPosition / (totalDuration || 1)
                        ? isOwn
                          ? '#FFFFFF'
                          : primaryColor
                        : isOwn
                        ? 'rgba(255,255,255,0.4)'
                        : '#D1D5DB',
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Duration */}
        <View style={styles.timeContainer}>
          <Text
            style={[
              styles.timeText,
              { color: isOwn ? 'rgba(255,255,255,0.8)' : '#6B7280' },
            ]}
          >
            {isPlaying || currentPosition > 0
              ? formatTime(remainingTime)
              : formatTime(totalDuration || 0)}
          </Text>
        </View>
      </View>

      {/* Speed control */}
      <TouchableOpacity
        style={[
          styles.speedButton,
          { backgroundColor: isOwn ? 'rgba(255,255,255,0.2)' : '#E5E7EB' },
        ]}
        onPress={cycleSpeed}
      >
        <Text
          style={[
            styles.speedText,
            { color: isOwn ? '#FFFFFF' : '#1F2937' },
          ]}
        >
          {PLAYBACK_SPEEDS[speedIndex]}x
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    maxWidth: 280,
    gap: 8,
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformContainer: {
    flex: 1,
    gap: 4,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    gap: 2,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  timeContainer: {
    alignItems: 'flex-start',
  },
  timeText: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  speedButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  speedText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default VoiceMessage;

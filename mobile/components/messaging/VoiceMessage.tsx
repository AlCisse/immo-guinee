import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useAudioPlayer, AudioPlayer } from 'expo-audio';
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

  const player = useAudioPlayer(uri);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const positionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate random waveform bars (simulate waveform data)
  const waveformBars = useRef(
    Array.from({ length: 20 }, () => 0.2 + Math.random() * 0.8)
  ).current;

  // Update duration when player is ready
  useEffect(() => {
    if (player && player.duration && player.duration > 0) {
      setTotalDuration(player.duration);
    }
  }, [player?.duration]);

  // Track playback status
  useEffect(() => {
    if (!player) return;

    const updateStatus = () => {
      if (player.playing) {
        setIsPlaying(true);
        setIsLoading(false);
        setCurrentPosition(player.currentTime);
      } else {
        setIsPlaying(false);
      }
    };

    // Poll for status updates
    positionIntervalRef.current = setInterval(updateStatus, 100);

    return () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
    };
  }, [player]);

  // Handle playback end
  useEffect(() => {
    if (player && !player.playing && currentPosition > 0 && currentPosition >= totalDuration - 0.1) {
      setCurrentPosition(0);
      progressAnim.setValue(0);
      onPlaybackEnd?.();
    }
  }, [player?.playing, currentPosition, totalDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
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

  // Toggle play/pause
  const togglePlayback = useCallback(async () => {
    if (isLoading || !player) return;

    try {
      if (player.playing) {
        player.pause();
      } else {
        // If at the end, seek to start
        if (currentPosition >= totalDuration - 0.1) {
          player.seekTo(0);
          setCurrentPosition(0);
        }
        setIsLoading(true);
        player.play();
        onPlaybackStart?.();
        setIsLoading(false);
      }
    } catch (error) {
      if (__DEV__) console.error('Error toggling playback:', error);
      setIsLoading(false);
    }
  }, [player, isLoading, currentPosition, totalDuration, onPlaybackStart]);

  // Cycle through playback speeds
  const cycleSpeed = useCallback(() => {
    if (!player) return;

    const newIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(newIndex);
    player.setPlaybackRate(PLAYBACK_SPEEDS[newIndex]);
  }, [player, speedIndex]);

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

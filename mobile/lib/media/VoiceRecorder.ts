/**
 * VoiceRecorder.ts
 *
 * Voice recording service using expo-av.
 * Records audio in AAC format (m4a container) for maximum compatibility.
 *
 * Note: expo-av is deprecated but expo-audio is not yet available separately.
 * This will be migrated when expo-audio is released.
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Result of a completed recording
 */
export interface RecordingResult {
  /** URI to the recorded file */
  uri: string;
  /** Duration in seconds */
  duration: number;
  /** File size in bytes */
  fileSize: number;
  /** MIME type of the recording */
  mimeType: string;
}

/**
 * Recording state
 */
export interface RecordingState {
  /** Whether recording is in progress */
  isRecording: boolean;
  /** Current duration in milliseconds */
  durationMs: number;
  /** Metering level (-160 to 0 dB) */
  metering?: number;
}

/** Maximum recording duration in seconds */
export const MAX_RECORDING_DURATION = 300; // 5 minutes

/** Maximum file size in bytes */
export const MAX_RECORDING_SIZE = 10 * 1024 * 1024; // 10 MB

/** Current recording instance */
let currentRecording: Audio.Recording | null = null;

/** Recording start time */
let recordingStartTime: number = 0;

/** State update callback */
let stateCallback: ((state: RecordingState) => void) | null = null;

/** Metering interval */
let meteringInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Request microphone permission
 *
 * @returns True if permission granted
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  const permission = await Audio.requestPermissionsAsync();
  return permission.granted;
}

/**
 * Check if microphone permission is granted
 */
export async function hasMicrophonePermission(): Promise<boolean> {
  const permission = await Audio.getPermissionsAsync();
  return permission.granted;
}

/**
 * Start recording audio
 *
 * @param onStateChange - Callback for state updates (duration, metering)
 * @throws Error if permission not granted or recording fails
 */
export async function startRecording(
  onStateChange?: (state: RecordingState) => void
): Promise<void> {
  // Check if already recording
  if (currentRecording) {
    throw new Error('Recording already in progress');
  }

  // Request permission
  const hasPermission = await requestMicrophonePermission();
  if (!hasPermission) {
    throw new Error('Microphone permission required');
  }

  stateCallback = onStateChange || null;

  // Configure audio mode for recording
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    // Android
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });

  // Create recording with optimal settings for voice
  const { recording } = await Audio.Recording.createAsync(
    {
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
      isMeteringEnabled: true,
    },
    onRecordingStatusUpdate
  );

  currentRecording = recording;
  recordingStartTime = Date.now();

  // Start metering updates
  if (stateCallback) {
    meteringInterval = setInterval(updateMetering, 100);
  }
}

/**
 * Stop recording and return the result
 *
 * @returns Recording result with URI, duration, and size
 */
export async function stopRecording(): Promise<RecordingResult> {
  if (!currentRecording) {
    throw new Error('No active recording');
  }

  // Stop metering updates
  if (meteringInterval) {
    clearInterval(meteringInterval);
    meteringInterval = null;
  }

  try {
    await currentRecording.stopAndUnloadAsync();

    const uri = currentRecording.getURI();
    if (!uri) {
      throw new Error('Recording failed - no URI');
    }

    const status = await currentRecording.getStatusAsync();
    const fileInfo = await FileSystem.getInfoAsync(uri);

    const result: RecordingResult = {
      uri,
      duration: Math.round((status.durationMillis || 0) / 1000),
      fileSize: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
      mimeType: 'audio/mp4', // m4a container
    };

    // Cleanup
    currentRecording = null;
    stateCallback = null;
    recordingStartTime = 0;

    // Reset audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    return result;
  } catch (error) {
    // Cleanup on error
    currentRecording = null;
    stateCallback = null;
    recordingStartTime = 0;
    throw error;
  }
}

/**
 * Cancel the current recording without saving
 */
export async function cancelRecording(): Promise<void> {
  if (!currentRecording) {
    return;
  }

  // Stop metering updates
  if (meteringInterval) {
    clearInterval(meteringInterval);
    meteringInterval = null;
  }

  try {
    const uri = currentRecording.getURI();
    await currentRecording.stopAndUnloadAsync();

    // Delete the recorded file
    if (uri) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (error) {
    console.warn('[VoiceRecorder] Error canceling recording:', error);
  } finally {
    currentRecording = null;
    stateCallback = null;
    recordingStartTime = 0;

    // Reset audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    }).catch(() => {});
  }
}

/**
 * Check if currently recording
 */
export function isRecording(): boolean {
  return currentRecording !== null;
}

/**
 * Get current recording duration in seconds
 */
export function getCurrentDuration(): number {
  if (!recordingStartTime) {
    return 0;
  }
  return Math.floor((Date.now() - recordingStartTime) / 1000);
}

/**
 * Format duration as MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Recording status update callback
 */
function onRecordingStatusUpdate(status: Audio.RecordingStatus): void {
  if (!status.isRecording) {
    return;
  }

  // Check max duration
  if (status.durationMillis && status.durationMillis >= MAX_RECORDING_DURATION * 1000) {
    // Auto-stop at max duration
    stopRecording().catch(console.error);
    return;
  }

  // Update state
  if (stateCallback) {
    stateCallback({
      isRecording: true,
      durationMs: status.durationMillis || 0,
      metering: status.metering,
    });
  }
}

/**
 * Update metering for UI visualization
 */
async function updateMetering(): Promise<void> {
  if (!currentRecording || !stateCallback) {
    return;
  }

  try {
    const status = await currentRecording.getStatusAsync();
    if (status.isRecording) {
      stateCallback({
        isRecording: true,
        durationMs: status.durationMillis || 0,
        metering: status.metering,
      });
    }
  } catch (error) {
    // Ignore errors during metering updates
  }
}

/**
 * Convert metering level to normalized amplitude (0-1)
 * Metering is in dB (-160 to 0)
 */
export function meteringToAmplitude(metering: number | undefined): number {
  if (metering === undefined || metering < -60) {
    return 0;
  }
  // Normalize from -60..0 dB to 0..1
  const normalized = (metering + 60) / 60;
  return Math.min(1, Math.max(0, normalized));
}

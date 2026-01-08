/**
 * VoiceRecorder.ts
 *
 * Voice recording service using expo-audio (SDK 54+).
 * Records audio in AAC format (m4a container) for maximum compatibility.
 *
 * Migrated from expo-av to expo-audio.
 */

import {
  useAudioRecorder,
  AudioModule,
  RecordingOptions,
  RecordingPresets,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system';

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

/** Recording options optimized for voice */
const VOICE_RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 128000,
};

/** Current recording URI */
let currentRecordingUri: string | null = null;

/** Recording start time */
let recordingStartTime: number = 0;

/** State update callback */
let stateCallback: ((state: RecordingState) => void) | null = null;

/** Duration interval */
let durationInterval: ReturnType<typeof setInterval> | null = null;

/** Is currently recording */
let isCurrentlyRecording = false;

/** Audio recorder instance (managed externally via hook in components) */
let audioRecorderInstance: ReturnType<typeof useAudioRecorder> | null = null;

/**
 * Request microphone permission
 *
 * @returns True if permission granted
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  const status = await AudioModule.requestRecordingPermissionsAsync();
  return status.granted;
}

/**
 * Check if microphone permission is granted
 */
export async function hasMicrophonePermission(): Promise<boolean> {
  const status = await AudioModule.getRecordingPermissionsAsync();
  return status.granted;
}

/**
 * Set the audio recorder instance (called from component using the hook)
 */
export function setAudioRecorder(
  recorder: ReturnType<typeof useAudioRecorder> | null
): void {
  audioRecorderInstance = recorder;
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
  if (isCurrentlyRecording) {
    throw new Error('Recording already in progress');
  }

  // Request permission
  const hasPermission = await requestMicrophonePermission();
  if (!hasPermission) {
    throw new Error('Microphone permission required');
  }

  stateCallback = onStateChange || null;
  recordingStartTime = Date.now();
  isCurrentlyRecording = true;

  // Start duration tracking
  if (stateCallback) {
    durationInterval = setInterval(() => {
      const elapsed = Date.now() - recordingStartTime;

      // Check max duration
      if (elapsed >= MAX_RECORDING_DURATION * 1000) {
        stopRecording().catch(() => {});
        return;
      }

      stateCallback?.({
        isRecording: true,
        durationMs: elapsed,
        metering: undefined, // expo-audio doesn't provide real-time metering in the same way
      });
    }, 100);
  }
}

/**
 * Set recording URI (called when recording starts via hook)
 */
export function setRecordingUri(uri: string | null): void {
  currentRecordingUri = uri;
}

/**
 * Stop recording and return the result
 *
 * @returns Recording result with URI, duration, and size
 */
export async function stopRecording(): Promise<RecordingResult> {
  if (!isCurrentlyRecording) {
    throw new Error('No active recording');
  }

  // Stop duration tracking
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }

  const duration = Math.round((Date.now() - recordingStartTime) / 1000);
  const uri = currentRecordingUri;

  if (!uri) {
    throw new Error('Recording failed - no URI');
  }

  let fileSize = 0;
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
  } catch {
    // Ignore file info errors
  }

  const result: RecordingResult = {
    uri,
    duration,
    fileSize,
    mimeType: 'audio/mp4', // m4a container
  };

  // Cleanup
  currentRecordingUri = null;
  stateCallback = null;
  recordingStartTime = 0;
  isCurrentlyRecording = false;

  return result;
}

/**
 * Cancel the current recording without saving
 */
export async function cancelRecording(): Promise<void> {
  if (!isCurrentlyRecording) {
    return;
  }

  // Stop duration tracking
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }

  try {
    // Delete the recorded file
    if (currentRecordingUri) {
      await FileSystem.deleteAsync(currentRecordingUri, { idempotent: true });
    }
  } catch (error) {
    if (__DEV__) console.warn('[VoiceRecorder] Error canceling recording:', error);
  } finally {
    currentRecordingUri = null;
    stateCallback = null;
    recordingStartTime = 0;
    isCurrentlyRecording = false;
  }
}

/**
 * Check if currently recording
 */
export function isRecording(): boolean {
  return isCurrentlyRecording;
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

/**
 * Get recording options for voice
 */
export function getVoiceRecordingOptions(): RecordingOptions {
  return VOICE_RECORDING_OPTIONS;
}

/**
 * Media module exports
 *
 * Voice recording, image/video picker, and media utilities.
 */

// Voice Recorder
export {
  startRecording,
  stopRecording,
  cancelRecording,
  isRecording,
  getCurrentDuration,
  formatDuration as formatVoiceDuration,
  requestMicrophonePermission,
  hasMicrophonePermission,
  meteringToAmplitude,
  MAX_RECORDING_DURATION,
  MAX_RECORDING_SIZE,
} from './VoiceRecorder';

export type { RecordingResult, RecordingState } from './VoiceRecorder';

// Media Picker
export {
  pickImage,
  pickVideo,
  pickMedia,
  takePhoto,
  recordVideo,
  requestMediaLibraryPermission,
  requestCameraPermission,
  hasMediaLibraryPermission,
  hasCameraPermission,
  formatFileSize,
  formatDuration as formatMediaDuration,
  getMediaTypeLabel,
  isVideoUri,
  isVideoMimeType,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_VIDEO_DURATION,
} from './MediaPicker';

export type { PickedMedia } from './MediaPicker';

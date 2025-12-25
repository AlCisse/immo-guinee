/**
 * Services module exports
 */

export {
  sendEncryptedMedia,
  receiveEncryptedMedia,
  getMediaForDisplay,
  isMediaAvailable,
  getMediaInfo,
  removeMedia,
  pickedMediaToOptions,
  recordingToOptions,
  sendPickedMedia,
  sendVoiceRecording,
  preloadConversationMedia,
} from './EncryptedMediaService';

export type {
  MediaType,
  SendMediaOptions,
  SendMediaResult,
  ReceiveMediaOptions,
} from './EncryptedMediaService';

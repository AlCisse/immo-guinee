/**
 * EncryptedMediaService.ts
 *
 * Orchestrates E2E encrypted media sending and receiving.
 *
 * Flow:
 * 1. SENDER: Pick media → Encrypt with AES-256-GCM → Upload blob → Store locally → Send key via WebSocket
 * 2. RECEIVER: Receive key via WebSocket → Download blob → Store locally with key → Confirm download
 *
 * The server NEVER has access to decryption keys.
 */

// Note: Using legacy import until full migration to new File/Directory API
import * as FileSystem from 'expo-file-system/legacy';
import { apiClient } from '@/lib/api/client';
import {
  encryptMedia,
  decryptMedia,
  generateMediaKey,
  uint8ArrayToBase64,
  base64ToUint8Array,
  arrayBufferToBase64,
} from '@/lib/crypto';
import {
  storeEncryptedMedia,
  loadDecryptedMedia,
  getDecryptedMediaUri,
  hasLocalMedia,
  deleteLocalMedia,
  getMediaMetadata,
  StoredMediaMeta,
} from '@/lib/storage';
import type { PickedMedia } from '@/lib/media';
import type { RecordingResult } from '@/lib/media';

/**
 * Media type enum matching backend
 */
export type MediaType = 'VOCAL' | 'PHOTO' | 'VIDEO';

/**
 * Options for sending encrypted media
 */
export interface SendMediaOptions {
  /** Conversation ID */
  conversationId: string;
  /** Current user ID */
  senderId: string;
  /** Media URI (file path) */
  uri: string;
  /** Media type */
  mediaType: MediaType;
  /** MIME type */
  mimeType: string;
  /** Original file size */
  originalSize: number;
  /** Duration in seconds (for audio/video) */
  duration?: number;
}

/**
 * Result of sending encrypted media
 */
export interface SendMediaResult {
  /** Server-assigned media ID */
  mediaId: string;
  /** Base64-encoded encryption key (to send via WebSocket) */
  encryptionKey: string;
  /** Media type */
  mediaType: MediaType;
  /** Original file size */
  originalSize: number;
  /** Duration in seconds */
  duration?: number;
}

/**
 * Options for receiving encrypted media
 */
export interface ReceiveMediaOptions {
  /** Media ID from server */
  mediaId: string;
  /** Base64-encoded encryption key (from WebSocket) */
  encryptionKey: string;
  /** Conversation ID */
  conversationId: string;
  /** Sender user ID */
  senderId: string;
}

/**
 * Send encrypted media
 *
 * 1. Reads file from URI
 * 2. Generates AES-256 key
 * 3. Encrypts media
 * 4. Uploads encrypted blob to server
 * 5. Stores locally for sender
 * 6. Returns key to include in WebSocket message
 *
 * @param options - Send options
 * @returns Media ID and encryption key
 */
export async function sendEncryptedMedia(
  options: SendMediaOptions
): Promise<SendMediaResult> {
  const { conversationId, senderId, uri, mediaType, mimeType, originalSize, duration } = options;

  if (__DEV__) {
    console.log('[EncryptedMediaService] Sending media:', { mediaType, mimeType, originalSize });
  }

  // 1. Read file as base64
  const base64Content = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });

  // Convert base64 to ArrayBuffer
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const plainData = bytes.buffer;

  // 2. Generate encryption key
  const key = await generateMediaKey();

  // 3. Encrypt media
  const encryptResult = await encryptMedia(plainData, key);
  const { encryptedData, iv, authTag } = encryptResult;

  // 4. Upload encrypted blob to server
  // Write encrypted data to temp file (React Native requires file URI for FormData)
  const tempDir = FileSystem.cacheDirectory + 'encrypted_uploads/';
  await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true }).catch(() => {});

  const tempFilePath = tempDir + `encrypted_${Date.now()}.bin`;
  const encryptedBase64 = uint8ArrayToBase64(encryptedData);
  await FileSystem.writeAsStringAsync(tempFilePath, encryptedBase64, {
    encoding: 'base64',
  });

  const formData = new FormData();

  // Use file URI for proper multipart upload
  formData.append('blob', {
    uri: tempFilePath,
    name: `encrypted_${Date.now()}.bin`,
    type: 'application/octet-stream',
  } as any);

  formData.append('media_type', mediaType);
  formData.append('iv', uint8ArrayToBase64(iv));
  formData.append('auth_tag', uint8ArrayToBase64(authTag));
  formData.append('original_size', originalSize.toString());
  formData.append('mime_type', mimeType);

  // duration_seconds must be >= 1 for backend validation
  if (duration !== undefined && duration >= 1) {
    formData.append('duration_seconds', Math.round(duration).toString());
  } else if (duration !== undefined && duration > 0) {
    // Round up to 1 for very short recordings
    formData.append('duration_seconds', '1');
  }

  let response;
  try {
    response = await apiClient.post(
      `/messaging/${conversationId}/encrypted-media`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 180000, // 3 minutes for upload
      }
    );
  } finally {
    // Clean up temp file
    await FileSystem.deleteAsync(tempFilePath, { idempotent: true }).catch(() => {});
  }

  const mediaId = response.data.data.id;

  // 5. Store locally for sender (so they can view their own media)
  await storeEncryptedMedia(mediaId, encryptedData, key, iv, authTag, {
    type: mediaType,
    mimeType,
    originalSize,
    duration,
    conversationId,
    senderId,
  });

  // 6. Return key for WebSocket message
  const encryptionKey = uint8ArrayToBase64(key);

  if (__DEV__) {
    console.log('[EncryptedMediaService] Media sent successfully:', mediaId);
  }

  return {
    mediaId,
    encryptionKey,
    mediaType,
    originalSize,
    duration,
  };
}

/**
 * Receive and store encrypted media
 *
 * 1. Downloads encrypted blob from server
 * 2. Extracts IV/authTag from response headers
 * 3. Decodes key from WebSocket message
 * 4. Stores locally with key
 * 5. Confirms download to server
 *
 * @param options - Receive options
 */
export async function receiveEncryptedMedia(
  options: ReceiveMediaOptions
): Promise<void> {
  const { mediaId, encryptionKey, conversationId, senderId } = options;

  if (__DEV__) {
    console.log('[EncryptedMediaService] Receiving media:', mediaId);
  }

  // Check if already stored locally
  if (await hasLocalMedia(mediaId)) {
    if (__DEV__) {
      console.log('[EncryptedMediaService] Media already stored locally:', mediaId);
    }
    return;
  }

  // 1. Download encrypted blob
  const response = await apiClient.get(`/messaging/encrypted-media/${mediaId}/download`, {
    responseType: 'arraybuffer',
    timeout: 180000, // 3 minutes for download
  });

  // 2. Extract metadata from headers (lowercase for axios compatibility)
  const ivBase64 = response.headers['x-media-iv'];
  const authTagBase64 = response.headers['x-media-authtag'];
  const mimeType = response.headers['x-original-mimetype'] || 'application/octet-stream';
  const originalSize = parseInt(response.headers['x-original-size'] || '0', 10);
  const durationStr = response.headers['x-duration-seconds'];
  const duration = durationStr ? parseInt(durationStr, 10) : undefined;
  const mediaType = (response.headers['x-media-type'] || 'PHOTO') as MediaType;

  if (!ivBase64 || !authTagBase64) {
    throw new Error('Missing encryption metadata in response headers');
  }

  // 3. Decode key and metadata
  const key = base64ToUint8Array(encryptionKey);
  const iv = base64ToUint8Array(ivBase64);
  const authTag = base64ToUint8Array(authTagBase64);

  // Convert response to Uint8Array
  const encryptedData = new Uint8Array(response.data);

  // 4. Store locally with key (encrypted)
  await storeEncryptedMedia(mediaId, encryptedData, key, iv, authTag, {
    type: mediaType,
    mimeType,
    originalSize,
    duration,
    conversationId,
    senderId,
  });

  // 5. Confirm download to server (triggers deletion from server)
  try {
    const confirmResponse = await apiClient.post(`/messaging/encrypted-media/${mediaId}/confirm-download`);
    if (__DEV__) {
      const isDeleted = confirmResponse.data?.data?.is_deleted;
      console.log('[EncryptedMediaService] Download confirmed, deleted from server:', mediaId, isDeleted ? '✓' : '(pending)');
    }
  } catch (error) {
    // Non-critical - server will clean up based on TTL anyway
    if (__DEV__) {
      console.warn('[EncryptedMediaService] Failed to confirm download:', error);
    }
  }

  if (__DEV__) {
    console.log('[EncryptedMediaService] Media stored locally:', mediaId);
  }
}

/**
 * Get decrypted media URI for display
 *
 * Loads from local storage, decrypts, and returns a temporary file URI.
 *
 * @param mediaId - Media ID
 * @returns Local file URI or null if not found
 */
export async function getMediaForDisplay(mediaId: string): Promise<string | null> {
  const meta = await getMediaMetadata(mediaId);
  if (!meta) {
    return null;
  }

  return getDecryptedMediaUri(mediaId, meta.mimeType);
}

/**
 * Check if media is available locally
 *
 * @param mediaId - Media ID
 * @returns True if available
 */
export async function isMediaAvailable(mediaId: string): Promise<boolean> {
  return hasLocalMedia(mediaId);
}

/**
 * Get media metadata
 *
 * @param mediaId - Media ID
 * @returns Metadata or null
 */
export async function getMediaInfo(mediaId: string): Promise<StoredMediaMeta | null> {
  return getMediaMetadata(mediaId);
}

/**
 * Delete media from local storage
 *
 * @param mediaId - Media ID
 */
export async function removeMedia(mediaId: string): Promise<void> {
  await deleteLocalMedia(mediaId);
}

/**
 * Helper: Convert PickedMedia to SendMediaOptions
 */
export function pickedMediaToOptions(
  media: PickedMedia,
  conversationId: string,
  senderId: string
): SendMediaOptions {
  let mediaType: MediaType;
  if (media.type === 'video') {
    mediaType = 'VIDEO';
  } else {
    mediaType = 'PHOTO';
  }

  return {
    conversationId,
    senderId,
    uri: media.uri,
    mediaType,
    mimeType: media.mimeType,
    originalSize: media.fileSize,
    duration: media.duration ? media.duration / 1000 : undefined, // Convert ms to seconds
  };
}

/**
 * Helper: Convert RecordingResult to SendMediaOptions
 */
export function recordingToOptions(
  recording: RecordingResult,
  conversationId: string,
  senderId: string
): SendMediaOptions {
  return {
    conversationId,
    senderId,
    uri: recording.uri,
    mediaType: 'VOCAL',
    mimeType: recording.mimeType,
    originalSize: recording.fileSize,
    duration: recording.duration,
  };
}

/**
 * Send a picked image or video
 *
 * Convenience method combining pickedMediaToOptions and sendEncryptedMedia.
 *
 * @param media - Picked media
 * @param conversationId - Conversation ID
 * @param senderId - Sender user ID
 * @returns Send result with key
 */
export async function sendPickedMedia(
  media: PickedMedia,
  conversationId: string,
  senderId: string
): Promise<SendMediaResult> {
  const options = pickedMediaToOptions(media, conversationId, senderId);
  return sendEncryptedMedia(options);
}

/**
 * Send a voice recording
 *
 * Convenience method combining recordingToOptions and sendEncryptedMedia.
 *
 * @param recording - Recording result
 * @param conversationId - Conversation ID
 * @param senderId - Sender user ID
 * @returns Send result with key
 */
export async function sendVoiceRecording(
  recording: RecordingResult,
  conversationId: string,
  senderId: string
): Promise<SendMediaResult> {
  const options = recordingToOptions(recording, conversationId, senderId);
  return sendEncryptedMedia(options);
}

/**
 * Preload media for a conversation
 *
 * Downloads any pending encrypted media for messages that have keys but aren't stored locally.
 *
 * @param pendingMedia - Array of { mediaId, encryptionKey, conversationId, senderId }
 */
export async function preloadConversationMedia(
  pendingMedia: Array<{
    mediaId: string;
    encryptionKey: string;
    conversationId: string;
    senderId: string;
  }>
): Promise<void> {
  const downloadPromises = pendingMedia.map(async (item) => {
    try {
      const hasLocal = await hasLocalMedia(item.mediaId);
      if (!hasLocal) {
        await receiveEncryptedMedia(item);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[EncryptedMediaService] Failed to preload media:', item.mediaId, error);
      }
    }
  });

  await Promise.all(downloadPromises);
}

/**
 * LocalMediaStorage.ts
 *
 * Local storage for E2E encrypted media files.
 * - Encrypted data stored in file system (expo-file-system)
 * - Encryption keys stored in SecureStore (iOS Keychain / Android Keystore)
 * - Metadata stored in SecureStore
 *
 * The server never has access to decryption keys.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import {
  decryptMedia,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '@/lib/crypto/MediaEncryption';

/** Directory for encrypted media files */
const MEDIA_DIR = `${FileSystem.documentDirectory}encrypted_media/`;

/** Prefix for encryption keys in SecureStore */
const KEY_PREFIX = 'media_key_';

/** Prefix for metadata in SecureStore */
const META_PREFIX = 'media_meta_';

/** Prefix for pending encryption keys (received via WebSocket but not yet downloaded) */
const PENDING_KEY_PREFIX = 'pending_key_';

/**
 * Metadata stored for each encrypted media
 */
export interface StoredMediaMeta {
  /** Unique media ID */
  id: string;
  /** Media type */
  type: 'VOCAL' | 'PHOTO' | 'VIDEO';
  /** Base64 encoded IV */
  iv: string;
  /** Base64 encoded auth tag */
  authTag: string;
  /** Original MIME type */
  mimeType: string;
  /** Original file size in bytes */
  originalSize: number;
  /** Duration in seconds (for audio/video) */
  duration?: number;
  /** Conversation ID */
  conversationId: string;
  /** Sender user ID */
  senderId: string;
  /** When stored locally */
  createdAt: string;
}

/**
 * Initialize the media storage directory
 */
export async function initMediaStorage(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(MEDIA_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
  }
}

/**
 * Store encrypted media locally
 *
 * @param mediaId - Unique media identifier
 * @param encryptedData - The encrypted media data
 * @param key - The decryption key (stored in SecureStore)
 * @param iv - The initialization vector
 * @param authTag - The authentication tag
 * @param meta - Media metadata
 */
export async function storeEncryptedMedia(
  mediaId: string,
  encryptedData: Uint8Array,
  key: Uint8Array,
  iv: Uint8Array,
  authTag: Uint8Array,
  meta: Omit<StoredMediaMeta, 'id' | 'iv' | 'authTag' | 'createdAt'>
): Promise<void> {
  await initMediaStorage();

  // Store encrypted data to file system
  const filePath = `${MEDIA_DIR}${mediaId}.enc`;
  const base64Data = uint8ArrayToBase64(encryptedData);
  await FileSystem.writeAsStringAsync(filePath, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Store key in SecureStore (encrypted by device)
  const keyBase64 = uint8ArrayToBase64(key);
  await SecureStore.setItemAsync(`${KEY_PREFIX}${mediaId}`, keyBase64);

  // Store metadata in SecureStore
  const fullMeta: StoredMediaMeta = {
    id: mediaId,
    iv: uint8ArrayToBase64(iv),
    authTag: uint8ArrayToBase64(authTag),
    createdAt: new Date().toISOString(),
    ...meta,
  };
  await SecureStore.setItemAsync(`${META_PREFIX}${mediaId}`, JSON.stringify(fullMeta));
}

/**
 * Load and decrypt media from local storage
 *
 * @param mediaId - The media ID to load
 * @returns Decrypted data as ArrayBuffer, or null if not found
 */
export async function loadDecryptedMedia(mediaId: string): Promise<ArrayBuffer | null> {
  try {
    const filePath = `${MEDIA_DIR}${mediaId}.enc`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);

    if (!fileInfo.exists) {
      return null;
    }

    // Load encrypted data
    const base64Data = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const encryptedData = base64ToUint8Array(base64Data);

    // Load key from SecureStore
    const keyBase64 = await SecureStore.getItemAsync(`${KEY_PREFIX}${mediaId}`);
    if (!keyBase64) {
      console.warn('[LocalMediaStorage] Key not found for media:', mediaId);
      return null;
    }
    const key = base64ToUint8Array(keyBase64);

    // Load metadata for IV and authTag
    const metaJson = await SecureStore.getItemAsync(`${META_PREFIX}${mediaId}`);
    if (!metaJson) {
      console.warn('[LocalMediaStorage] Metadata not found for media:', mediaId);
      return null;
    }
    const meta: StoredMediaMeta = JSON.parse(metaJson);
    const iv = base64ToUint8Array(meta.iv);
    const authTag = base64ToUint8Array(meta.authTag);

    // Decrypt and return
    return await decryptMedia(encryptedData, iv, key, authTag);
  } catch (error) {
    console.error('[LocalMediaStorage] Failed to load media:', mediaId, error);
    return null;
  }
}

/**
 * Get metadata for a stored media
 *
 * @param mediaId - The media ID
 * @returns Metadata or null if not found
 */
export async function getMediaMetadata(mediaId: string): Promise<StoredMediaMeta | null> {
  try {
    const metaJson = await SecureStore.getItemAsync(`${META_PREFIX}${mediaId}`);
    if (!metaJson) {
      return null;
    }
    return JSON.parse(metaJson);
  } catch (error) {
    console.error('[LocalMediaStorage] Failed to get metadata:', mediaId, error);
    return null;
  }
}

/**
 * Check if media exists locally
 *
 * @param mediaId - The media ID
 * @returns True if media exists
 */
export async function hasLocalMedia(mediaId: string): Promise<boolean> {
  const filePath = `${MEDIA_DIR}${mediaId}.enc`;
  const fileInfo = await FileSystem.getInfoAsync(filePath);
  return fileInfo.exists;
}

/**
 * Store a pending encryption key (received via WebSocket but media not yet downloaded)
 * This allows us to download the media later if the initial download failed
 *
 * @param mediaId - The media ID
 * @param encryptionKey - Base64 encoded encryption key
 * @param conversationId - The conversation ID
 * @param senderId - The sender user ID
 */
export async function storePendingKey(
  mediaId: string,
  encryptionKey: string,
  conversationId: string,
  senderId: string
): Promise<void> {
  try {
    const data = JSON.stringify({ encryptionKey, conversationId, senderId, storedAt: new Date().toISOString() });
    await SecureStore.setItemAsync(`${PENDING_KEY_PREFIX}${mediaId}`, data);
    if (__DEV__) {
      console.log('[LocalMediaStorage] Stored pending key for:', mediaId);
    }
  } catch (error) {
    console.error('[LocalMediaStorage] Failed to store pending key:', mediaId, error);
  }
}

/**
 * Get a pending encryption key
 *
 * @param mediaId - The media ID
 * @returns Pending key data or null
 */
export async function getPendingKey(mediaId: string): Promise<{
  encryptionKey: string;
  conversationId: string;
  senderId: string;
} | null> {
  try {
    const data = await SecureStore.getItemAsync(`${PENDING_KEY_PREFIX}${mediaId}`);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('[LocalMediaStorage] Failed to get pending key:', mediaId, error);
    return null;
  }
}

/**
 * Delete a pending encryption key (after successful download)
 *
 * @param mediaId - The media ID
 */
export async function deletePendingKey(mediaId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(`${PENDING_KEY_PREFIX}${mediaId}`);
  } catch (error) {
    // Ignore errors when deleting
  }
}

/**
 * Delete media from local storage
 *
 * @param mediaId - The media ID to delete
 */
export async function deleteLocalMedia(mediaId: string): Promise<void> {
  try {
    const filePath = `${MEDIA_DIR}${mediaId}.enc`;
    await FileSystem.deleteAsync(filePath, { idempotent: true });
    await SecureStore.deleteItemAsync(`${KEY_PREFIX}${mediaId}`);
    await SecureStore.deleteItemAsync(`${META_PREFIX}${mediaId}`);
  } catch (error) {
    console.error('[LocalMediaStorage] Failed to delete media:', mediaId, error);
  }
}

/**
 * Delete all media for a conversation
 *
 * @param conversationId - The conversation ID
 */
export async function deleteConversationMedia(conversationId: string): Promise<void> {
  try {
    const files = await FileSystem.readDirectoryAsync(MEDIA_DIR);

    for (const file of files) {
      if (file.endsWith('.enc')) {
        const mediaId = file.replace('.enc', '');
        const meta = await getMediaMetadata(mediaId);
        if (meta && meta.conversationId === conversationId) {
          await deleteLocalMedia(mediaId);
        }
      }
    }
  } catch (error) {
    console.error('[LocalMediaStorage] Failed to delete conversation media:', error);
  }
}

/**
 * Get storage statistics
 *
 * @returns Count and total size of stored media
 */
export async function getStorageStats(): Promise<{
  count: number;
  totalSize: number;
  formattedSize: string;
}> {
  try {
    await initMediaStorage();
    const files = await FileSystem.readDirectoryAsync(MEDIA_DIR);
    let totalSize = 0;
    let count = 0;

    for (const file of files) {
      if (file.endsWith('.enc')) {
        const info = await FileSystem.getInfoAsync(`${MEDIA_DIR}${file}`);
        if (info.exists && 'size' in info && info.size) {
          totalSize += info.size;
          count++;
        }
      }
    }

    return {
      count,
      totalSize,
      formattedSize: formatBytes(totalSize),
    };
  } catch (error) {
    console.error('[LocalMediaStorage] Failed to get stats:', error);
    return { count: 0, totalSize: 0, formattedSize: '0 bytes' };
  }
}

/**
 * Clear all stored media (for logout)
 */
export async function clearAllMedia(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(MEDIA_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(MEDIA_DIR, { idempotent: true });
    }
    // Note: SecureStore items need to be cleared individually
    // This is a limitation - consider tracking all media IDs separately
  } catch (error) {
    console.error('[LocalMediaStorage] Failed to clear all media:', error);
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) {
    return (bytes / 1073741824).toFixed(2) + ' GB';
  }
  if (bytes >= 1048576) {
    return (bytes / 1048576).toFixed(2) + ' MB';
  }
  if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  }
  return bytes + ' bytes';
}

/**
 * Create a local file URI for decrypted media (for display)
 *
 * @param mediaId - The media ID
 * @param mimeType - The MIME type of the media
 * @returns Local file URI or null
 */
export async function getDecryptedMediaUri(
  mediaId: string,
  mimeType: string
): Promise<string | null> {
  try {
    const decrypted = await loadDecryptedMedia(mediaId);
    if (!decrypted) {
      return null;
    }

    // Create a temporary file with the decrypted content
    const extension = getExtensionFromMimeType(mimeType);
    const tempPath = `${FileSystem.cacheDirectory}decrypted_${mediaId}.${extension}`;

    // Write decrypted data to temp file
    const base64 = uint8ArrayToBase64(new Uint8Array(decrypted));
    await FileSystem.writeAsStringAsync(tempPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return tempPath;
  } catch (error) {
    console.error('[LocalMediaStorage] Failed to create decrypted URI:', error);
    return null;
  }
}

/**
 * Clean up temporary decrypted files
 */
export async function cleanupDecryptedCache(): Promise<void> {
  try {
    if (!FileSystem.cacheDirectory) return;

    const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
    for (const file of files) {
      if (file.startsWith('decrypted_')) {
        await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${file}`, { idempotent: true });
      }
    }
  } catch (error) {
    console.error('[LocalMediaStorage] Failed to cleanup cache:', error);
  }
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
  };
  return map[mimeType] || 'bin';
}

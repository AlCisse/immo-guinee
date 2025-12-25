/**
 * Storage module exports
 *
 * Local storage for E2E encrypted media.
 */

export {
  initMediaStorage,
  storeEncryptedMedia,
  loadDecryptedMedia,
  getMediaMetadata,
  hasLocalMedia,
  deleteLocalMedia,
  deleteConversationMedia,
  getStorageStats,
  clearAllMedia,
  getDecryptedMediaUri,
  cleanupDecryptedCache,
  storePendingKey,
  getPendingKey,
  deletePendingKey,
} from './LocalMediaStorage';

export type { StoredMediaMeta } from './LocalMediaStorage';

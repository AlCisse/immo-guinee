/**
 * Crypto module exports
 *
 * AES-256-GCM encryption for E2E encrypted media.
 */

export {
  encryptMedia,
  decryptMedia,
  generateMediaKey,
  generateIV,
  uint8ArrayToBase64,
  base64ToUint8Array,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  prepareMetadata,
  parseMetadata,
} from './MediaEncryption';

export type {
  EncryptedMediaResult,
  EncryptionMetadata,
} from './MediaEncryption';

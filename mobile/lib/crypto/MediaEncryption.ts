/**
 * MediaEncryption.ts
 *
 * AES-256-GCM encryption/decryption for E2E encrypted media.
 * Uses @noble/ciphers - a pure JavaScript implementation that works in Expo Go.
 *
 * The encryption key is generated per-message and NEVER sent to the server.
 * Only the encrypted blob, IV, and auth tag are stored server-side.
 */

import * as ExpoCrypto from 'expo-crypto';
import { gcm } from '@noble/ciphers/aes';

/**
 * Result of encrypting media
 */
export interface EncryptedMediaResult {
  /** Encrypted data (ciphertext with auth tag appended) */
  encryptedData: Uint8Array;
  /** Initialization vector (12 bytes for AES-GCM) */
  iv: Uint8Array;
  /** Encryption key (32 bytes for AES-256) - NEVER send to server */
  key: Uint8Array;
  /** Authentication tag (16 bytes) */
  authTag: Uint8Array;
}

/**
 * Encryption metadata for transmission/storage
 */
export interface EncryptionMetadata {
  /** Base64 encoded IV */
  iv: string;
  /** Base64 encoded auth tag */
  authTag: string;
  /** Original file size in bytes */
  originalSize: number;
  /** Original MIME type */
  mimeType: string;
  /** Duration in seconds (for audio/video) */
  duration?: number;
}

/**
 * Generate a random AES-256 encryption key (32 bytes)
 */
export async function generateMediaKey(): Promise<Uint8Array> {
  const keyBytes = await ExpoCrypto.getRandomBytesAsync(32);
  return new Uint8Array(keyBytes);
}

/**
 * Generate a random initialization vector (12 bytes for AES-GCM)
 */
export async function generateIV(): Promise<Uint8Array> {
  const ivBytes = await ExpoCrypto.getRandomBytesAsync(12);
  return new Uint8Array(ivBytes);
}

/**
 * Encrypt media data using AES-256-GCM
 *
 * @param plainData - The raw media data to encrypt
 * @param key - Optional encryption key (generated if not provided)
 * @returns EncryptedMediaResult with ciphertext, IV, key, and auth tag
 */
export async function encryptMedia(
  plainData: ArrayBuffer,
  key?: Uint8Array
): Promise<EncryptedMediaResult> {
  // Generate key if not provided
  const encryptionKey = key || (await generateMediaKey());
  const iv = await generateIV();

  // Create AES-GCM cipher
  const aes = gcm(encryptionKey, iv);

  // Encrypt - @noble/ciphers appends auth tag to ciphertext
  const plainArray = new Uint8Array(plainData);
  const encryptedWithTag = aes.encrypt(plainArray);

  // Split ciphertext and auth tag (last 16 bytes)
  const ciphertext = encryptedWithTag.slice(0, -16);
  const authTag = encryptedWithTag.slice(-16);

  return {
    encryptedData: ciphertext,
    iv,
    key: encryptionKey,
    authTag,
  };
}

/**
 * Decrypt media data using AES-256-GCM
 *
 * @param encryptedData - The encrypted ciphertext (without auth tag)
 * @param iv - The initialization vector used for encryption
 * @param key - The decryption key
 * @param authTag - The authentication tag
 * @returns Decrypted data as ArrayBuffer
 * @throws Error if decryption fails (invalid key, tampered data, etc.)
 */
export async function decryptMedia(
  encryptedData: Uint8Array,
  iv: Uint8Array,
  key: Uint8Array,
  authTag: Uint8Array
): Promise<ArrayBuffer> {
  // Reconstruct ciphertext with auth tag appended
  const combined = new Uint8Array(encryptedData.length + authTag.length);
  combined.set(encryptedData);
  combined.set(authTag, encryptedData.length);

  // Create AES-GCM cipher
  const aes = gcm(key, iv);

  // Decrypt - this will throw if auth tag doesn't match
  try {
    const decrypted = aes.decrypt(combined);
    return decrypted.buffer as ArrayBuffer;
  } catch (error) {
    throw new Error('Decryption failed: Invalid key or data has been tampered');
  }
}

/**
 * Convert Uint8Array to Base64 string
 */
export function uint8ArrayToBase64(array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return array;
}

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return uint8ArrayToBase64(new Uint8Array(buffer));
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return base64ToUint8Array(base64).buffer as ArrayBuffer;
}

/**
 * Prepare encryption metadata for transmission
 */
export function prepareMetadata(
  result: EncryptedMediaResult,
  originalSize: number,
  mimeType: string,
  duration?: number
): EncryptionMetadata {
  return {
    iv: uint8ArrayToBase64(result.iv),
    authTag: uint8ArrayToBase64(result.authTag),
    originalSize,
    mimeType,
    duration,
  };
}

/**
 * Parse encryption metadata from server/WebSocket
 */
export function parseMetadata(metadata: EncryptionMetadata): {
  iv: Uint8Array;
  authTag: Uint8Array;
} {
  return {
    iv: base64ToUint8Array(metadata.iv),
    authTag: base64ToUint8Array(metadata.authTag),
  };
}

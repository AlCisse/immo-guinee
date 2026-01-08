/**
 * EncryptedStorage.ts
 *
 * Provides AES-256 encrypted storage on top of AsyncStorage.
 * Used for sensitive data like messages that exceed SecureStore limits.
 *
 * Key is stored in SecureStore (device keychain/keystore).
 * Data is encrypted with AES-256-GCM before being stored in AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as ExpoCrypto from 'expo-crypto';
// @ts-ignore - package exports ./aes.js but TS looks for ./aes
import { gcm } from '@noble/ciphers/aes.js';

/**
 * Generate random bytes using expo-crypto
 */
async function generateRandomBytes(length: number): Promise<Uint8Array> {
  const bytes = await ExpoCrypto.getRandomBytesAsync(length);
  return new Uint8Array(bytes);
}

// Storage key for the encryption key
const ENCRYPTION_KEY_ID = 'immoguinee_storage_key';

// Prefix for encrypted items
const ENCRYPTED_PREFIX = 'enc_v1:';

class EncryptedStorageService {
  private encryptionKey: Uint8Array | null = null;
  private isInitialized = false;

  /**
   * Initialize the encrypted storage service
   * Must be called before using getItem/setItem
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Try to load existing key from SecureStore
      const storedKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_ID);

      if (storedKey) {
        // Decode existing key
        this.encryptionKey = this.hexToBytes(storedKey);
      } else {
        // Generate new 256-bit key
        this.encryptionKey = await generateRandomBytes(32);
        // Store in SecureStore (device keychain/keystore)
        await SecureStore.setItemAsync(ENCRYPTION_KEY_ID, this.bytesToHex(this.encryptionKey));
      }

      this.isInitialized = true;
      if (__DEV__) console.log('[EncryptedStorage] Initialized successfully');
    } catch (error) {
      if (__DEV__) console.error('[EncryptedStorage] Initialization failed:', error);
      throw new Error('Failed to initialize encrypted storage');
    }
  }

  /**
   * Encrypt and store data
   */
  async setItem(key: string, value: string): Promise<void> {
    await this.ensureInitialized();

    try {
      // Generate random IV (12 bytes for GCM)
      const iv = await generateRandomBytes(12);

      // Encrypt the value
      const encoder = new TextEncoder();
      const plaintext = encoder.encode(value);

      const cipher = gcm(this.encryptionKey!, iv);
      const ciphertext = cipher.encrypt(plaintext);

      // Combine IV + ciphertext and encode as base64
      const combined = new Uint8Array(iv.length + ciphertext.length);
      combined.set(iv);
      combined.set(ciphertext, iv.length);

      const encryptedValue = ENCRYPTED_PREFIX + this.bytesToBase64(combined);

      // Store in AsyncStorage
      await AsyncStorage.setItem(key, encryptedValue);
    } catch (error) {
      if (__DEV__) console.error('[EncryptedStorage] setItem failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt data
   */
  async getItem(key: string): Promise<string | null> {
    await this.ensureInitialized();

    try {
      const storedValue = await AsyncStorage.getItem(key);

      if (!storedValue) return null;

      // Check if value is encrypted
      if (!storedValue.startsWith(ENCRYPTED_PREFIX)) {
        // Legacy unencrypted data - return as-is but log warning
        if (__DEV__) console.warn('[EncryptedStorage] Found unencrypted data for key:', key);
        return storedValue;
      }

      // Remove prefix and decode
      const encryptedData = storedValue.slice(ENCRYPTED_PREFIX.length);
      const combined = this.base64ToBytes(encryptedData);

      // Extract IV (first 12 bytes) and ciphertext
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);

      // Decrypt
      const cipher = gcm(this.encryptionKey!, iv);
      const plaintext = cipher.decrypt(ciphertext);

      const decoder = new TextDecoder();
      return decoder.decode(plaintext);
    } catch (error) {
      if (__DEV__) console.error('[EncryptedStorage] getItem failed:', error);
      // Return null on decryption failure (data may be corrupted)
      return null;
    }
  }

  /**
   * Remove an item
   */
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  /**
   * Clear all encrypted storage
   */
  async clear(): Promise<void> {
    await AsyncStorage.clear();
  }

  /**
   * Migrate existing unencrypted data to encrypted format
   */
  async migrateUnencryptedData(key: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const storedValue = await AsyncStorage.getItem(key);

      if (!storedValue) return false;

      // Already encrypted
      if (storedValue.startsWith(ENCRYPTED_PREFIX)) {
        return false;
      }

      // Re-store with encryption
      await this.setItem(key, storedValue);
      if (__DEV__) console.log('[EncryptedStorage] Migrated key to encrypted format:', key);
      return true;
    } catch (error) {
      if (__DEV__) console.error('[EncryptedStorage] Migration failed for key:', key, error);
      return false;
    }
  }

  /**
   * Ensure storage is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }
  }

  // Utility functions
  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

// Export singleton instance
export const encryptedStorage = new EncryptedStorageService();

/**
 * Zustand storage adapter for encrypted storage
 * Drop-in replacement for createJSONStorage(() => AsyncStorage)
 */
export const createEncryptedStorage = () => ({
  getItem: async (name: string): Promise<string | null> => {
    await encryptedStorage.initialize();
    const value = await encryptedStorage.getItem(name);
    return value;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await encryptedStorage.initialize();
    await encryptedStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await encryptedStorage.removeItem(name);
  },
});

export default encryptedStorage;

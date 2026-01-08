/**
 * MediaPicker.ts
 *
 * Image and video picker service using expo-image-picker.
 * Handles permission requests, file selection, and size validation.
 */

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Result of picking media
 */
export interface PickedMedia {
  /** URI to the selected file */
  uri: string;
  /** Media type */
  type: 'image' | 'video';
  /** MIME type of the file */
  mimeType: string;
  /** Original file name */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** Image/video width */
  width?: number;
  /** Image/video height */
  height?: number;
  /** Video duration in milliseconds */
  duration?: number;
}

/** Maximum image file size (10 MB) */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/** Maximum video file size (50 MB) */
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

/** Maximum video duration (2 minutes) */
export const MAX_VIDEO_DURATION = 120;

/**
 * Request media library permission
 *
 * @returns True if permission granted
 */
export async function requestMediaLibraryPermission(): Promise<boolean> {
  if (__DEV__) console.log('[MediaPicker] Requesting media library permission...');
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (__DEV__) console.log('[MediaPicker] Permission result:', permission);
    return permission.granted;
  } catch (error) {
    if (__DEV__) console.error('[MediaPicker] Permission request error:', error);
    throw error;
  }
}

/**
 * Request camera permission
 *
 * @returns True if permission granted
 */
export async function requestCameraPermission(): Promise<boolean> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  return permission.granted;
}

/**
 * Check if media library permission is granted
 */
export async function hasMediaLibraryPermission(): Promise<boolean> {
  const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
  return permission.granted;
}

/**
 * Check if camera permission is granted
 */
export async function hasCameraPermission(): Promise<boolean> {
  const permission = await ImagePicker.getCameraPermissionsAsync();
  return permission.granted;
}

/**
 * Pick an image from the media library
 *
 * @param options - Optional configuration
 * @returns PickedMedia or null if cancelled
 * @throws Error if permission denied or file too large
 */
export async function pickImage(options?: {
  allowsEditing?: boolean;
  quality?: number;
}): Promise<PickedMedia | null> {
  if (__DEV__) console.log('[MediaPicker] pickImage called');

  try {
    // Check current permission status first
    const currentStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (__DEV__) console.log('[MediaPicker] Current permission status:', JSON.stringify(currentStatus));

    // Request permission if not granted
    if (!currentStatus.granted) {
      if (__DEV__) console.log('[MediaPicker] Requesting permission...');
      const requestResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (__DEV__) console.log('[MediaPicker] Permission request result:', JSON.stringify(requestResult));

      if (!requestResult.granted) {
        throw new Error('Permission d\'accès à la galerie requise. Veuillez l\'autoriser dans les réglages.');
      }
    }

    if (__DEV__) console.log('[MediaPicker] Launching image library...');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      allowsEditing: options?.allowsEditing ?? false,
      quality: options?.quality ?? 0.8,
      exif: false,
    });

    if (__DEV__) console.log('[MediaPicker] Result:', JSON.stringify(result));

    if (result.canceled || !result.assets || !result.assets[0]) {
      if (__DEV__) console.log('[MediaPicker] User canceled or no assets');
      return null;
    }

    if (__DEV__) console.log('[MediaPicker] Processing asset...');
    return processAsset(result.assets[0], 'image');
  } catch (error: any) {
    if (__DEV__) console.error('[MediaPicker] Error in pickImage:', error);
    if (error.message?.includes('permission') || error.code === 'E_NO_PERMISSIONS') {
      throw new Error('Permission d\'accès à la galerie requise. Veuillez l\'autoriser dans les réglages.');
    }
    throw error;
  }
}

/**
 * Pick a video from the media library
 *
 * @param options - Optional configuration
 * @returns PickedMedia or null if cancelled
 * @throws Error if permission denied, file too large, or duration exceeded
 */
export async function pickVideo(options?: {
  quality?: ImagePicker.UIImagePickerControllerQualityType;
}): Promise<PickedMedia | null> {
  if (__DEV__) console.log('[MediaPicker] pickVideo called');

  try {
    const hasPermission = await requestMediaLibraryPermission();
    if (__DEV__) console.log('[MediaPicker] Permission granted:', hasPermission);

    if (!hasPermission) {
      throw new Error('Permission d\'accès à la galerie requise. Veuillez l\'autoriser dans les réglages.');
    }

    if (__DEV__) console.log('[MediaPicker] Launching video library...');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      videoMaxDuration: MAX_VIDEO_DURATION,
      videoQuality: options?.quality ?? ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (__DEV__) console.log('[MediaPicker] Result:', result.canceled ? 'canceled' : 'selected');

    if (result.canceled || !result.assets || !result.assets[0]) {
      return null;
    }

    return processAsset(result.assets[0], 'video');
  } catch (error: any) {
    if (__DEV__) console.error('[MediaPicker] Error in pickVideo:', error);
    throw error;
  }
}

/**
 * Pick either image or video from media library
 *
 * @returns PickedMedia or null if cancelled
 */
export async function pickMedia(): Promise<PickedMedia | null> {
  if (__DEV__) console.log('[MediaPicker] pickMedia called');

  try {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      throw new Error('Permission d\'accès à la galerie requise. Veuillez l\'autoriser dans les réglages.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
      videoMaxDuration: MAX_VIDEO_DURATION,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (result.canceled || !result.assets || !result.assets[0]) {
      return null;
    }

    const asset = result.assets[0];
    const type = asset.type === 'video' ? 'video' : 'image';
    return processAsset(asset, type);
  } catch (error: any) {
    if (__DEV__) console.error('[MediaPicker] Error in pickMedia:', error);
    throw error;
  }
}

/**
 * Take a photo with the camera
 *
 * @param options - Optional configuration
 * @returns PickedMedia or null if cancelled
 */
export async function takePhoto(options?: {
  allowsEditing?: boolean;
  quality?: number;
}): Promise<PickedMedia | null> {
  if (__DEV__) console.log('[MediaPicker] takePhoto called');

  try {
    const hasPermission = await requestCameraPermission();
    if (__DEV__) console.log('[MediaPicker] Camera permission granted:', hasPermission);

    if (!hasPermission) {
      throw new Error('Permission d\'accès à la caméra requise. Veuillez l\'autoriser dans les réglages.');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options?.allowsEditing ?? false,
      quality: options?.quality ?? 0.8,
    });

    if (__DEV__) console.log('[MediaPicker] Camera result:', result.canceled ? 'canceled' : 'captured');

    if (result.canceled || !result.assets || !result.assets[0]) {
      return null;
    }

    return processAsset(result.assets[0], 'image');
  } catch (error: any) {
    if (__DEV__) console.error('[MediaPicker] Error in takePhoto:', error);
    throw error;
  }
}

/**
 * Record a video with the camera
 *
 * @returns PickedMedia or null if cancelled
 */
export async function recordVideo(): Promise<PickedMedia | null> {
  if (__DEV__) console.log('[MediaPicker] recordVideo called');

  try {
    const hasPermission = await requestCameraPermission();
    if (__DEV__) console.log('[MediaPicker] Camera permission granted:', hasPermission);

    if (!hasPermission) {
      throw new Error('Permission d\'accès à la caméra requise. Veuillez l\'autoriser dans les réglages.');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: MAX_VIDEO_DURATION,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (__DEV__) console.log('[MediaPicker] Camera result:', result.canceled ? 'canceled' : 'recorded');

    if (result.canceled || !result.assets || !result.assets[0]) {
      return null;
    }

    return processAsset(result.assets[0], 'video');
  } catch (error: any) {
    if (__DEV__) console.error('[MediaPicker] Error in recordVideo:', error);
    throw error;
  }
}

/**
 * Process an ImagePicker asset into PickedMedia
 */
async function processAsset(
  asset: ImagePicker.ImagePickerAsset,
  type: 'image' | 'video'
): Promise<PickedMedia> {
  // Get file info for size
  const fileInfo = await FileSystem.getInfoAsync(asset.uri);
  const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

  // Validate file size
  const maxSize = type === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (fileSize > maxSize) {
    const maxSizeMB = Math.floor(maxSize / (1024 * 1024));
    throw new Error(
      `${type === 'video' ? 'La vidéo' : "L'image"} dépasse la limite de ${maxSizeMB} MB`
    );
  }

  // Validate video duration
  if (type === 'video' && asset.duration) {
    const durationSec = asset.duration / 1000;
    if (durationSec > MAX_VIDEO_DURATION) {
      throw new Error(
        `La vidéo dépasse la limite de ${MAX_VIDEO_DURATION} secondes`
      );
    }
  }

  // Determine MIME type
  const mimeType = asset.mimeType || inferMimeType(asset.uri, type);

  // Generate filename
  const fileName = asset.fileName || generateFileName(type, mimeType);

  return {
    uri: asset.uri,
    type,
    mimeType,
    fileName,
    fileSize,
    width: asset.width,
    height: asset.height,
    duration: asset.duration ?? undefined,
  };
}

/**
 * Infer MIME type from URI and type
 */
function inferMimeType(uri: string, type: 'image' | 'video'): string {
  const extension = uri.split('.').pop()?.toLowerCase();

  if (type === 'image') {
    switch (extension) {
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'heic':
      case 'heif':
        return 'image/heic';
      default:
        return 'image/jpeg';
    }
  }

  switch (extension) {
    case 'mov':
      return 'video/quicktime';
    case 'webm':
      return 'video/webm';
    case 'avi':
      return 'video/x-msvideo';
    default:
      return 'video/mp4';
  }
}

/**
 * Generate a unique filename
 */
function generateFileName(type: 'image' | 'video', mimeType: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = mimeType.split('/')[1] || (type === 'video' ? 'mp4' : 'jpg');
  return `${type}_${timestamp}_${random}.${extension}`;
}

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1073741824) {
    return (bytes / 1073741824).toFixed(1) + ' GB';
  }
  if (bytes >= 1048576) {
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
  if (bytes >= 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  return bytes + ' bytes';
}

/**
 * Format duration to MM:SS
 */
export function formatDuration(ms: number | undefined): string {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get media type label in French
 */
export function getMediaTypeLabel(type: 'image' | 'video'): string {
  return type === 'video' ? 'Vidéo' : 'Image';
}

/**
 * Check if a file URI is a video
 */
export function isVideoUri(uri: string): boolean {
  const extension = uri.split('.').pop()?.toLowerCase();
  return ['mp4', 'mov', 'avi', 'webm', 'm4v', '3gp'].includes(extension || '');
}

/**
 * Check if a MIME type is for video
 */
export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

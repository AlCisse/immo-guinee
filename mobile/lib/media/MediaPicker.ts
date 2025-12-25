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
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return permission.granted;
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
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) {
    throw new Error('Media library permission required');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: options?.allowsEditing ?? false,
    quality: options?.quality ?? 0.8,
    exif: false,
  });

  if (result.canceled || !result.assets || !result.assets[0]) {
    return null;
  }

  return processAsset(result.assets[0], 'image');
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
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) {
    throw new Error('Media library permission required');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: false,
    videoMaxDuration: MAX_VIDEO_DURATION,
    videoQuality: options?.quality ?? ImagePicker.UIImagePickerControllerQualityType.Medium,
  });

  if (result.canceled || !result.assets || !result.assets[0]) {
    return null;
  }

  return processAsset(result.assets[0], 'video');
}

/**
 * Pick either image or video from media library
 *
 * @returns PickedMedia or null if cancelled
 */
export async function pickMedia(): Promise<PickedMedia | null> {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) {
    throw new Error('Media library permission required');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
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
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    throw new Error('Camera permission required');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: options?.allowsEditing ?? false,
    quality: options?.quality ?? 0.8,
  });

  if (result.canceled || !result.assets || !result.assets[0]) {
    return null;
  }

  return processAsset(result.assets[0], 'image');
}

/**
 * Record a video with the camera
 *
 * @returns PickedMedia or null if cancelled
 */
export async function recordVideo(): Promise<PickedMedia | null> {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    throw new Error('Camera permission required');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['videos'],
    videoMaxDuration: MAX_VIDEO_DURATION,
    videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
  });

  if (result.canceled || !result.assets || !result.assets[0]) {
    return null;
  }

  return processAsset(result.assets[0], 'video');
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

/**
 * Haptics Service
 *
 * Provides haptic feedback for iOS and Android.
 * Falls back gracefully on devices that don't support haptics.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Light haptic feedback for subtle interactions
 * Use for: toggle switches, selections, minor actions
 */
export async function lightFeedback(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics not supported - fail silently
  }
}

/**
 * Medium haptic feedback for standard interactions
 * Use for: button presses, card swipes, navigation
 */
export async function mediumFeedback(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Haptics not supported - fail silently
  }
}

/**
 * Heavy haptic feedback for significant actions
 * Use for: important confirmations, deletes, major actions
 */
export async function heavyFeedback(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {
    // Haptics not supported - fail silently
  }
}

/**
 * Success haptic feedback
 * Use for: successful operations, completions
 */
export async function successFeedback(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics not supported - fail silently
  }
}

/**
 * Warning haptic feedback
 * Use for: warnings, attention needed
 */
export async function warningFeedback(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // Haptics not supported - fail silently
  }
}

/**
 * Error haptic feedback
 * Use for: errors, failures, invalid actions
 */
export async function errorFeedback(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // Haptics not supported - fail silently
  }
}

/**
 * Selection haptic feedback
 * Use for: picker selections, list item selections
 */
export async function selectionFeedback(): Promise<void> {
  try {
    await Haptics.selectionAsync();
  } catch {
    // Haptics not supported - fail silently
  }
}

/**
 * Haptics utility object for easy imports
 */
export const haptics = {
  light: lightFeedback,
  medium: mediumFeedback,
  heavy: heavyFeedback,
  success: successFeedback,
  warning: warningFeedback,
  error: errorFeedback,
  selection: selectionFeedback,
};

export default haptics;

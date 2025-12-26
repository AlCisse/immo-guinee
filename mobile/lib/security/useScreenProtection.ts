/**
 * useScreenProtection.ts
 *
 * Hook to protect sensitive screens from screenshots.
 * Prevents screen capture when the screen is focused.
 */

import { useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { bankSecurity } from './BankSecurityService';

/**
 * Hook to prevent screen capture on sensitive screens.
 * Call this hook in screens that contain sensitive information.
 *
 * @example
 * ```tsx
 * function ChatScreen() {
 *   useScreenProtection();
 *   // ...
 * }
 * ```
 */
export function useScreenProtection() {
  useFocusEffect(
    useCallback(() => {
      // Prevent screen capture when screen is focused
      bankSecurity.preventScreenCapture();

      return () => {
        // Allow screen capture when leaving screen
        bankSecurity.allowScreenCapture();
      };
    }, [])
  );
}

export default useScreenProtection;

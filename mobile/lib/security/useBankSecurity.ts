/**
 * useBankSecurity.ts
 *
 * React hook for bank-level security features.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { bankSecurity, SecurityCheckResult, BiometricResult } from './BankSecurityService';

interface UseBankSecurityOptions {
  /** Whether security is enabled (only when authenticated) */
  enabled: boolean;
  /** Callback when biometric auth is required */
  onBiometricRequired?: () => void;
  /** Callback when security check fails */
  onSecurityCheckFailed?: (result: SecurityCheckResult) => void;
}

interface UseBankSecurityReturn {
  /** Whether security service is initialized */
  isInitialized: boolean;
  /** Whether biometric auth is available */
  biometricAvailable: boolean;
  /** Biometric type name (Face ID, Touch ID, etc.) */
  biometricTypeName: string;
  /** Whether app is locked (requires biometric) */
  isLocked: boolean;
  /** Security check result */
  securityCheck: SecurityCheckResult | null;
  /** Authenticate with biometric */
  authenticate: () => Promise<BiometricResult>;
  /** Unlock the app */
  unlock: () => void;
  /** Prevent screen capture */
  preventScreenCapture: () => Promise<void>;
  /** Allow screen capture */
  allowScreenCapture: () => Promise<void>;
}

/**
 * Hook for using bank-level security features
 */
export function useBankSecurity({
  enabled,
  onBiometricRequired,
  onSecurityCheckFailed,
}: UseBankSecurityOptions): UseBankSecurityReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [securityCheck, setSecurityCheck] = useState<SecurityCheckResult | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Initialize security service
  useEffect(() => {
    if (!enabled) {
      setIsInitialized(false);
      setIsLocked(false);
      return;
    }

    const init = async () => {
      try {
        const result = await bankSecurity.initialize();
        setSecurityCheck(result);
        setIsInitialized(true);

        if (!result.passed && onSecurityCheckFailed) {
          onSecurityCheckFailed(result);
        }
      } catch (error) {
        if (__DEV__) console.error('[Security] Initialization failed:', error);
        setIsInitialized(true); // Continue anyway
      }
    };

    init();

    return () => {
      bankSecurity.cleanup();
    };
  }, [enabled, onSecurityCheckFailed]);

  // Handle app state changes for biometric lock
  useEffect(() => {
    if (!enabled || !isInitialized) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;

      // App coming to foreground from background
      if (nextAppState === 'active' && prevState === 'background') {
        // Check if biometric is required after background timeout
        if (bankSecurity.isBiometricRequired()) {
          setIsLocked(true);
          onBiometricRequired?.();
        }
      }

      // Update last active time when going to background
      if (nextAppState === 'background') {
        bankSecurity.updateLastActiveTime();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [enabled, isInitialized, onBiometricRequired]);

  // Authenticate with biometric
  const authenticate = useCallback(async (): Promise<BiometricResult> => {
    const result = await bankSecurity.authenticateWithBiometric();
    if (result.success) {
      setIsLocked(false);
    }
    return result;
  }, []);

  // Unlock the app (after successful biometric)
  const unlock = useCallback(() => {
    bankSecurity.updateLastActiveTime();
    setIsLocked(false);
  }, []);

  // Screen capture protection
  const preventScreenCapture = useCallback(async () => {
    await bankSecurity.preventScreenCapture();
  }, []);

  const allowScreenCapture = useCallback(async () => {
    await bankSecurity.allowScreenCapture();
  }, []);

  return {
    isInitialized,
    biometricAvailable: bankSecurity.isBiometricAvailable(),
    biometricTypeName: bankSecurity.getBiometricTypeName(),
    isLocked,
    securityCheck,
    authenticate,
    unlock,
    preventScreenCapture,
    allowScreenCapture,
  };
}

export default useBankSecurity;

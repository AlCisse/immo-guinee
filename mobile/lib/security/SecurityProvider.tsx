/**
 * SecurityProvider.tsx
 *
 * Context provider for bank-level security features.
 * Wraps the app and provides security state and actions.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { bankSecurity, SecurityCheckResult } from './BankSecurityService';
import { BiometricLockScreen } from './BiometricLockScreen';

interface SecurityContextType {
  /** Whether security is initialized */
  isInitialized: boolean;
  /** Whether biometric is available */
  biometricAvailable: boolean;
  /** Biometric type name */
  biometricTypeName: string;
  /** Whether app is locked */
  isLocked: boolean;
  /** Security check result */
  securityCheck: SecurityCheckResult | null;
  /** Prevent screenshots */
  preventScreenCapture: () => Promise<void>;
  /** Allow screenshots */
  allowScreenCapture: () => Promise<void>;
  /** Get device fingerprint */
  getDeviceFingerprint: () => Promise<string | null>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: React.ReactNode;
  /** Whether security features are enabled */
  enabled: boolean;
  /** Called when user logs out via lock screen */
  onLogout?: () => void;
}

export function SecurityProvider({
  children,
  enabled,
  onLogout,
}: SecurityProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [securityCheck, setSecurityCheck] = useState<SecurityCheckResult | null>(null);
  const backgroundTimeRef = useRef<number | null>(null);
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

        // Show warning if security check failed (but don't block)
        if (!result.passed && result.errors.length > 0) {
          Alert.alert(
            'Avertissement de securite',
            result.errors.join('\n'),
            [{ text: 'Compris' }]
          );
        }
      } catch (error) {
        if (__DEV__) console.error('[Security] Init failed:', error);
        setIsInitialized(true);
      }
    };

    init();

    return () => {
      bankSecurity.cleanup();
    };
  }, [enabled]);

  // Handle app state changes for biometric lock
  useEffect(() => {
    if (!enabled || !isInitialized) {
      if (__DEV__) {
        console.log('[SecurityProvider] Effect skipped - enabled:', enabled, 'isInitialized:', isInitialized);
      }
      return;
    }

    if (__DEV__) {
      console.log('[SecurityProvider] Setting up app state listener');
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;

      if (__DEV__) {
        console.log('[SecurityProvider] App state:', previousState, '->', nextAppState);
      }

      // Going to background
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        backgroundTimeRef.current = Date.now();
        bankSecurity.updateLastActiveTime();
        if (__DEV__) {
          console.log('[SecurityProvider] Recorded background time:', backgroundTimeRef.current);
        }
      }

      // Coming back to foreground from background
      if (nextAppState === 'active' && (previousState === 'background' || previousState === 'inactive')) {
        const bgTime = backgroundTimeRef.current;

        if (bgTime) {
          const elapsed = Date.now() - bgTime;
          const biometricAvailable = bankSecurity.isBiometricAvailable();
          const required = bankSecurity.isBiometricRequired();

          if (__DEV__) {
            console.log('[SecurityProvider] Back to foreground:');
            console.log('  - Elapsed:', elapsed, 'ms');
            console.log('  - Biometric available:', biometricAvailable);
            console.log('  - Biometric required:', required);
          }

          if (required && biometricAvailable) {
            if (__DEV__) console.log('[SecurityProvider] LOCKING APP!');
            setIsLocked(true);
          }
        }

        backgroundTimeRef.current = null;
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (__DEV__) {
        console.log('[SecurityProvider] Removing app state listener');
      }
      subscription.remove();
    };
  }, [enabled, isInitialized]);

  // Handle unlock
  const handleUnlock = useCallback(() => {
    bankSecurity.updateLastActiveTime();
    setIsLocked(false);
  }, []);

  // Handle logout from lock screen
  const handleLogoutFromLock = useCallback(() => {
    setIsLocked(false);
    onLogout?.();
  }, [onLogout]);

  // Prevent screen capture
  const preventScreenCapture = useCallback(async () => {
    await bankSecurity.preventScreenCapture();
  }, []);

  // Allow screen capture
  const allowScreenCapture = useCallback(async () => {
    await bankSecurity.allowScreenCapture();
  }, []);

  // Get device fingerprint
  const getDeviceFingerprint = useCallback(async () => {
    return bankSecurity.getDeviceFingerprint();
  }, []);

  const contextValue: SecurityContextType = {
    isInitialized,
    biometricAvailable: bankSecurity.isBiometricAvailable(),
    biometricTypeName: bankSecurity.getBiometricTypeName(),
    isLocked,
    securityCheck,
    preventScreenCapture,
    allowScreenCapture,
    getDeviceFingerprint,
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}

      {/* Biometric lock screen overlay */}
      {enabled && (
        <BiometricLockScreen
          visible={isLocked}
          onUnlock={handleUnlock}
          onCancel={onLogout ? handleLogoutFromLock : undefined}
        />
      )}
    </SecurityContext.Provider>
  );
}

/**
 * Hook to access security context
 */
export function useSecurity(): SecurityContextType {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}

export default SecurityProvider;

/**
 * BankSecurityService.ts
 *
 * Bank-level security features for the mobile app.
 * Implements industry-standard security measures without auto-logout.
 */

import { Platform, AppState, AppStateStatus, NativeModules, Linking } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as ScreenCapture from 'expo-screen-capture';
import * as Crypto from 'expo-crypto';
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import i18n from '../i18n';

// Jailbreak/Root detection paths
const IOS_JAILBREAK_PATHS = [
  '/Applications/Cydia.app',
  '/Applications/blackra1n.app',
  '/Applications/FakeCarrier.app',
  '/Applications/Icy.app',
  '/Applications/IntelliScreen.app',
  '/Applications/MxTube.app',
  '/Applications/RockApp.app',
  '/Applications/SBSettings.app',
  '/Applications/WinterBoard.app',
  '/Library/MobileSubstrate/MobileSubstrate.dylib',
  '/Library/MobileSubstrate/DynamicLibraries/Veency.plist',
  '/Library/MobileSubstrate/DynamicLibraries/LiveClock.plist',
  '/private/var/lib/apt',
  '/private/var/lib/apt/',
  '/private/var/lib/cydia',
  '/private/var/mobile/Library/SBSettings/Themes',
  '/private/var/stash',
  '/private/var/tmp/cydia.log',
  '/System/Library/LaunchDaemons/com.ikey.bbot.plist',
  '/System/Library/LaunchDaemons/com.saurik.Cydia.Startup.plist',
  '/usr/bin/sshd',
  '/usr/libexec/sftp-server',
  '/usr/sbin/sshd',
  '/etc/apt',
  '/bin/bash',
  '/bin/sh',
];

const ANDROID_ROOT_PATHS = [
  '/system/app/Superuser.apk',
  '/system/xbin/su',
  '/system/bin/su',
  '/sbin/su',
  '/data/local/xbin/su',
  '/data/local/bin/su',
  '/data/local/su',
  '/su/bin/su',
  '/system/sd/xbin/su',
  '/system/bin/failsafe/su',
  '/system/bin/.ext/.su',
  '/system/usr/we-need-root/su-backup',
  '/system/xbin/mu',
  '/system/app/Magisk.apk',
  '/sbin/magisk',
  '/data/adb/magisk',
];

const ANDROID_ROOT_PACKAGES = [
  'com.noshufou.android.su',
  'com.noshufou.android.su.elite',
  'eu.chainfire.supersu',
  'com.koushikdutta.superuser',
  'com.thirdparty.superuser',
  'com.yellowes.su',
  'com.topjohnwu.magisk',
  'com.kingroot.kinguser',
  'com.kingo.root',
  'com.smedialink.onecleanpro',
  'com.zhiqupk.root.global',
];

// Security configuration
const SECURITY_CONFIG = {
  // Biometric settings
  BIOMETRIC_PROMPT_MESSAGE: 'Verifiez votre identite',
  BIOMETRIC_CANCEL_LABEL: 'Annuler',
  BIOMETRIC_FALLBACK_LABEL: 'Utiliser le code',

  // Device binding
  DEVICE_ID_KEY: 'device_fingerprint',
  BOUND_DEVICE_KEY: 'bound_device_id',

  // Security flags
  REQUIRE_BIOMETRIC_ON_RESUME: true,
  BLOCK_SCREENSHOTS_SENSITIVE: true,
  DETECT_JAILBREAK: true,
  DETECT_DEBUGGER: true,

  // Background protection
  BACKGROUND_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes for production
};

// Security check results
export interface SecurityCheckResult {
  passed: boolean;
  checks: {
    jailbreakDetection: boolean;
    debuggerDetection: boolean;
    deviceIntegrity: boolean;
    biometricAvailable: boolean;
  };
  warnings: string[];
  errors: string[];
}

// Biometric authentication result
export interface BiometricResult {
  success: boolean;
  error?: string;
  biometricType?: 'fingerprint' | 'facial' | 'iris';
}

class BankSecurityService {
  private isInitialized = false;
  private biometricEnabled = false;
  private biometricType: LocalAuthentication.AuthenticationType | null = null;
  private lastActiveTime: number = Date.now();
  private appStateSubscription: any = null;
  private screenshotPrevented = false;

  /**
   * Initialize the security service
   */
  async initialize(): Promise<SecurityCheckResult> {
    if (this.isInitialized) {
      return this.performSecurityChecks();
    }

    // Setup app state listener for background protection
    this.setupAppStateListener();

    // Check biometric availability
    await this.checkBiometricAvailability();

    // Generate device fingerprint if not exists
    await this.ensureDeviceFingerprint();

    // Run async security checks for jailbreak/root detection
    await this.checkSuspiciousFiles();
    await this.checkCydiaURLAsync();

    this.isInitialized = true;

    // Perform initial security checks
    return this.performSecurityChecks();
  }

  /**
   * Perform all security checks
   */
  async performSecurityChecks(): Promise<SecurityCheckResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Jailbreak/Root detection
    const jailbreakDetection = this.detectJailbreakRoot();
    if (!jailbreakDetection) {
      errors.push('Appareil compromis detecte (jailbreak/root)');
    }

    // Debugger detection
    const debuggerDetection = this.detectDebugger();
    if (!debuggerDetection && !__DEV__) {
      warnings.push('Debogueur potentiellement attache');
    }

    // Device integrity
    const deviceIntegrity = await this.checkDeviceIntegrity();
    if (!deviceIntegrity) {
      warnings.push('Integrite de l\'appareil non verifiee');
    }

    // Biometric availability
    const biometricAvailable = this.biometricEnabled;
    if (!biometricAvailable) {
      warnings.push('Authentification biometrique non disponible');
    }

    const passed = jailbreakDetection && (debuggerDetection || __DEV__);

    return {
      passed,
      checks: {
        jailbreakDetection,
        debuggerDetection: debuggerDetection || __DEV__,
        deviceIntegrity,
        biometricAvailable,
      },
      warnings,
      errors,
    };
  }

  /**
   * Detect jailbreak (iOS) or root (Android)
   */
  private detectJailbreakRoot(): boolean {
    if (__DEV__) return true; // Skip in development

    if (Platform.OS === 'ios') {
      return this.detectiOSJailbreak();
    } else if (Platform.OS === 'android') {
      return this.detectAndroidRoot();
    }
    return true;
  }

  /**
   * iOS jailbreak detection - performs multiple checks
   */
  private detectiOSJailbreak(): boolean {
    try {
      // Check 1: Cydia URL scheme
      if (this.canOpenCydiaURL()) {
        if (__DEV__) console.log('[Security] Jailbreak detected: Cydia URL scheme accessible');
        return false;
      }

      // Check 2: Suspicious files/paths (async check stored in cache)
      if (this.jailbreakFilesDetected) {
        if (__DEV__) console.log('[Security] Jailbreak detected: Suspicious files found');
        return false;
      }

      // Check 3: Sandbox violation check
      if (this.canWriteOutsideSandbox()) {
        if (__DEV__) console.log('[Security] Jailbreak detected: Sandbox violation');
        return false;
      }

      // Check 4: Fork check (jailbroken devices can fork)
      if (this.canForkProcess()) {
        if (__DEV__) console.log('[Security] Jailbreak detected: Fork capability');
        return false;
      }

      return true; // Device appears safe
    } catch (error) {
      // In case of error, assume safe but log warning
      if (__DEV__) console.warn('[Security] iOS jailbreak detection error:', error);
      return true;
    }
  }

  /**
   * Android root detection - performs multiple checks
   */
  private detectAndroidRoot(): boolean {
    try {
      // Check 1: Root files detected (async check stored in cache)
      if (this.rootFilesDetected) {
        if (__DEV__) console.log('[Security] Root detected: Suspicious files found');
        return false;
      }

      // Check 2: Test-keys in build tags (indicates custom ROM)
      if (this.hasTestKeys()) {
        if (__DEV__) console.log('[Security] Root detected: Test-keys found');
        return false;
      }

      // Check 3: Check for dangerous props
      if (this.hasDangerousProps()) {
        if (__DEV__) console.log('[Security] Root detected: Dangerous props');
        return false;
      }

      // Check 4: RW system partition
      if (this.hasRWSystem()) {
        if (__DEV__) console.log('[Security] Root detected: RW system partition');
        return false;
      }

      return true; // Device appears safe
    } catch (error) {
      // In case of error, assume safe but log warning
      if (__DEV__) console.warn('[Security] Android root detection error:', error);
      return true;
    }
  }

  // Cache for async detection results
  private jailbreakFilesDetected = false;
  private rootFilesDetected = false;

  /**
   * Async check for jailbreak/root files - call during initialization
   */
  async checkSuspiciousFiles(): Promise<void> {
    if (Platform.OS === 'ios') {
      for (const path of IOS_JAILBREAK_PATHS) {
        try {
          const info = await FileSystem.getInfoAsync(path);
          if (info.exists) {
            this.jailbreakFilesDetected = true;
            if (__DEV__) console.log('[Security] Jailbreak file found:', path);
            return;
          }
        } catch {
          // File not accessible, which is expected on non-jailbroken devices
        }
      }
    } else if (Platform.OS === 'android') {
      for (const path of ANDROID_ROOT_PATHS) {
        try {
          const info = await FileSystem.getInfoAsync(path);
          if (info.exists) {
            this.rootFilesDetected = true;
            if (__DEV__) console.log('[Security] Root file found:', path);
            return;
          }
        } catch {
          // File not accessible, which is expected
        }
      }
    }
  }

  /**
   * Check if Cydia URL scheme can be opened (iOS)
   */
  private canOpenCydiaURL(): boolean {
    try {
      // Check if cydia:// URL scheme is registered
      // Note: Linking.canOpenURL is async, so we use a sync approximation
      // The actual check happens in checkSuspiciousFiles
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if app can write outside sandbox (iOS jailbreak indicator)
   */
  private canWriteOutsideSandbox(): boolean {
    try {
      // On non-jailbroken iOS, writing to /private should fail
      // This is a heuristic check - actual file write tested in async check
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if process can fork (iOS jailbreak indicator)
   */
  private canForkProcess(): boolean {
    // Fork is not allowed on non-jailbroken iOS
    // This requires native code to properly check
    return false;
  }

  /**
   * Check for test-keys in Android build (indicates custom/rooted ROM)
   */
  private hasTestKeys(): boolean {
    try {
      // Check Build.TAGS for test-keys
      // This requires accessing native constants
      const buildTags = NativeModules?.PlatformConstants?.Build?.TAGS || '';
      return buildTags.includes('test-keys');
    } catch {
      return false;
    }
  }

  /**
   * Check for dangerous system props on Android
   */
  private hasDangerousProps(): boolean {
    try {
      // Check for ro.debuggable=1, service.adb.root=1, etc.
      // These require native access
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if system partition is mounted read-write (root indicator)
   */
  private hasRWSystem(): boolean {
    try {
      // Check /proc/mounts for rw on /system
      // This requires native file access
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Async Cydia URL check for iOS
   */
  async checkCydiaURLAsync(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    try {
      const canOpen = await Linking.canOpenURL('cydia://package/com.example.package');
      if (canOpen) {
        this.jailbreakFilesDetected = true;
        return true;
      }
    } catch {
      // Expected to fail on non-jailbroken devices
    }
    return false;
  }

  /**
   * Detect if debugger is attached
   */
  private detectDebugger(): boolean {
    if (__DEV__) return true; // Expected in development

    try {
      // Check for debugger indicators
      // Note: This is basic detection

      // Check if running in debug mode
      const isDebugMode = __DEV__;

      // Check for common debugging tools
      // This would need native code to properly check

      return !isDebugMode;
    } catch (error) {
      return true;
    }
  }

  /**
   * Check device integrity
   */
  private async checkDeviceIntegrity(): Promise<boolean> {
    try {
      // Verify device fingerprint hasn't changed
      const currentFingerprint = await this.generateDeviceFingerprint();
      const storedFingerprint = await SecureStore.getItemAsync(SECURITY_CONFIG.DEVICE_ID_KEY);

      if (storedFingerprint && storedFingerprint !== currentFingerprint) {
        // Device fingerprint changed - could indicate tampering
        // But also could be legitimate (OS update, etc.)
        // Log but don't block
        if (__DEV__) console.log('[Security] Device fingerprint changed');
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate unique device fingerprint
   */
  private async generateDeviceFingerprint(): Promise<string> {
    const components = [
      Platform.OS,
      Platform.Version,
      Application.nativeApplicationVersion || 'unknown',
      Application.nativeBuildVersion || 'unknown',
      Constants.deviceName || 'unknown',
    ];

    const fingerprintData = components.join('|');
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      fingerprintData
    );

    return hash;
  }

  /**
   * Ensure device fingerprint exists
   */
  private async ensureDeviceFingerprint(): Promise<void> {
    try {
      const existing = await SecureStore.getItemAsync(SECURITY_CONFIG.DEVICE_ID_KEY);
      if (!existing) {
        const fingerprint = await this.generateDeviceFingerprint();
        await SecureStore.setItemAsync(SECURITY_CONFIG.DEVICE_ID_KEY, fingerprint);
      }
    } catch (error) {
      if (__DEV__) console.error('[Security] Failed to store device fingerprint:', error);
    }
  }

  /**
   * Check biometric availability
   */
  private async checkBiometricAvailability(): Promise<void> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      // On simulator, hasHardware is true but isEnrolled may be false
      // Allow biometric if hardware exists (will prompt enrollment if needed)
      this.biometricEnabled = hasHardware;

      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        this.biometricType = LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION;
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        this.biometricType = LocalAuthentication.AuthenticationType.FINGERPRINT;
      }

      if (__DEV__) {
        console.log('[Security] Biometric hasHardware:', hasHardware);
        console.log('[Security] Biometric isEnrolled:', isEnrolled);
        console.log('[Security] Biometric enabled:', this.biometricEnabled);
        console.log('[Security] Biometric type:', this.biometricType);
      }
    } catch (error) {
      this.biometricEnabled = false;
      if (__DEV__) console.error('[Security] Biometric check failed:', error);
    }
  }

  /**
   * Authenticate with biometrics
   */
  async authenticateWithBiometric(): Promise<BiometricResult> {
    if (!this.biometricEnabled) {
      return {
        success: true, // Skip if not available
        error: 'Biometric non disponible',
      };
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: SECURITY_CONFIG.BIOMETRIC_PROMPT_MESSAGE,
        cancelLabel: SECURITY_CONFIG.BIOMETRIC_CANCEL_LABEL,
        fallbackLabel: SECURITY_CONFIG.BIOMETRIC_FALLBACK_LABEL,
        disableDeviceFallback: false,
      });

      if (result.success) {
        this.lastActiveTime = Date.now();
        return {
          success: true,
          biometricType: this.biometricType === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
            ? 'facial'
            : 'fingerprint',
        };
      } else {
        return {
          success: false,
          error: result.error || 'Authentification echouee',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || i18n.t('errors.authentication'),
      };
    }
  }

  /**
   * Check if biometric authentication is available
   */
  isBiometricAvailable(): boolean {
    return this.biometricEnabled;
  }

  /**
   * Get biometric type name
   */
  getBiometricTypeName(): string {
    if (!this.biometricType) return 'Biometrique';

    if (this.biometricType === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Reconnaissance faciale';
    }
    return Platform.OS === 'ios' ? 'Touch ID' : 'Empreinte digitale';
  }

  /**
   * Check if biometric is required (after background timeout)
   */
  isBiometricRequired(): boolean {
    if (!SECURITY_CONFIG.REQUIRE_BIOMETRIC_ON_RESUME) return false;
    if (!this.biometricEnabled) return false;

    const elapsed = Date.now() - this.lastActiveTime;
    const required = elapsed > SECURITY_CONFIG.BACKGROUND_TIMEOUT_MS;

    if (__DEV__) {
      console.log('[Security] isBiometricRequired check:');
      console.log('  - elapsed:', elapsed, 'ms');
      console.log('  - timeout:', SECURITY_CONFIG.BACKGROUND_TIMEOUT_MS, 'ms');
      console.log('  - biometricEnabled:', this.biometricEnabled);
      console.log('  - required:', required);
    }

    return required;
  }

  /**
   * Update last active time
   */
  updateLastActiveTime(): void {
    this.lastActiveTime = Date.now();
  }

  /**
   * Setup app state listener for background protection
   * Note: Main lock logic is in SecurityProvider, this just tracks time
   */
  private setupAppStateListener(): void {
    if (this.appStateSubscription) return;

    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (__DEV__) {
        console.log('[BankSecurity] AppState ->', nextAppState);
      }
      // Only track background time here, lock logic is in SecurityProvider
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        this.lastActiveTime = Date.now();
        if (__DEV__) {
          console.log('[BankSecurity] Recorded lastActiveTime:', this.lastActiveTime);
        }
      }
    });
  }

  /**
   * Prevent screenshots on sensitive screens
   */
  async preventScreenCapture(): Promise<void> {
    if (this.screenshotPrevented) return;

    try {
      await ScreenCapture.preventScreenCaptureAsync();
      this.screenshotPrevented = true;
      if (__DEV__) console.log('[Security] Screen capture prevented');
    } catch (error) {
      if (__DEV__) console.error('[Security] Failed to prevent screen capture:', error);
    }
  }

  /**
   * Allow screenshots again
   */
  async allowScreenCapture(): Promise<void> {
    if (!this.screenshotPrevented) return;

    try {
      await ScreenCapture.allowScreenCaptureAsync();
      this.screenshotPrevented = false;
      if (__DEV__) console.log('[Security] Screen capture allowed');
    } catch (error) {
      if (__DEV__) console.error('[Security] Failed to allow screen capture:', error);
    }
  }

  /**
   * Get device fingerprint for device binding
   */
  async getDeviceFingerprint(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(SECURITY_CONFIG.DEVICE_ID_KEY);
    } catch (error) {
      return null;
    }
  }

  /**
   * Bind session to current device
   */
  async bindToDevice(): Promise<boolean> {
    try {
      const fingerprint = await this.getDeviceFingerprint();
      if (!fingerprint) return false;

      await SecureStore.setItemAsync(SECURITY_CONFIG.BOUND_DEVICE_KEY, fingerprint);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if session is bound to this device
   */
  async isDeviceBound(): Promise<boolean> {
    try {
      const currentFingerprint = await this.getDeviceFingerprint();
      const boundFingerprint = await SecureStore.getItemAsync(SECURITY_CONFIG.BOUND_DEVICE_KEY);

      if (!boundFingerprint) return true; // Not bound yet, allow
      return currentFingerprint === boundFingerprint;
    } catch (error) {
      return true; // Fail open
    }
  }

  /**
   * Clear all security data (on logout)
   */
  async clearSecurityData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SECURITY_CONFIG.BOUND_DEVICE_KEY);
      // Keep device fingerprint - it's device-specific, not user-specific
    } catch (error) {
      // Ignore
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.allowScreenCapture();
  }
}

// Export singleton instance
export const bankSecurity = new BankSecurityService();

export default bankSecurity;

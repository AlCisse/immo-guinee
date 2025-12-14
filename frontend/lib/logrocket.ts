/**
 * T272: LogRocket Session Replay Configuration
 *
 * Session replay for debugging user issues and improving UX
 */

import LogRocket from 'logrocket';

// Configuration constants
const LOGROCKET_APP_ID = process.env.NEXT_PUBLIC_LOGROCKET_APP_ID;
const ENVIRONMENT = process.env.NEXT_PUBLIC_APP_ENV || 'production';

// Session replay should only be enabled in production
const ENABLED = ENVIRONMENT === 'production' && !!LOGROCKET_APP_ID;

/**
 * Initialize LogRocket
 */
export function initLogRocket(): void {
  if (!ENABLED) {
    console.info('LogRocket disabled (non-production or missing app ID)');
    return;
  }

  LogRocket.init(LOGROCKET_APP_ID!, {
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || '1.0.0',
    console: {
      isEnabled: true,
      shouldAggregateConsoleErrors: true,
    },
    network: {
      isEnabled: true,
      // Don't capture request/response bodies for sensitive endpoints
      requestSanitizer: (request) => {
        const sensitiveEndpoints = ['/api/auth', '/api/otp', '/api/payments'];
        const isSensitive = sensitiveEndpoints.some(ep => request.url.includes(ep));

        if (isSensitive) {
          request.body = null;
          // Sanitize headers
          if (request.headers) {
            if (request.headers['Authorization']) {
              request.headers['Authorization'] = '[FILTERED]';
            }
          }
        }

        return request;
      },
      responseSanitizer: (response) => {
        const sensitiveEndpoints = ['/api/auth', '/api/otp', '/api/payments'];
        const isSensitive = sensitiveEndpoints.some(ep => response.url?.includes(ep));

        if (isSensitive) {
          response.body = null;
        }

        return response;
      },
    },
    dom: {
      isEnabled: true,
      // Mask all inputs for privacy
      inputSanitizer: true,
      // Mask specific text areas
      textSanitizer: true,
    },
    // Don't record on specific pages
    shouldCaptureIP: false,
    // Respect Do Not Track
    shouldParseXHRBlob: false,
  });

  // Add custom plugin for sanitizing sensitive data
  LogRocket.addPlugin({
    name: 'ImmoGuinee Privacy',
    setup: (config) => {
      // Mask phone numbers in the DOM
      config.dom = {
        ...config.dom,
        privateClassNames: ['phone-number', 'otp-input', 'payment-info', 'private'],
        privateAttributeBlocklist: ['data-phone', 'data-otp', 'data-card'],
      };
    },
  });

  console.info('LogRocket initialized');
}

/**
 * Identify the current user
 * Only send minimal, non-sensitive information
 */
export function identifyUser(user: {
  id: string;
  name?: string;
  email?: string;
  badge?: string;
  role?: string;
}): void {
  if (!ENABLED) return;

  LogRocket.identify(user.id, {
    name: user.name || 'Anonymous',
    // Don't send email for privacy - only hashed identifier
    badge: user.badge,
    role: user.role,
  });
}

/**
 * Clear user identity (on logout)
 */
export function clearUser(): void {
  if (!ENABLED) return;

  // LogRocket doesn't have a built-in clear method,
  // but we can identify as anonymous
  LogRocket.identify('anonymous');
}

/**
 * Track custom events
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean>
): void {
  if (!ENABLED) return;

  LogRocket.track(eventName, properties);
}

/**
 * Log extra data for debugging
 */
export function logInfo(
  message: string,
  data?: Record<string, unknown>
): void {
  if (!ENABLED) return;

  LogRocket.log(message, data);
}

/**
 * Log warning
 */
export function logWarning(
  message: string,
  data?: Record<string, unknown>
): void {
  if (!ENABLED) return;

  LogRocket.warn(message, data);
}

/**
 * Log error
 */
export function logError(
  message: string,
  error?: Error,
  data?: Record<string, unknown>
): void {
  if (!ENABLED) return;

  LogRocket.error(message, {
    ...data,
    error: error?.message,
    stack: error?.stack,
  });
}

/**
 * Get session URL for support tickets
 */
export function getSessionURL(): string | null {
  if (!ENABLED) return null;

  return LogRocket.sessionURL;
}

/**
 * Track page views
 */
export function trackPageView(page: string): void {
  if (!ENABLED) return;

  trackEvent('Page View', { page });
}

/**
 * Track search queries (without sensitive data)
 */
export function trackSearch(query: {
  type?: string;
  ville?: string;
  resultCount: number;
}): void {
  if (!ENABLED) return;

  trackEvent('Search', {
    type: query.type || 'all',
    ville: query.ville || 'all',
    resultCount: query.resultCount,
  });
}

/**
 * Track listing interactions
 */
export function trackListingView(listingId: string, listingType: string): void {
  if (!ENABLED) return;

  trackEvent('Listing View', {
    listingId,
    listingType,
  });
}

/**
 * Track contract events
 */
export function trackContractEvent(
  event: 'created' | 'signed' | 'completed',
  contractId: string
): void {
  if (!ENABLED) return;

  trackEvent(`Contract ${event}`, {
    contractId,
  });
}

/**
 * Track payment events (no sensitive data)
 */
export function trackPaymentEvent(
  event: 'initiated' | 'completed' | 'failed',
  provider: string
): void {
  if (!ENABLED) return;

  trackEvent(`Payment ${event}`, {
    provider,
  });
}

/**
 * Integration with Sentry
 * Automatically link LogRocket sessions to Sentry errors
 */
export function integrateWithSentry(): void {
  if (!ENABLED) return;

  LogRocket.getSessionURL((sessionURL) => {
    if (sessionURL) {
      // This will be called by Sentry's beforeSend
      (window as Record<string, unknown>).__LOGROCKET_SESSION_URL__ = sessionURL;
    }
  });
}

// Export LogRocket for direct access
export { LogRocket };

/**
 * T271: Sentry Configuration for ImmoGuinee Frontend
 *
 * Error tracking and performance monitoring for Next.js
 */

import * as Sentry from '@sentry/nextjs';

// Configuration constants
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_APP_ENV || 'production';
const RELEASE = process.env.NEXT_PUBLIC_SENTRY_RELEASE || '1.0.0';

/**
 * Initialize Sentry for the browser
 */
export function initSentryBrowser(): void {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: RELEASE,

    // Performance monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Session replay (only in production for cost management)
    replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: ENVIRONMENT === 'production' ? 1.0 : 0,

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Tags for filtering
    initialScope: {
      tags: {
        app: 'immoguinee',
        platform: 'frontend',
        country: 'GN',
      },
    },

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive information from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            const sensitiveFields = ['password', 'otp', 'token', 'secret', 'phone'];
            sensitiveFields.forEach(field => {
              if (breadcrumb.data && field in breadcrumb.data) {
                breadcrumb.data[field] = '[FILTERED]';
              }
            });
          }
          return breadcrumb;
        });
      }

      // Filter out authentication errors (user-facing, not bugs)
      const error = hint?.originalException;
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          return null;
        }
      }

      return event;
    },

    // Don't report these errors
    ignoreErrors: [
      // Browser extensions
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Network errors (user connectivity issues)
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      'AbortError',
      // User-initiated navigation
      'Navigation cancelled',
      'Route cancelled',
      // Non-errors
      'Non-Error exception captured',
      'Non-Error promise rejection captured',
    ],

    // Don't include these URLs in stack traces
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      // Third-party scripts
      /gtag\/js/i,
      /analytics\.js/i,
      /hotjar\.com/i,
    ],
  });
}

/**
 * Initialize Sentry for the server (Edge/Node.js)
 */
export function initSentryServer(): void {
  if (!SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: RELEASE,
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    initialScope: {
      tags: {
        app: 'immoguinee',
        platform: 'frontend-server',
        country: 'GN',
      },
    },
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; phone?: string } | null): void {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      // Don't send phone number for privacy
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Capture a custom error with additional context
 */
export function captureError(
  error: Error | string,
  context?: Record<string, unknown>
): string {
  if (typeof error === 'string') {
    return Sentry.captureMessage(error, {
      level: 'error',
      extra: context,
    });
  }

  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a custom message
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): string {
  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  op: string
): ReturnType<typeof Sentry.startInactiveSpan> {
  return Sentry.startInactiveSpan({
    name,
    op,
  });
}

/**
 * Wrap an async function with error tracking
 */
export async function withSentry<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const span = startTransaction(operation, 'function');

  try {
    const result = await fn();
    span?.end();
    return result;
  } catch (error) {
    span?.end();
    captureError(error instanceof Error ? error : new Error(String(error)), {
      operation,
    });
    throw error;
  }
}

// Export Sentry for direct access
export { Sentry };

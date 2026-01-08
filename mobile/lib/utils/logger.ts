/**
 * Secure Logger Utility
 *
 * Only logs in development mode to prevent information leakage in production.
 * Sanitizes sensitive data patterns before logging.
 */

type LogLevel = 'debug' | 'log' | 'info' | 'warn' | 'error';

// Patterns to redact from logs
const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/gi, // JWT tokens
  /password['":\s]*['"]?[^'"}\s,]+/gi, // Passwords
  /token['":\s]*['"]?[A-Za-z0-9\-_]+/gi, // Generic tokens
  /api[_-]?key['":\s]*['"]?[A-Za-z0-9\-_]+/gi, // API keys
  /secret['":\s]*['"]?[A-Za-z0-9\-_]+/gi, // Secrets
  /\+224\d{9}/g, // Guinea phone numbers
  /\+\d{10,15}/g, // International phone numbers
];

/**
 * Sanitize sensitive data from log messages
 */
function sanitize(input: unknown): unknown {
  if (typeof input === 'string') {
    let sanitized = input;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    return sanitized;
  }

  if (typeof input === 'object' && input !== null) {
    try {
      const str = JSON.stringify(input);
      let sanitized = str;
      for (const pattern of SENSITIVE_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      }
      return JSON.parse(sanitized);
    } catch {
      return '[Object - unable to sanitize]';
    }
  }

  return input;
}

/**
 * Create a log function that only executes in development
 */
function createLogger(level: LogLevel) {
  return (tag: string, ...args: unknown[]) => {
    if (!__DEV__) return;

    const sanitizedArgs = args.map(sanitize);
    const prefix = `[${tag}]`;

    switch (level) {
      case 'debug':
      case 'log':
        console.log(prefix, ...sanitizedArgs);
        break;
      case 'info':
        console.info(prefix, ...sanitizedArgs);
        break;
      case 'warn':
        console.warn(prefix, ...sanitizedArgs);
        break;
      case 'error':
        console.error(prefix, ...sanitizedArgs);
        break;
    }
  };
}

/**
 * Secure logger that only outputs in development mode
 * and automatically sanitizes sensitive data
 */
export const logger = {
  debug: createLogger('debug'),
  log: createLogger('log'),
  info: createLogger('info'),
  warn: createLogger('warn'),
  error: createLogger('error'),
};

/**
 * Silent logger for production - all methods are no-ops
 * Use this when you want to explicitly silence logs
 */
export const silentLogger = {
  debug: () => {},
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

export default logger;

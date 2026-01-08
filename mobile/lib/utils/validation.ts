/**
 * validation.ts
 *
 * Input validation utilities for forms.
 * Provides regex-based validation for phone numbers, emails, passwords, etc.
 */

// Phone number validation patterns by country
const PHONE_PATTERNS: Record<string, { regex: RegExp; minLength: number; maxLength: number }> = {
  // Guinea (+224) - 9 digits after country code
  GN: { regex: /^[0-9]{9}$/, minLength: 9, maxLength: 9 },
  // Senegal (+221) - 9 digits
  SN: { regex: /^[0-9]{9}$/, minLength: 9, maxLength: 9 },
  // Cote d'Ivoire (+225) - 10 digits
  CI: { regex: /^[0-9]{10}$/, minLength: 10, maxLength: 10 },
  // Mali (+223) - 8 digits
  ML: { regex: /^[0-9]{8}$/, minLength: 8, maxLength: 8 },
  // France (+33) - 9 digits (without leading 0)
  FR: { regex: /^[0-9]{9}$/, minLength: 9, maxLength: 9 },
  // Default - 8-15 digits (E.164 recommendation)
  DEFAULT: { regex: /^[0-9]{8,15}$/, minLength: 8, maxLength: 15 },
};

// Email validation pattern (RFC 5322 simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Password strength patterns
const PASSWORD_PATTERNS = {
  minLength: 6,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecial: /[!@#$%^&*(),.?":{}|<>]/,
};

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PhoneValidationResult extends ValidationResult {
  formattedPhone?: string;
}

/**
 * Validate phone number for a specific country
 */
export function validatePhone(
  phone: string,
  countryCode: string = 'GN',
  dialCode: string = '+224'
): PhoneValidationResult {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');

  // Remove leading zeros
  const phoneWithoutLeadingZeros = cleanPhone.replace(/^0+/, '');

  if (!phoneWithoutLeadingZeros) {
    return { isValid: false, error: 'errors.invalidPhone' };
  }

  // Get pattern for country or use default
  const pattern = PHONE_PATTERNS[countryCode] || PHONE_PATTERNS.DEFAULT;

  // Check length
  if (phoneWithoutLeadingZeros.length < pattern.minLength) {
    return {
      isValid: false,
      error: 'errors.phoneTooShort',
    };
  }

  if (phoneWithoutLeadingZeros.length > pattern.maxLength) {
    return {
      isValid: false,
      error: 'errors.phoneTooLong',
    };
  }

  // Check pattern
  if (!pattern.regex.test(phoneWithoutLeadingZeros)) {
    return { isValid: false, error: 'errors.invalidPhone' };
  }

  // Format phone with dial code
  const formattedPhone = dialCode + phoneWithoutLeadingZeros;

  return { isValid: true, formattedPhone };
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'errors.requiredField' };
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (trimmedEmail.length > 254) {
    return { isValid: false, error: 'errors.emailTooLong' };
  }

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { isValid: false, error: 'errors.invalidEmail' };
  }

  return { isValid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'errors.requiredField' };
  }

  if (password.length < PASSWORD_PATTERNS.minLength) {
    return { isValid: false, error: 'errors.passwordTooShort' };
  }

  return { isValid: true };
}

/**
 * Validate password confirmation matches
 */
export function validatePasswordMatch(password: string, confirmPassword: string): ValidationResult {
  if (password !== confirmPassword) {
    return { isValid: false, error: 'errors.passwordMismatch' };
  }

  return { isValid: true };
}

/**
 * Validate full name
 */
export function validateFullName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'errors.requiredField' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return { isValid: false, error: 'errors.nameTooShort' };
  }

  if (trimmedName.length > 100) {
    return { isValid: false, error: 'errors.nameTooLong' };
  }

  // Check for invalid characters (only letters, spaces, hyphens, apostrophes allowed)
  if (!/^[\p{L}\s\-']+$/u.test(trimmedName)) {
    return { isValid: false, error: 'errors.invalidName' };
  }

  return { isValid: true };
}

/**
 * Sanitize input to prevent XSS and injection
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Format phone for display (add spaces)
 */
export function formatPhoneForDisplay(phone: string, countryCode: string = 'GN'): string {
  const clean = phone.replace(/\D/g, '');

  switch (countryCode) {
    case 'GN':
      // Format: XXX XX XX XX
      return clean.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
    case 'SN':
      // Format: XX XXX XX XX
      return clean.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
    default:
      // Generic grouping by 3
      return clean.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  }
}

export default {
  validatePhone,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateFullName,
  sanitizeInput,
  formatPhoneForDisplay,
};

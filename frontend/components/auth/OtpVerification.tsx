'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTranslations } from '@/lib/i18n';

interface OtpVerificationProps {
  telephone: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// WhatsApp icon SVG component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function OtpVerification({ telephone, onSuccess, onCancel }: OtpVerificationProps) {
  const { verifyOtp, resendOtp } = useAuth();
  const { t } = useTranslations();
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Start resend cooldown on mount
  useEffect(() => {
    setResendCooldown(60);
  }, []);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    // Only accept numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (newOtp.every(digit => digit !== '') && index === 5) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();

    // Check if pasted data is 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      setError('');
      inputRefs.current[5]?.focus();

      // Auto-submit
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');

    if (code.length !== 6) {
      setError(t('auth.otp.errors.enterAllDigits'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await verifyOtp(telephone, code);
      onSuccess?.();
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        t('auth.otp.errors.invalidCode')
      );
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    setError('');

    try {
      await resendOtp(telephone);
      setResendCooldown(60);
      // Clear current OTP
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      console.error('Resend OTP error:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        t('auth.otp.errors.resendFailed')
      );
    } finally {
      setIsResending(false);
    }
  };

  // Format phone for display - handle both Guinea local numbers and international numbers
  const formatPhoneForDisplay = (phone: string): string => {
    // Remove any existing + prefix
    const cleanPhone = phone.replace(/^\+/, '');

    // If it's a 9-digit Guinea local number (starting with 6 or 7), add +224
    if (cleanPhone.length === 9 && ['6', '7'].includes(cleanPhone[0])) {
      return `+224 ${cleanPhone}`;
    }

    // For all other numbers (already have country code), just add +
    return `+${cleanPhone}`;
  };

  const formattedPhone = formatPhoneForDisplay(telephone);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header with WhatsApp branding */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <WhatsAppIcon className="w-9 h-9 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('auth.otp.title')}
        </h2>
        <p className="text-sm text-gray-600">
          {t('auth.otp.subtitle')}
        </p>
        <p className="text-sm font-medium text-[#25D366] mt-1">
          {formattedPhone}
        </p>
      </div>

      {/* WhatsApp hint */}
      <div className="bg-[#DCF8C6] border border-[#25D366]/20 rounded-lg p-3 mb-6">
        <div className="flex items-center gap-2">
          <WhatsAppIcon className="w-5 h-5 text-[#25D366] flex-shrink-0" />
          <p className="text-xs text-gray-700">
            {t('auth.otp.whatsappHint')} <span className="font-semibold">ImmoGuinée</span>
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* OTP Input */}
      <div className="mb-6">
        <div className="flex justify-center gap-2 mb-2" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isLoading}
              className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
              autoFocus={index === 0}
            />
          ))}
        </div>
        <p className="text-xs text-center text-gray-500 mt-2">
          {t('auth.otp.enterCode')}
        </p>
      </div>

      {/* Verify Button */}
      <button
        onClick={() => handleVerify()}
        disabled={isLoading || otp.some(digit => digit === '')}
        className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#128C7E] text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4 shadow-md"
      >
        {isLoading ? t('auth.otp.verifying') : t('auth.otp.verify')}
      </button>

      {/* Resend Button */}
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">
          {t('auth.otp.notReceived')}
        </p>
        <button
          onClick={handleResend}
          disabled={isResending || resendCooldown > 0}
          className="text-sm font-medium text-[#25D366] hover:text-[#128C7E] disabled:text-gray-400 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
        >
          <WhatsAppIcon className="w-4 h-4" />
          {isResending
            ? t('auth.otp.resending')
            : resendCooldown > 0
            ? t('auth.otp.resendIn', { seconds: resendCooldown })
            : t('auth.otp.resend')
          }
        </button>
      </div>

      {/* Cancel Button */}
      {onCancel && (
        <button
          onClick={onCancel}
          disabled={isLoading || isResending}
          className="w-full mt-6 py-2 px-4 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {t('auth.otp.cancel')}
        </button>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Shield, Loader2, ArrowLeft, Key, QrCode, Smartphone, Copy, Check } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';
import { useTranslations } from '@/lib/i18n';

export default function Verify2FAPage() {
  const router = useRouter();
  const { t } = useTranslations();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRecoveryInput, setShowRecoveryInput] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [hasValidSession, setHasValidSession] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 2FA Setup states
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qr_code_url: string; recovery_codes: string[] } | null>(null);
  const [setupStep, setSetupStep] = useState<'loading' | 'show_qr' | 'confirm'>('loading');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

  // Check for valid 2FA session on mount
  useEffect(() => {
    const pending2fa = sessionStorage.getItem('pending_2fa');
    const pendingToken = sessionStorage.getItem('pending_2fa_token');
    const needs2faSetup = sessionStorage.getItem('2fa_needs_setup');
    const setupToken = sessionStorage.getItem('2fa_setup_token');

    // Check if we need to setup 2FA (coming from login with requires_2fa_setup)
    if (needs2faSetup === 'true' && setupToken) {
      setNeedsSetup(true);
      setHasValidSession(true);
      // Don't clear 2fa_needs_setup yet - we need it to know we're in setup mode
      // Initiate 2FA setup
      initiate2FASetup();
      return;
    }

    if (!pending2fa || !pendingToken) {
      // No pending 2FA session - redirect to login
      router.push('/auth/login');
      return;
    }

    setHasValidSession(true);
    inputRefs.current[0]?.focus();
  }, [router]);

  const initiate2FASetup = async () => {
    setSetupStep('loading');
    try {
      // Use the setup token from login for authentication
      const setupToken = sessionStorage.getItem('2fa_setup_token');
      const response = await apiClient.post('/admin/2fa/setup', {}, {
        headers: setupToken ? { 'Authorization': `Bearer ${setupToken}` } : {}
      });
      if (response.data.success) {
        setSetupData(response.data.data);
        setSetupStep('show_qr');
      }
    } catch (err: any) {
      console.error('2FA setup error:', err);
      setError(err.response?.data?.message || 'Erreur lors de la configuration 2FA');
      // If setup fails (not authenticated), redirect to login
      if (err.response?.status === 401) {
        // Clean up session storage and redirect
        sessionStorage.removeItem('2fa_setup_token');
        sessionStorage.removeItem('2fa_needs_setup');
        sessionStorage.removeItem('pending_2fa');
        router.push('/auth/login');
      }
    }
  };

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      toast.success('Code secret copie!');
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleConfirmSetup = async (confirmCode: string) => {
    if (confirmCode.length !== 6) {
      setError('Entrez un code a 6 chiffres');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use the setup token for authentication
      const setupToken = sessionStorage.getItem('2fa_setup_token');
      const response = await apiClient.post('/admin/2fa/confirm', { code: confirmCode }, {
        headers: setupToken ? { 'Authorization': `Bearer ${setupToken}` } : {}
      });

      if (response.data.success) {
        toast.success('2FA active avec succes!');

        // Check if we got a new token (meaning this was a setup flow during login)
        if (response.data.data?.token) {
          // Store user data for UX (token is in httpOnly cookie set by server)
          const userData = response.data.data.user;
          const redirectData = response.data.data.redirect;

          if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
          }
          if (redirectData) {
            localStorage.setItem('redirect_data', JSON.stringify(redirectData));
          }

          // Clean up ALL setup/pending data from sessionStorage
          sessionStorage.removeItem('2fa_setup_token');
          sessionStorage.removeItem('2fa_needs_setup');
          sessionStorage.removeItem('pending_2fa');
          sessionStorage.removeItem('pending_2fa_user');

          // Redirect to admin dashboard
          const intendedPath = sessionStorage.getItem('2fa_redirect') || redirectData?.dashboard_path || '/admin';
          sessionStorage.removeItem('2fa_redirect');

          // Force page reload to re-initialize auth context with new credentials
          window.location.href = intendedPath;
          return;
        }

        // If no token returned, show recovery codes (normal 2FA enable flow)
        setShowRecoveryCodes(true);
      }
    } catch (err: any) {
      console.error('2FA confirm error:', err);
      setError(err.response?.data?.message || 'Code invalide');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishSetup = () => {
    // Redirect to intended destination
    const intendedPath = sessionStorage.getItem('2fa_redirect') || '/admin';
    sessionStorage.removeItem('2fa_redirect');
    window.location.href = intendedPath;
  };

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (index === 5 && value) {
      const fullCode = [...newCode].join('');
      if (fullCode.length === 6) {
        if (needsSetup && setupStep === 'confirm') {
          handleConfirmSetup(fullCode);
        } else {
          handleSubmit(fullCode);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      if (needsSetup && setupStep === 'confirm') {
        handleConfirmSetup(pastedData);
      } else {
        handleSubmit(pastedData);
      }
    }
  };

  const handleSubmit = async (submittedCode?: string) => {
    const codeToSubmit = submittedCode || code.join('');

    if (codeToSubmit.length !== 6) {
      setError(t('auth.verify2fa.errors.enterCode'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get the pending token from sessionStorage
      const pendingToken = sessionStorage.getItem('pending_2fa_token');
      if (!pendingToken) {
        setError(t('auth.verify2fa.errors.sessionExpired'));
        router.push('/auth/login');
        return;
      }

      // Use the pending token for this request
      const response = await apiClient.post('/admin/2fa/verify', { code: codeToSubmit }, {
        headers: {
          'Authorization': `Bearer ${pendingToken}`
        }
      });

      if (response.data.success) {
        // SECURITY: 2FA verified - httpOnly cookie is set by server
        // Only store user data for UX (not the token!)
        const pendingUser = sessionStorage.getItem('pending_2fa_user');
        const pendingRedirect = sessionStorage.getItem('pending_2fa_redirect');

        // Store user data (not sensitive - for UX only)
        // Token is in httpOnly cookie, set by server
        if (pendingUser) {
          localStorage.setItem('user', pendingUser);
        }
        if (pendingRedirect) {
          localStorage.setItem('redirect_data', pendingRedirect);
        }

        // Clean up ALL pending 2FA data from sessionStorage
        sessionStorage.removeItem('pending_2fa');
        sessionStorage.removeItem('pending_2fa_token');
        sessionStorage.removeItem('pending_2fa_user');
        sessionStorage.removeItem('pending_2fa_redirect');

        toast.success(t('auth.verify2fa.success'));

        // Get the intended destination from session storage or redirect to admin
        const intendedPath = sessionStorage.getItem('2fa_redirect') || '/admin';
        sessionStorage.removeItem('2fa_redirect');

        // Force page reload to re-initialize auth context with new credentials
        window.location.href = intendedPath;
      }
    } catch (err: any) {
      console.error('2FA verification error:', err);
      setError(err.response?.data?.message || t('auth.verify2fa.errors.invalidCode'));
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recoveryCode.trim()) {
      setError(t('auth.verify2fa.errors.enterRecoveryCode'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get the pending token from sessionStorage
      const pendingToken = sessionStorage.getItem('pending_2fa_token');
      if (!pendingToken) {
        setError(t('auth.verify2fa.errors.sessionExpired'));
        router.push('/auth/login');
        return;
      }

      const response = await apiClient.post('/admin/2fa/verify', { code: recoveryCode.trim() }, {
        headers: {
          'Authorization': `Bearer ${pendingToken}`
        }
      });

      if (response.data.success) {
        // SECURITY: 2FA verified - httpOnly cookie is set by server
        const pendingUser = sessionStorage.getItem('pending_2fa_user');
        const pendingRedirect = sessionStorage.getItem('pending_2fa_redirect');

        // Store user data for UX (not token - it's in httpOnly cookie)
        if (pendingUser) {
          localStorage.setItem('user', pendingUser);
        }
        if (pendingRedirect) {
          localStorage.setItem('redirect_data', pendingRedirect);
        }

        // Clean up ALL pending 2FA data
        sessionStorage.removeItem('pending_2fa');
        sessionStorage.removeItem('pending_2fa_token');
        sessionStorage.removeItem('pending_2fa_user');
        sessionStorage.removeItem('pending_2fa_redirect');

        toast.success(response.data.message || 'Verification reussie');
        const intendedPath = sessionStorage.getItem('2fa_redirect') || '/admin';
        sessionStorage.removeItem('2fa_redirect');

        // Force page reload to re-initialize auth context
        window.location.href = intendedPath;
      }
    } catch (err: any) {
      console.error('Recovery code error:', err);
      setError(err.response?.data?.message || t('auth.verify2fa.errors.invalidRecoveryCode'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    // Call logout API to clear httpOnly cookie
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Ignore errors - clean up locally anyway
    }

    // Clean up localStorage (user cache only)
    localStorage.removeItem('user');
    localStorage.removeItem('redirect_data');

    // Clean up ALL pending 2FA data from sessionStorage
    sessionStorage.removeItem('pending_2fa');
    sessionStorage.removeItem('pending_2fa_token');
    sessionStorage.removeItem('pending_2fa_user');
    sessionStorage.removeItem('pending_2fa_redirect');
    sessionStorage.removeItem('2fa_redirect');
    sessionStorage.removeItem('2fa_needs_setup');
    sessionStorage.removeItem('2fa_setup_token');

    router.push('/auth/login');
  };

  // Show loading while checking session or redirecting
  if (!hasValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-neutral-500">{t('auth.verify2fa.loading')}</p>
        </div>
      </div>
    );
  }

  // 2FA Setup Flow
  if (needsSetup) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)]">
        {/* Left side - Image (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-500 to-primary-700">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-8">
              <Smartphone className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4 text-center">Configuration 2FA</h1>
            <p className="text-xl text-white/90 text-center max-w-md">
              Securisez votre compte administrateur avec l&apos;authentification a deux facteurs
            </p>
            <div className="mt-12 space-y-4 text-white/80">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${setupStep === 'show_qr' || setupStep === 'confirm' ? 'bg-white/40' : 'bg-white/20'}`}>
                  <span className="text-lg">1</span>
                </div>
                <span>Installez Google Authenticator</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${setupStep === 'confirm' ? 'bg-white/40' : 'bg-white/20'}`}>
                  <span className="text-lg">2</span>
                </div>
                <span>Scannez le QR code</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-lg">3</span>
                </div>
                <span>Confirmez avec un code</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Setup Form */}
        <div className="flex-1 flex items-center justify-center px-4 py-6 sm:p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-primary-500" />
              </div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Configuration 2FA</h1>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-5 sm:p-8">
              {setupStep === 'loading' && (
                <div className="text-center py-8">
                  <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
                  <p className="text-neutral-600 dark:text-neutral-400">Preparation de la configuration...</p>
                </div>
              )}

              {setupStep === 'show_qr' && setupData && !showRecoveryCodes && (
                <>
                  <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-2 text-center">
                    Scannez le QR Code
                  </h2>
                  <p className="text-sm text-neutral-500 mb-6 text-center">
                    Utilisez Google Authenticator pour scanner ce code
                  </p>

                  {error && (
                    <div className="mb-6 p-4 bg-error-50 dark:bg-error-500/10 border-l-4 border-error-500 rounded-r-lg">
                      <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
                    </div>
                  )}

                  {/* QR Code */}
                  <div className="flex justify-center mb-6">
                    <div className="p-4 bg-white rounded-xl border-2 border-neutral-200">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.qr_code_url)}`}
                        alt="QR Code 2FA"
                        width={200}
                        height={200}
                        className="rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Secret Key */}
                  <div className="mb-6">
                    <p className="text-xs text-neutral-500 text-center mb-2">Ou entrez ce code manuellement:</p>
                    <div className="flex items-center gap-2 p-3 bg-neutral-100 dark:bg-dark-bg rounded-lg">
                      <code className="flex-1 text-sm font-mono text-center break-all">{setupData.secret}</code>
                      <button
                        onClick={handleCopySecret}
                        className="p-2 hover:bg-neutral-200 dark:hover:bg-dark-border rounded-lg transition-colors"
                      >
                        {copiedSecret ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-neutral-500" />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setSetupStep('confirm')}
                    className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
                  >
                    <QrCode className="w-5 h-5" />
                    J&apos;ai scanne le code
                  </button>
                </>
              )}

              {setupStep === 'confirm' && !showRecoveryCodes && (
                <>
                  <button
                    type="button"
                    onClick={() => setSetupStep('show_qr')}
                    className="flex items-center text-sm text-neutral-500 hover:text-neutral-700 mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Retour au QR code
                  </button>

                  <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-1 text-center">
                    Confirmez la configuration
                  </h2>
                  <p className="text-sm text-neutral-500 mb-6 text-center">
                    Entrez le code a 6 chiffres de Google Authenticator
                  </p>

                  {error && (
                    <div className="mb-6 p-4 bg-error-50 dark:bg-error-500/10 border-l-4 border-error-500 rounded-r-lg">
                      <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
                    </div>
                  )}

                  <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        disabled={isLoading}
                        className="w-12 h-14 text-center text-2xl font-bold border-2 border-neutral-200 dark:border-dark-border rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-dark-bg text-neutral-900 dark:text-white disabled:opacity-50 transition-all"
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => handleConfirmSetup(code.join(''))}
                    disabled={isLoading || code.join('').length !== 6}
                    className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verification...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Activer 2FA
                      </>
                    )}
                  </button>
                </>
              )}

              {showRecoveryCodes && setupData && (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
                      <Check className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                      2FA Active!
                    </h2>
                    <p className="text-sm text-neutral-500">
                      Sauvegardez ces codes de recuperation en lieu sur
                    </p>
                  </div>

                  <div className="bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/20 rounded-xl p-4 mb-6">
                    <p className="text-xs text-warning-700 dark:text-warning-400 mb-3">
                      Ces codes vous permettent de vous connecter si vous perdez votre telephone. Chaque code ne peut etre utilise qu&apos;une seule fois.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {setupData.recovery_codes.map((recoveryCode, index) => (
                        <code key={index} className="text-sm font-mono bg-white dark:bg-dark-bg px-2 py-1 rounded text-center">
                          {recoveryCode}
                        </code>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleFinishSetup}
                    className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
                  >
                    Continuer vers l&apos;admin
                  </button>
                </>
              )}

              <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-dark-border">
                <button
                  onClick={handleLogout}
                  className="w-full text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  Se deconnecter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal 2FA Verification Flow
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)]">
      {/* Left side - Image (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-500 to-primary-700">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
          <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-8">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-center">{t('auth.verify2fa.title')}</h1>
          <p className="text-xl text-white/90 text-center max-w-md">
            {t('auth.verify2fa.subtitle')}
          </p>
          <div className="mt-12 space-y-4 text-white/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">1</span>
              </div>
              <span>{t('auth.verify2fa.step1')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">2</span>
              </div>
              <span>{t('auth.verify2fa.step2')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">3</span>
              </div>
              <span>{t('auth.verify2fa.step3')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary-500" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{t('auth.verify2fa.title')}</h1>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-5 sm:p-8">
            {!showRecoveryInput ? (
              <>
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-1 text-center">
                  {t('auth.verify2fa.enterCode')}
                </h2>
                <p className="text-sm text-neutral-500 mb-6 text-center">
                  {t('auth.verify2fa.enterCodeSubtitle')}
                </p>

                {error && (
                  <div className="mb-6 p-4 bg-error-50 dark:bg-error-500/10 border-l-4 border-error-500 rounded-r-lg">
                    <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
                  </div>
                )}

                <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={isLoading}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-neutral-200 dark:border-dark-border rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-dark-bg text-neutral-900 dark:text-white disabled:opacity-50 transition-all"
                    />
                  ))}
                </div>

                <button
                  onClick={() => handleSubmit()}
                  disabled={isLoading || code.join('').length !== 6}
                  className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('auth.verify2fa.verifying')}
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      {t('auth.verify2fa.verify')}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowRecoveryInput(true)}
                  className="w-full mt-4 text-sm text-primary-500 hover:text-primary-600 font-medium"
                >
                  <Key className="w-4 h-4 inline mr-1" />
                  {t('auth.verify2fa.useRecoveryCode')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowRecoveryInput(false);
                    setError('');
                    setRecoveryCode('');
                  }}
                  className="flex items-center text-sm text-neutral-500 hover:text-neutral-700 mb-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  {t('auth.verify2fa.back')}
                </button>

                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                  {t('auth.verify2fa.recoveryCode.title')}
                </h2>
                <p className="text-sm text-neutral-500 mb-6">
                  {t('auth.verify2fa.recoveryCode.subtitle')}
                </p>

                {error && (
                  <div className="mb-6 p-4 bg-error-50 dark:bg-error-500/10 border-l-4 border-error-500 rounded-r-lg">
                    <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
                  </div>
                )}

                <form onSubmit={handleRecoverySubmit}>
                  <input
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                    placeholder={t('auth.verify2fa.recoveryCode.placeholder')}
                    disabled={isLoading}
                    className="w-full px-4 py-3 text-center font-mono text-lg border-2 border-neutral-200 dark:border-dark-border rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-dark-bg text-neutral-900 dark:text-white disabled:opacity-50 transition-all mb-4"
                  />

                  <button
                    type="submit"
                    disabled={isLoading || !recoveryCode.trim()}
                    className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('auth.verify2fa.verifying')}
                      </>
                    ) : (
                      <>
                        <Key className="w-5 h-5" />
                        {t('auth.verify2fa.recoveryCode.submit')}
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-dark-border">
              <button
                onClick={handleLogout}
                className="w-full text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                {t('auth.verify2fa.logout')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Shield, Loader2, ArrowLeft, Key } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

export default function Verify2FAPage() {
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRecoveryInput, setShowRecoveryInput] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [hasValidSession, setHasValidSession] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check for valid 2FA session on mount
  useEffect(() => {
    const pending2fa = sessionStorage.getItem('pending_2fa');
    const pendingToken = sessionStorage.getItem('pending_2fa_token');

    if (!pending2fa || !pendingToken) {
      // No pending 2FA session - redirect to login
      router.push('/auth/login');
      return;
    }

    setHasValidSession(true);
    inputRefs.current[0]?.focus();
  }, [router]);

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
        handleSubmit(fullCode);
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
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (submittedCode?: string) => {
    const codeToSubmit = submittedCode || code.join('');

    if (codeToSubmit.length !== 6) {
      setError('Veuillez entrer le code a 6 chiffres');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get the pending token from sessionStorage
      const pendingToken = sessionStorage.getItem('pending_2fa_token');
      if (!pendingToken) {
        setError('Session expiree. Veuillez vous reconnecter.');
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

        toast.success('Verification reussie');

        // Get the intended destination from session storage or redirect to admin
        const intendedPath = sessionStorage.getItem('2fa_redirect') || '/admin';
        sessionStorage.removeItem('2fa_redirect');

        // Force page reload to re-initialize auth context with new credentials
        window.location.href = intendedPath;
      }
    } catch (err: any) {
      console.error('2FA verification error:', err);
      setError(err.response?.data?.message || 'Code invalide. Veuillez reessayer.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recoveryCode.trim()) {
      setError('Veuillez entrer un code de recuperation');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get the pending token from sessionStorage
      const pendingToken = sessionStorage.getItem('pending_2fa_token');
      if (!pendingToken) {
        setError('Session expiree. Veuillez vous reconnecter.');
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
      setError(err.response?.data?.message || 'Code de recuperation invalide.');
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

    router.push('/auth/login');
  };

  // Show loading while checking session or redirecting
  if (!hasValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-neutral-500">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)]">
      {/* Left side - Image (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-500 to-primary-700">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
          <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-8">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-center">Verification 2FA</h1>
          <p className="text-xl text-white/90 text-center max-w-md">
            Securite renforcee pour votre compte administrateur
          </p>
          <div className="mt-12 space-y-4 text-white/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">1</span>
              </div>
              <span>Ouvrez Google Authenticator</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">2</span>
              </div>
              <span>Trouvez le code pour ImmoGuinee</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">3</span>
              </div>
              <span>Entrez le code a 6 chiffres</span>
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
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Verification 2FA</h1>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-5 sm:p-8">
            {!showRecoveryInput ? (
              <>
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-1 text-center">
                  Entrez le code
                </h2>
                <p className="text-sm text-neutral-500 mb-6 text-center">
                  Ouvrez Google Authenticator et entrez le code affiche
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
                      Verification...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Verifier
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowRecoveryInput(true)}
                  className="w-full mt-4 text-sm text-primary-500 hover:text-primary-600 font-medium"
                >
                  <Key className="w-4 h-4 inline mr-1" />
                  Utiliser un code de recuperation
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
                  Retour
                </button>

                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                  Code de recuperation
                </h2>
                <p className="text-sm text-neutral-500 mb-6">
                  Entrez l'un de vos codes de recuperation
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
                    placeholder="XXXX-XXXX-XXXX-XXXX"
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
                        Verification...
                      </>
                    ) : (
                      <>
                        <Key className="w-5 h-5" />
                        Utiliser ce code
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
                Se deconnecter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

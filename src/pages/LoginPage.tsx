import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const {
    isConfigured,
    configError,
    isAuthenticated,
    isLoading,
    authError,
    signIn,
    clearAuthError,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading && !submitting) {
    return (
      <div className="min-h-dvh bg-[#F7F6F0] flex items-center justify-center p-4">
        <div className="flex items-center gap-2.5 text-sm text-[#202A24]">
          <Loader2 className="w-4 h-4 animate-spin text-[#123C2A]" />
          <span>Checking staff session...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!email.trim() || !password) {
      setLocalError('Enter your staff email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      if (err instanceof Error) {
        setLocalError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-dvh bg-[#F7F6F0] flex flex-col items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md bg-white border border-[#E6EAE5] rounded-xl shadow-[0_1px_2px_rgba(18,60,42,0.04)] p-6 sm:p-8 space-y-6">
        {/* Brand header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#123C2A] text-white flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 15h11a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H4" strokeLinecap="round" />
              <path d="M4 5v14" strokeLinecap="round" />
              <circle cx="8" cy="18" r="2" />
              <circle cx="16" cy="18" r="2" />
              <path d="M18 10h2.5l1.5 2.5V16h-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-[#123C2A] tracking-tight">Zblal</span>
              <span className="text-sm font-medium text-[#758078]">ዝብላል</span>
            </div>
            <p className="text-xs text-[#758078]">Operations Panel · Staff Sign In</p>
          </div>
        </div>

        {!isConfigured && (
          <div className="p-3.5 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg text-xs text-[#92400E] space-y-1">
            <p className="font-semibold">Supabase Environment Configuration Required</p>
            <p className="leading-relaxed">
              {configError} Add <span className="font-mono">VITE_SUPABASE_URL</span> and{' '}
              <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> to your environment before signing in.
            </p>
          </div>
        )}

        {displayError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 bg-[#FEE2E2] border border-[#FECACA] rounded-lg text-xs text-[#991B1B]"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{displayError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-[#202A24] mb-1">
              Staff Email Address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isConfigured || submitting}
              placeholder="name@zblal.et"
              className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg text-[#202A24] focus:outline-none focus:border-[#123C2A] disabled:bg-[#F7F6F0]"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-medium text-[#202A24] mb-1">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!isConfigured || submitting}
              placeholder="Enter password"
              className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg text-[#202A24] focus:outline-none focus:border-[#123C2A] disabled:bg-[#F7F6F0]"
            />
          </div>

          <button
            type="submit"
            disabled={!isConfigured || submitting}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying staff profile...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign In to Operations Panel</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-[#E6EAE5] text-[11px] text-[#758078] leading-relaxed">
          Access is restricted to authorized Zblal staff (<span className="font-mono">super_admin</span>,{' '}
          <span className="font-mono">admin</span>, <span className="font-mono">staff</span>) with an active record in{' '}
          <span className="font-mono">staff_profiles</span>. Vehicle operators do not have portal accounts.
        </div>
      </div>
    </div>
  );
}

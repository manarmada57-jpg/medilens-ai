import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, ArrowLeft, User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { authApi } from '../api';
import { ApiError } from '../api/client';
import { User as UserType } from '../types';

interface AuthScreenProps {
  onSuccess: (user: UserType) => void;
  onCancel?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, onCancel }) => {
  const [tab, setTab] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === 'forgot') {
      if (!email.trim()) {
        setError('Please enter your email address');
        return;
      }
      setLoading(true);
      try {
        await authApi.forgotPassword(email.trim());
        setForgotSuccess(true);
      } catch (err: unknown) {
        // Privacy rule: never reveal email existence; show success message
        setForgotSuccess(true);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (tab === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name');
        return;
      }
      if (!acceptTerms) {
        setError('You must agree to the Terms of Service and Privacy Policy');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }

      setLoading(true);
      try {
        const res = await authApi.signup({
          name: name.trim(),
          email: email.trim(),
          password,
          acceptTerms: true,
        });
        onSuccess(res.user);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to create account. Please try again.');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Sign in
    if (!email.trim() || !password) {
      setError('Please provide both email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login({
        email: email.trim(),
        password,
      });
      onSuccess(res.user);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#ebf7f6] bg-[radial-gradient(#94a3b8_1.2px,transparent_1.2px)] [background-size:20px_20px] px-4 py-8 flex flex-col justify-center items-center">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="self-start mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0a7075] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      )}

      {/* Main Auth Card */}
      <div className="w-full max-w-sm rounded-[32px] bg-white p-7 shadow-2xl border border-[#d8ecea] relative overflow-hidden">
        {/* Top teal decorative accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0a7075]"></div>

        {/* Medical Kit Icon & Title */}
        <div className="text-center space-y-2 mb-5 pt-1">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shadow-xs">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="15" rx="3" />
              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              <path d="M12 11v6" />
              <path d="M9 14h6" />
            </svg>
          </div>

          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {tab === 'signin' ? 'Welcome back' : tab === 'signup' ? 'Create Account' : 'Reset Password'}
          </h1>
          <p className="text-xs text-gray-500">
            {tab === 'signin'
              ? 'Sign in to access your health records and schedule'
              : tab === 'signup'
              ? 'Get plain-language explanations of your medical reports'
              : 'Enter your email to receive a password reset link'}
          </p>

          <div className="pt-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f4fa] px-3.5 py-1 text-[11px] font-semibold text-[#0284c7] border border-[#bae6fd]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Grounded in MedlinePlus, WHO & NIH</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher (Sign In vs Sign Up) */}
        {tab !== 'forgot' && (
          <div className="flex rounded-full bg-[#f1f5f9] p-1 mb-5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'signin'}
              onClick={() => {
                setTab('signin');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all ${
                tab === 'signin' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'signup'}
              onClick={() => {
                setTab('signup');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all ${
                tab === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Error notification banner */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Forgot password success message */}
        {tab === 'forgot' && forgotSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-gray-800">
              Check your inbox
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              If an account is associated with <span className="font-medium text-gray-700">{email}</span>, we have sent instructions to reset your password.
            </p>
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setForgotSuccess(false);
              }}
              className="mt-3 text-xs font-bold text-[#0a7075] hover:underline block mx-auto"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name field (Sign Up only) */}
            {tab === 'signup' && (
              <div className="space-y-1">
                <label htmlFor="auth-name" className="block text-xs font-semibold text-gray-700">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your legal or preferred name"
                    autoComplete="name"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0a7075]/20 focus:border-[#0a7075] transition-all bg-gray-50/50"
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1">
              <label htmlFor="auth-email" className="block text-xs font-semibold text-gray-700">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0a7075]/20 focus:border-[#0a7075] transition-all bg-gray-50/50"
                />
              </div>
            </div>

            {/* Password field (Sign In & Sign Up) */}
            {tab !== 'forgot' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="auth-password" className="block text-xs font-semibold text-gray-700">
                    Password
                  </label>
                  {tab === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab('forgot');
                        setError(null);
                      }}
                      className="text-[11px] font-semibold text-[#0a7075] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === 'signup' ? 'At least 8 characters' : 'Enter your password'}
                    autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                    className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0a7075]/20 focus:border-[#0a7075] transition-all bg-gray-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Terms checkbox on sign up */}
            {tab === 'signup' && (
              <div className="flex items-start gap-2 pt-1">
                <input
                  id="auth-terms"
                  type="checkbox"
                  required
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-[#0a7075] focus:ring-[#0a7075]"
                />
                <label htmlFor="auth-terms" className="text-[11px] text-gray-600 leading-tight">
                  I agree to the{' '}
                  <span className="font-semibold text-[#0a7075]">Terms of Service</span> and{' '}
                  <span className="font-semibold text-[#0a7075]">Privacy Policy</span>. I understand MediLens AI is an educational platform and does not provide medical diagnoses.
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#0a7075] hover:bg-[#075960] active:scale-[0.99] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : tab === 'signin' ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : tab === 'signup' ? (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>

            {tab === 'forgot' && (
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setError(null);
                }}
                className="w-full text-center text-xs font-semibold text-gray-500 hover:text-gray-800 pt-1 block"
              >
                Back to Sign In
              </button>
            )}
          </form>
        )}

        {/* Footer Guarantee */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-400">
            🔒 Field-level encryption protects your sensitive records.
          </p>
        </div>
      </div>
    </div>
  );
};

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSignUp, useClerk } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { AuthBackground3D } from '@/components/auth/AuthBackground3D';
import { AuthSocialButtons } from '@/components/auth/AuthSocialButtons';

export default function SignUpPage() {
  const { signUp } = useSignUp();
  const clerk = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/';

  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Live password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const completeSignUp = useCallback(
    async (sessionId?: string | null) => {
      const activeSessionId = sessionId || signUp?.createdSessionId;
      if (activeSessionId) {
        await clerk.setActive({ session: activeSessionId });
      }
      router.push(redirectUrl);
      router.refresh();
    },
    [signUp, clerk, router, redirectUrl]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!signUp || isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        const parts = fullName.trim().split(' ');
        const firstName = parts[0] || 'User';
        const lastName = parts.slice(1).join(' ') || undefined;

        const result = await signUp.password({
          emailAddress,
          password,
          firstName,
          lastName,
        });

        if (result.error) {
          setError(result.error.message || 'Could not complete registration.');
          return;
        }

        if (signUp.status === 'complete') {
          await completeSignUp(signUp.createdSessionId);
        } else if (signUp.status === 'missing_requirements') {
          await signUp.verifications.sendEmailCode();
          setIsVerifying(true);
        } else {
          setError(`Setup status: ${signUp.status}`);
        }
      } catch (err: unknown) {
        const anyErr = err as {
          errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
          message?: string;
        };
        const message =
          anyErr?.errors?.[0]?.longMessage ||
          anyErr?.errors?.[0]?.message ||
          anyErr?.message ||
          'Could not complete registration. Please verify details.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [signUp, isLoading, fullName, emailAddress, password, completeSignUp]
  );

  const handleVerifyCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!signUp || isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await signUp.verifications.verifyEmailCode({
          code: verificationCode.trim(),
        });

        if (result.error) {
          setError(result.error.message || 'Invalid verification code.');
          return;
        }

        if (signUp.status === 'complete') {
          await completeSignUp(signUp.createdSessionId);
        } else {
          setError(`Verification status: ${signUp.status}`);
        }
      } catch (err: unknown) {
        const anyErr = err as {
          errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
          message?: string;
        };
        const message =
          anyErr?.errors?.[0]?.longMessage ||
          anyErr?.errors?.[0]?.message ||
          anyErr?.message ||
          'Invalid verification code. Please check your email.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [signUp, isLoading, verificationCode, completeSignUp]
  );

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0D12] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-[#0B0D12] text-white selection:bg-emerald-500 selection:text-white">
      <AuthBackground3D />

      <div className="relative z-10 w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* ── Left Column: Value Prop & Workspace Setup Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col lg:col-span-7 xl:col-span-7"
          >
            {/* Logo */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-neutral-900/90 shadow-inner">
                <svg
                  className="h-6 w-6 text-neutral-100"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                FollowPilot
              </span>
            </div>

            {/* Extra-Bold Headline */}
            <h1 className="text-4xl font-black leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl lg:text-[3.25rem]">
              Scale your revenue pipeline with autonomous AI
            </h1>

            {/* Subheadline */}
            <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-400 sm:text-lg">
              Join modern sales teams using FollowPilot to research, draft, and convert 3x more enterprise leads.
            </p>

            {/* ── Docked WORKSPACE SETUP Card ── */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-8 max-w-xl rounded-2xl border border-white/10 bg-neutral-900/75 p-5 shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-3 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                WORKSPACE SETUP
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs text-neutral-300">
                    <span className="text-neutral-500 font-mono">1.</span>
                    <span>Mailbox Synced</span>
                    <span className="text-emerald-400 font-medium">(Verified)</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-neutral-300">
                    <span className="text-neutral-500 font-mono">2.</span>
                    <span>ICP Configured</span>
                    <span className="text-emerald-400 font-medium">(Active)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/40 px-4 py-3">
                  <div>
                    <div className="text-xl font-extrabold text-emerald-400">+310%</div>
                    <div className="text-[11px] text-neutral-400">Response Rate</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* ── Right Column: Compact Functional Registration Card ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }}
            className="flex justify-center lg:col-span-5 xl:col-span-5 lg:justify-end"
          >
            <div className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#12151C]/85 p-6 shadow-2xl shadow-black/80 backdrop-blur-2xl sm:p-8">
              {/* Card Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Create your workspace
                </h2>
                <p className="mt-1 text-sm text-neutral-400">
                  Start your 14-day free trial. No credit card required.
                </p>
              </div>

              {/* Error Notice */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/50 p-3 text-xs text-rose-200"
                    role="alert"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isVerifying ? (
                <>
                  {/* Social Registration */}
                  <div className="space-y-3">
                    <AuthSocialButtons
                      mode="sign-up"
                      redirectUrl={redirectUrl}
                      onError={(msg) => setError(msg)}
                    />
                  </div>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-[#12151C] px-3 text-neutral-400">
                        or register with email
                      </span>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="full-name"
                        className="block text-xs font-medium text-neutral-300"
                      >
                        Full Name
                      </label>
                      <input
                        id="full-name"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Doe"
                        autoComplete="name"
                        className="w-full rounded-xl border border-white/10 bg-neutral-900/90 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="work-email"
                        className="block text-xs font-medium text-neutral-300"
                      >
                        Work Email
                      </label>
                      <input
                        id="work-email"
                        type="email"
                        required
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        placeholder="name@company.com"
                        autoComplete="email"
                        className="w-full rounded-xl border border-white/10 bg-neutral-900/90 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="password"
                        className="block text-xs font-medium text-neutral-300"
                      >
                        Password
                      </label>
                      <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-white/10 bg-neutral-900/90 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />

                      {/* Dynamic Password Strength Indicator */}
                      {password && (
                        <div className="mt-2 space-y-1">
                          <div className="flex h-1.5 gap-1.5 overflow-hidden rounded-full bg-neutral-800">
                            <div
                              className={`h-full flex-1 transition-colors ${
                                passwordStrength >= 1
                                  ? passwordStrength === 1
                                    ? 'bg-rose-500'
                                    : passwordStrength === 2
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                  : 'bg-transparent'
                              }`}
                            />
                            <div
                              className={`h-full flex-1 transition-colors ${
                                passwordStrength >= 2
                                  ? passwordStrength === 2
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                  : 'bg-transparent'
                              }`}
                            />
                            <div
                              className={`h-full flex-1 transition-colors ${
                                passwordStrength >= 3 ? 'bg-emerald-500' : 'bg-transparent'
                              }`}
                            />
                            <div
                              className={`h-full flex-1 transition-colors ${
                                passwordStrength >= 4 ? 'bg-emerald-400' : 'bg-transparent'
                              }`}
                            />
                          </div>
                          <div className="text-right text-[10px] text-neutral-400">
                            {passwordStrength <= 1 && 'Weak password'}
                            {passwordStrength === 2 && 'Fair password'}
                            {passwordStrength === 3 && 'Good password'}
                            {passwordStrength >= 4 && 'Strong password'}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50 transition-all hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      ) : (
                        'Create Workspace'
                      )}
                    </button>
                  </form>
                </>
              ) : (
                /* Verification Code Step */
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/40 p-4 text-xs text-neutral-300">
                    <p className="flex items-center gap-2 font-medium text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Verification Code Dispatched
                    </p>
                    <p className="mt-1">
                      We sent a 6-digit confirmation code to{' '}
                      <span className="font-semibold text-white">{emailAddress}</span>.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="code"
                      className="block text-xs font-medium text-neutral-300"
                    >
                      6-Digit Code
                    </label>
                    <input
                      id="code"
                      type="text"
                      required
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                      className="w-full text-center tracking-widest font-mono rounded-xl border border-white/10 bg-neutral-900/90 px-3.5 py-3 text-lg text-white placeholder-neutral-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50 transition-all hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      'Verify & Launch Workspace'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsVerifying(false)}
                    className="w-full text-center text-xs text-neutral-400 hover:text-white"
                  >
                    ← Edit registration details
                  </button>
                </form>
              )}

              {/* Footer */}
              <div className="mt-6 text-center text-xs text-neutral-400">
                Already have an account?{' '}
                <a
                  href={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`}
                  className="font-medium text-white transition-colors hover:text-emerald-400"
                >
                  Sign in
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useCallback, Suspense } from 'react';
import { useSignIn, useClerk } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Shield, Loader2, ArrowLeft } from 'lucide-react';
import { AuthBackground3D } from '@/components/auth/AuthBackground3D';

function ForgotPasswordContent() {
  const { signIn } = useSignIn();
  const clerk = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/';

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Step 1: Request reset code
  const handleSendCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!signIn || isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        // Initialize sign in with the identifier
        const initResult = await signIn.create({
          identifier: email.trim(),
        });

        if (initResult.error) {
          setError(initResult.error.message || 'Could not find an account with this email.');
          return;
        }

        // Dispatch reset password email code
        const sendResult = await signIn.resetPasswordEmailCode.sendCode();
        if (sendResult.error) {
          setError(sendResult.error.message || 'Could not send verification code.');
          return;
        }

        setSuccessMessage(`Security code dispatched to ${email}`);
        setStep('reset');
      } catch (err: unknown) {
        const anyErr = err as {
          errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
          message?: string;
        };
        const message =
          anyErr?.errors?.[0]?.longMessage ||
          anyErr?.errors?.[0]?.message ||
          anyErr?.message ||
          'Could not dispatch password reset code. Please verify the email address.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [signIn, isLoading, email]
  );

  // Step 2: Verify code and set new password
  const handleResetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!signIn || isLoading) return;

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Verify the code
        const verifyResult = await signIn.resetPasswordEmailCode.verifyCode({
          code: code.trim(),
        });

        if (verifyResult.error) {
          setError(verifyResult.error.message || 'Invalid or expired verification code.');
          return;
        }

        // Submit the new password
        const submitResult = await signIn.resetPasswordEmailCode.submitPassword({
          password: newPassword,
        });

        if (submitResult.error) {
          setError(submitResult.error.message || 'Could not update password. Please check requirements.');
          return;
        }

        if (signIn.status === 'complete' && signIn.createdSessionId) {
          await clerk.setActive({ session: signIn.createdSessionId });
          router.push(redirectUrl);
          router.refresh();
        } else {
          setError(`Password reset status: ${signIn.status}`);
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
          'Invalid verification code or password does not meet requirements.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [signIn, isLoading, newPassword, confirmPassword, code, clerk, router, redirectUrl]
  );

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-[#0B0D12] text-white selection:bg-emerald-500 selection:text-white">
      <AuthBackground3D />

      <div className="relative z-10 w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* ── Left Column: Value Prop & Safeguards ── */}
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
              Enterprise security built into every sales interaction
            </h1>

            {/* Subheadline */}
            <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-400 sm:text-lg">
              Bank-grade 256-bit encryption, strict human-in-the-loop validation, and SOC-2 Type II compliance protecting your revenue pipeline.
            </p>

            {/* ── Docked ENTERPRISE SAFEGUARDS Card ── */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-8 max-w-xl rounded-2xl border border-white/10 bg-neutral-900/75 p-5 shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-3 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                ENTERPRISE SAFEGUARDS
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>AES-256 Data Encryption</span>
                  <span className="font-medium text-emerald-400">(Active)</span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>SOC-2 Type II Audited</span>
                  <span className="font-medium text-neutral-400">Verified</span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>Zero Cross-Tenant Leakage</span>
                  <span className="font-medium text-neutral-400">Enforced</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* ── Right Column: Password Recovery Card ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }}
            className="flex justify-center lg:col-span-5 xl:col-span-5 lg:justify-end"
          >
            <div className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#12151C]/85 p-6 shadow-2xl shadow-black/80 backdrop-blur-2xl sm:p-8">
              {/* Shield Icon */}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-lg shadow-emerald-950/50">
                <Shield className="h-6 w-6" />
              </div>

              {/* Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Reset your password
                </h2>
                <p className="mt-1 text-sm text-neutral-400">
                  Enter your verified work email and we will send you a secure link to reset your credentials.
                </p>
              </div>

              {/* Status Notices */}
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

                {successMessage && !error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/50 p-3 text-xs text-emerald-200"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                    <span>{successMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {step === 'email' ? (
                /* Step 1: Submit email */
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="reset-email"
                      className="block text-xs font-medium text-neutral-300"
                    >
                      Work Email
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      autoComplete="email"
                      className="w-full rounded-xl border border-white/10 bg-neutral-900/90 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                      'Send Reset Link'
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Verification Code + New Password */
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="reset-code"
                      className="block text-xs font-medium text-neutral-300"
                    >
                      6-Digit Security Code
                    </label>
                    <input
                      id="reset-code"
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                      className="w-full text-center tracking-widest font-mono rounded-xl border border-white/10 bg-neutral-900/90 px-3.5 py-2.5 text-base text-white placeholder-neutral-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="new-password"
                      className="block text-xs font-medium text-neutral-300"
                    >
                      New Password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-white/10 bg-neutral-900/90 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="confirm-password"
                      className="block text-xs font-medium text-neutral-300"
                    >
                      Confirm New Password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-white/10 bg-neutral-900/90 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                      'Update Password & Sign In'
                    )}
                  </button>
                </form>
              )}

              {/* Footer */}
              <div className="mt-6 flex flex-col items-center gap-2">
                <a
                  href={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`}
                  className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In
                </a>
                <p className="text-[11px] text-neutral-500">
                  Links expire in 15 minutes for your security
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090E]" />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}

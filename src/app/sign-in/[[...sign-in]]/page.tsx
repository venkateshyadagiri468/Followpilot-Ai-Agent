'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSignIn, useClerk } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import { AuthBackground3D } from '@/components/auth/AuthBackground3D';
import { AuthSocialButtons } from '@/components/auth/AuthSocialButtons';

export default function SignInPage() {
  const { signIn } = useSignIn();
  const clerk = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const completeSignIn = useCallback(
    async (sessionId?: string | null) => {
      const activeSessionId = sessionId || signIn?.createdSessionId;
      if (activeSessionId) {
        await clerk.setActive({ session: activeSessionId });
      }
      router.push(redirectUrl);
      router.refresh();
    },
    [signIn, clerk, router, redirectUrl]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!signIn || isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await signIn.password({
          identifier,
          password,
        });

        if (result.error) {
          setError(result.error.message || 'Invalid credentials');
          return;
        }

        if (signIn.status === 'complete') {
          await completeSignIn(signIn.createdSessionId);
        } else {
          setError(`Additional verification required: ${signIn.status}`);
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
          'Invalid credentials. Please verify your email and password.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [signIn, isLoading, identifier, password, completeSignIn]
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
          {/* ── Left Column: Value Prop & Docked Prospect Insight ── */}
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

            {/* Extra-Bold Architectural Headline */}
            <h1 className="text-4xl font-black leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl lg:text-[3.25rem]">
              Outreach automation built for high-growth sales teams
            </h1>

            {/* Subheadline */}
            <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-400 sm:text-lg">
              Research accounts, draft tailored messages, and close faster with trusted human-in-the-loop AI.
            </p>

            {/* ── Docked PROSPECT INSIGHT Card (Directly Below Headline) ── */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-8 max-w-xl rounded-2xl border border-white/10 bg-neutral-900/75 p-5 shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-3 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                PROSPECT INSIGHT
              </div>

              {/* Profile Header */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-gradient-to-tr from-emerald-600 to-sky-500 font-semibold text-white">
                    SJ
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Sarah Jenkins
                    </h3>
                    <p className="text-xs text-neutral-400">
                      VP Revenue Operations at CloudScale
                    </p>
                  </div>
                </div>

                <div className="rounded-full border border-sky-500/30 bg-sky-950/60 px-2.5 py-1 text-xs font-medium text-sky-300">
                  94% Intent
                </div>
              </div>

              {/* Drafted Email Snippet */}
              <div className="mt-4 rounded-xl border border-white/5 bg-neutral-950/60 p-4">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-medium text-neutral-300">
                    Drafted email
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/80 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Pending Approval
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-neutral-300">
                  Hi Sarah, noticed your recent expansion into enterprise accounts at CloudScale. High-growth teams typically spend 40% of their reps&apos; time manually personalizing outreach. FollowPilot automates research and pre-drafts contextual touches so you close faster.
                </p>
                <p className="mt-2 text-xs text-neutral-400">
                  Thanks,
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* ── Right Column: Decreased-Size Compact Functional Auth Card ── */}
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
                  Sign in to FollowPilot
                </h2>
                <p className="mt-1 text-sm text-neutral-400">
                  Welcome back. Enter your details to continue.
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

              {/* Social Login Section */}
              <div className="space-y-3">
                <div className="text-center text-[11px] font-medium tracking-wider text-neutral-400 uppercase">
                  Social login
                </div>
                <AuthSocialButtons
                  mode="sign-in"
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
                    or sign in with email
                  </span>
                </div>
              </div>

              {/* Email + Password Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="name@company.com"
                    autoComplete="email"
                    className="w-full rounded-xl border border-white/10 bg-neutral-900/90 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-xs font-medium text-neutral-300"
                    >
                      Password
                    </label>
                    <a
                      href={`/forgot-password?redirect_url=${encodeURIComponent(redirectUrl)}`}
                      className="text-xs text-neutral-400 transition-colors hover:text-emerald-400"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
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
                    'Sign In'
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-6 text-center text-xs text-neutral-400">
                Don&apos;t have an account?{' '}
                <a
                  href={`/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`}
                  className="font-medium text-white transition-colors hover:text-emerald-400"
                >
                  Sign up
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
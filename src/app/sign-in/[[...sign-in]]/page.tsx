'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSignIn, useClerk } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { AuthBackground3D } from '@/components/auth/AuthBackground3D';

const FEATURES = [
  'Smart lead scoring & prioritization',
  'AI-drafted personalized emails',
  'Automated follow-up scheduling',
];

export default function SignInPage() {
  const { signIn, errors } = useSignIn();
  const clerk = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'identifier' | 'password'>('identifier');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const completeSignIn = useCallback(async () => {
    const sessionId = signIn?.createdSessionId;
    if (sessionId) {
      await clerk.setActive({ session: sessionId });
    }
    router.push(redirectUrl);
    router.refresh();
  }, [signIn, clerk, router, redirectUrl]);

  const handleIdentifierSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!signIn || isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await signIn.create({ identifier });
        if (result.error) {
          setError(result.error.message || 'Something went wrong');
          return;
        }
        const status = signIn.status;
        if (status === 'complete') {
          await completeSignIn();
        } else if (status === 'needs_first_factor' || status === 'needs_identifier') {
          setStep('password');
        } else {
          setError(`Unexpected sign-in status: ${status}`);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Something went wrong';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [signIn, identifier, isLoading, completeSignIn]
  );

  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!signIn || isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await signIn.password({ password });
        if (result.error) {
          setError(result.error.message || 'Invalid credentials');
          return;
        }
        const status = signIn.status;
        if (status === 'complete') {
          await completeSignIn();
        } else {
          setError(`Unexpected sign-in status: ${status}`);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid credentials';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [signIn, password, isLoading, completeSignIn]
  );

  const handleBack = useCallback(() => {
    setPassword('');
    setError(null);
    setStep('identifier');
  }, []);

  const handleOAuth = useCallback(
    async (provider: 'google' | 'github') => {
      if (!signIn) return;
      try {
        const strategy = provider === 'google' ? 'oauth_google' : 'oauth_github';
        await signIn.sso({
          strategy,
          redirectUrl: '/sso-callback',
          redirectCallbackUrl: redirectUrl,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Could not launch social login';
        setError(message);
      }
    },
    [signIn, redirectUrl]
  );

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 via-brand-50/30 to-neutral-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-brand-600" />
          <p className="text-sm text-neutral-500">Loading…</p>
        </div>
      </div>
    );
  }

  const globalError = error || errors?.global?.[0]?.message || null;
  const identifierError = errors?.fields?.identifier?.message;
  const passwordError = errors?.fields?.password?.message;

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gradient-to-br from-neutral-50 via-brand-50/40 to-neutral-100">
      <AuthBackground3D />

      <div className="relative z-10 flex w-full items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          {/* ── Left: brand & product story ── */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="hidden lg:flex lg:flex-col lg:gap-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700 shadow-lg shadow-brand-900/25">
                <svg
                  className="h-7 w-7 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <span className="text-2xl font-bold tracking-tight text-neutral-900">
                FollowPilot
              </span>
            </div>

            <div className="space-y-5">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="text-4xl font-extrabold leading-tight tracking-tight text-neutral-900 xl:text-5xl"
              >
                Your AI-powered{' '}
                <span className="bg-gradient-to-r from-brand-700 via-brand-500 to-brand-400 bg-clip-text text-transparent">
                  sales outreach
                </span>{' '}
                assistant
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="max-w-lg text-lg leading-relaxed text-neutral-600"
              >
                Automate lead research, craft personalized outreach, and close deals faster —
                all in one intelligent platform.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="flex flex-col gap-3.5 pt-1"
            >
              {FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-100">
                    <Check className="h-4 w-4 text-brand-700" strokeWidth={3} />
                  </div>
                  <span className="text-neutral-700">{feature}</span>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="pt-2"
            >
              <p className="text-sm text-neutral-500">Trusted by sales teams worldwide</p>
            </motion.div>
          </motion.div>

          {/* ── Right: sign-in card ── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            className="flex items-center justify-center"
          >
            <Card className="w-full max-w-md border-white/60 shadow-2xl shadow-brand-900/10 backdrop-blur-sm">
              <CardHeader className="items-center text-center pb-4">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700 shadow-lg shadow-brand-900/25 lg:hidden">
                  <svg
                    className="h-7 w-7 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl">Welcome back</CardTitle>
                <CardDescription>Sign in to your FollowPilot account</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <AnimatePresence>
                  {globalError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700"
                      role="alert"
                    >
                      <svg
                        className="h-4 w-4 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {globalError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form
                  onSubmit={step === 'identifier' ? handleIdentifierSubmit : handlePasswordSubmit}
                  className="space-y-4"
                >
                  <AnimatePresence mode="wait">
                    {step === 'identifier' ? (
                      <motion.div
                        key="identifier"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="identifier">Email address</Label>
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                            <Input
                              id="identifier"
                              type="email"
                              placeholder="you@company.com"
                              value={identifier}
                              onChange={(e) => setIdentifier(e.target.value)}
                              autoComplete="email"
                              required
                              autoFocus
                              className="pl-10"
                              aria-invalid={!!identifierError}
                            />
                          </div>
                          {identifierError && (
                            <p className="text-xs text-danger-500">{identifierError}</p>
                          )}
                        </div>
                        <Button type="submit" className="w-full" size="lg" loading={isLoading}>
                          Continue
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="password"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate pr-2 text-neutral-500">{identifier}</span>
                          <button
                            type="button"
                            onClick={handleBack}
                            className="font-medium text-brand-600 transition-colors hover:text-brand-700"
                          >
                            Not you?
                          </button>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <div className="relative">
                            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                            <Input
                              id="password"
                              type="password"
                              placeholder="Enter your password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              autoComplete="current-password"
                              required
                              autoFocus
                              className="pl-10"
                              aria-invalid={!!passwordError}
                            />
                          </div>
                          {passwordError && (
                            <p className="text-xs text-danger-500">{passwordError}</p>
                          )}
                        </div>
                        <Button type="submit" className="w-full" size="lg" loading={isLoading}>
                          Sign in
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>

                <div className="relative py-1">
                  <Separator className="w-full" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-white px-3 text-xs uppercase tracking-widest text-neutral-400">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="secondary" type="button" onClick={() => handleOAuth('google')} className="h-11">
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </Button>
                  <Button variant="secondary" type="button" onClick={() => handleOAuth('github')} className="h-11">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                  </Button>
                </div>

                <p className="pt-2 text-center text-sm text-neutral-500">
                  Don&apos;t have an account?{' '}
                  <a
                    href={`/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`}
                    className="font-semibold text-brand-600 transition-colors hover:text-brand-700"
                  >
                    Sign up
                  </a>
                </p>
              </CardContent>

              <CardFooter className="flex-col gap-1.5">
                <p className="text-center text-xs text-neutral-400">
                  By continuing, you agree to our{' '}
                  <a href="/terms" className="text-brand-600 hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-brand-600 hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
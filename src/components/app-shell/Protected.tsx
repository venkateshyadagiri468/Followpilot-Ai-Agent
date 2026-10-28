'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell/AppShell';

/**
 * Client-side auth gate.
 * In @clerk/nextjs v7 (Clerk Core 3) <SignedOut> is removed; auth
 * conditional rendering must use useAuth() in a client component.
 */
export function Protected({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-brand-600" />
          <p className="text-sm text-neutral-500">Checking session…</p>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
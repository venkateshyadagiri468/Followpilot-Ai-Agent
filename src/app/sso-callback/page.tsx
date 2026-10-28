'use client';

import { Suspense } from 'react';
import { HandleSSOCallback } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';

function SSOCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/';

  const navigateToApp = ({ decorateUrl }: { session: unknown; decorateUrl: (url: string) => string }) => {
    const destination = decorateUrl(redirectUrl);
    if (destination.startsWith('http')) {
      window.location.href = destination;
      return;
    }
    router.push(destination);
    router.refresh();
  };

  const navigateToSignIn = () => {
    const params = new URLSearchParams();
    params.set('redirect_url', redirectUrl);
    router.push(`/sign-in?${params.toString()}`);
    router.refresh();
  };

  const navigateToSignUp = () => {
    const params = new URLSearchParams();
    params.set('redirect_url', redirectUrl);
    router.push(`/sign-up?${params.toString()}`);
    router.refresh();
  };

  return (
    <HandleSSOCallback
      navigateToApp={navigateToApp}
      navigateToSignIn={navigateToSignIn}
      navigateToSignUp={navigateToSignUp}
    />
  );
}

export default function SSOCallbackPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <SSOCallbackContent />
    </Suspense>
  );
}
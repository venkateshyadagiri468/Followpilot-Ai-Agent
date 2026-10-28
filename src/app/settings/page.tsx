import { SignedIn, SignedOut } from '@clerk/nextjs';
import { Suspense } from 'react';
import { SettingsContent } from './SettingsContent';

export default function SettingsPage() {
  return (
    <>
      <SignedOut>
        <script dangerouslySetInnerHTML={{ __html: `window.location.href = "/sign-in";` }} />
      </SignedOut>
      <SignedIn>
        <Suspense fallback={<div className="p-8 text-center text-neutral-500">Loading…</div>}>
          <SettingsContent />
        </Suspense>
      </SignedIn>
    </>
  );
}
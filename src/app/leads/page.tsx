import { SignedIn, SignedOut } from '@clerk/nextjs';
import { Suspense } from 'react';
import { LeadsContent } from './LeadsContent';

export default function LeadsPage() {
  return (
    <>
      <SignedOut>
        <script dangerouslySetInnerHTML={{ __html: `window.location.href = "/sign-in";` }} />
      </SignedOut>
      <SignedIn>
        <Suspense fallback={<div className="p-8 text-center text-neutral-500">Loading…</div>}>
          <LeadsContent />
        </Suspense>
      </SignedIn>
    </>
  );
}
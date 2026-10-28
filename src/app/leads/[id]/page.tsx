import { SignedIn, SignedOut } from '@clerk/nextjs';
import { Suspense } from 'react';
import { LeadDetailContent } from './LeadDetailContent';

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  return (
    <>
      <SignedOut>
        <script dangerouslySetInnerHTML={{ __html: `window.location.href = "/sign-in";` }} />
      </SignedOut>
      <SignedIn>
        <Suspense fallback={<div className="p-8 text-center text-neutral-500">Loading…</div>}>
          <LeadDetailContent id={params.id} />
        </Suspense>
      </SignedIn>
    </>
  );
}
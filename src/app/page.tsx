import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell/AppShell';
import { DashboardContent } from './DashboardContent';

export default async function Page() {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.userId ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}
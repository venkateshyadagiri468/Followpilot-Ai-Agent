import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FollowPilot AI',
  description: 'AI sales assistant for B2B outreach.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="bg-neutral-50">
        <body className="min-h-screen text-neutral-900 font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
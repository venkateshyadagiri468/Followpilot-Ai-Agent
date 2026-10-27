import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FollowPilot AI",
  description: "AI sales assistant for freelancers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="bg-warm-white">
        <body className="min-h-screen text-gray-900">{children}</body>
      </html>
    </ClerkProvider>
  );
}

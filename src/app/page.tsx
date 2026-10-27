import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { Suspense } from "react";

export default function Dashboard() {
  return (
    <main className="p-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between pb-6 mb-8 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">FollowPilot AI</h1>
          <p className="text-sm text-gray-500">Premium sales workspace for freelancers</p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense fallback={<div className="h-9 w-20 animate-pulse bg-gray-100 rounded-md" />}>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition cursor-pointer">
                  Sign Up
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </Suspense>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Open Opportunities</h2>
          <p className="text-4xl font-bold text-emerald-600">$42,800</p>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Follow-ups due</h2>
          <p className="text-4xl font-bold text-emerald-600">6</p>
        </div>
      </div>
    </main>
  );
}


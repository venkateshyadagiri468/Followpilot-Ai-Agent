'use client';

import { UserButton } from '@clerk/nextjs';

interface TopBarProps {
  user?: { name: string; email: string } | null;
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a1.94 1.94 0 0 0 2.85 0" />
    </svg>
  );
}

export function TopBar({ user }: TopBarProps) {
  return (
    <header className="h-16 border-b border-neutral-200 bg-white flex items-center px-6 gap-4">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search leads, tasks..."
            className="w-full rounded-md border border-neutral-300 bg-neutral-50 pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative p-2 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          aria-label="Notifications"
        >
          <BellIcon />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-2.5 pl-3 border-l border-neutral-200">
          {user && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-neutral-900 leading-none">{user.name}</span>
              <span className="text-xs text-neutral-500 mt-0.5">{user.email}</span>
            </div>
          )}
          <UserButton />
        </div>
      </div>
    </header>
  );
}
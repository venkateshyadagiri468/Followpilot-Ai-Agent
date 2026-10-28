'use client';

import Link from 'next/link';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  navItems: NavItem[];
  currentPath: string;
}

export function Sidebar({ navItems, currentPath }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-neutral-200 bg-white flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-neutral-200 flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
          F
        </div>
        <span className="font-semibold text-neutral-900">FollowPilot</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                transition-colors duration-base
                ${isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }
              `.trim().replace(/\s+/g, ' ')}
            >
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-neutral-200">
        <div className="px-3 py-2 text-xs text-neutral-400">
          FollowPilot AI v1.0
        </div>
      </div>
    </aside>
  );
}
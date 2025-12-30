'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface SidebarItem {
  label: string;
  href: string;
  icon: string;
  roles?: string[];
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

const sidebarSections: SidebarSection[] = [
  {
    title: 'Content',
    items: [
      { label: 'Overview', href: '/dashboard', icon: '📊' },
      { label: 'My Posts', href: '/dashboard/posts', icon: '📝' },
      { label: 'Create New', href: '/dashboard/posts/new', icon: '✨' },
      { label: 'Media Library', href: '/dashboard/media', icon: '🎬' },
    ],
  },
  {
    title: 'Insights',
    items: [{ label: 'Analytics', href: '/dashboard/analytics', icon: '📈' }],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', href: '/dashboard/profile', icon: '👤' },
      { label: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
    ],
  },
  {
    title: 'Editorial',
    items: [
      {
        label: 'Review Queue',
        href: '/editor/queue',
        icon: '📋',
        roles: ['editor', 'admin', 'superadmin'],
      },
    ],
  },
  {
    title: 'Admin',
    items: [
      {
        label: 'Admin Home',
        href: '/admin',
        icon: '🛡️',
        roles: ['admin', 'superadmin'],
      },
      {
        label: 'All Users',
        href: '/admin/users',
        icon: '👥',
        roles: ['admin', 'superadmin'],
      },
      {
        label: 'Applications',
        href: '/admin/applications',
        icon: '📋',
        roles: ['admin', 'superadmin'],
      },
    ],
  },
];

function SidebarContent({
  sections,
  pathname,
  role,
  onItemClick,
}: {
  sections: SidebarSection[];
  pathname: string;
  role: string;
  onItemClick?: () => void;
}) {
  return (
    <nav className="p-3 sm:p-4 space-y-6">
      {sections.map((section) => {
        const filteredItems = section.items.filter(
          (item) => !item.roles || item.roles.includes(role)
        );

        if (filteredItems.length === 0) return null;

        return (
          <div key={section.title}>
            <p
              className="text-[10px] sm:text-xs uppercase tracking-wider mb-2 px-3"
              style={{
                color: 'var(--foreground)',
                opacity: 0.5,
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
              }}
            >
              {section.title}
            </p>
            <div className="space-y-1">
              {filteredItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' &&
                    item.href !== '/admin' &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onItemClick}
                    className={`
                      flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all duration-200
                      min-h-[44px] relative overflow-hidden
                      ${
                        isActive
                          ? 'text-[var(--background)] font-medium'
                          : 'text-[var(--foreground)] hover:bg-[var(--surface-elevated)]'
                      }
                    `}
                    style={{
                      background: isActive
                        ? 'linear-gradient(90deg, var(--primary), var(--primary))'
                        : undefined,
                      boxShadow: isActive ? '0 0 20px var(--glow-primary)' : undefined,
                    }}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                        style={{ background: 'var(--accent)' }}
                      />
                    )}
                    <span className="text-lg sm:text-xl">{item.icon}</span>
                    <span
                      className="text-sm"
                      style={{
                        fontFamily: 'var(--font-body)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Back to site link */}
      <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <Link
          href="/"
          className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-all duration-200 min-h-[44px]"
        >
          <span className="text-lg sm:text-xl">🏠</span>
          <span
            className="text-sm"
            style={{ fontFamily: 'var(--font-body)', letterSpacing: '-0.02em' }}
          >
            Back to Site
          </span>
        </Link>
      </div>
    </nav>
  );
}

export default function DashboardSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 active:scale-95"
        style={{
          background: 'var(--primary)',
          boxShadow: '0 0 20px var(--glow-primary)',
        }}
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen ? 'true' : 'false'}
        aria-controls="dashboard-sidebar"
      >
        <span className="text-2xl text-[var(--background)]">{mobileOpen ? '✕' : '☰'}</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 w-full h-full cursor-default"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      {/* Sidebar */}
      <aside
        id="dashboard-sidebar"
        className={`
          fixed top-14 sm:top-16 bottom-0 left-0 w-64 z-40
          transform transition-transform duration-300 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          boxShadow: mobileOpen ? '4px 0 20px rgba(0,0,0,0.2)' : undefined,
        }}
      >
        <div className="h-full overflow-y-auto">
          <SidebarContent
            sections={sidebarSections}
            pathname={pathname}
            role={role}
            onItemClick={() => setMobileOpen(false)}
          />
        </div>
      </aside>
    </>
  );
}

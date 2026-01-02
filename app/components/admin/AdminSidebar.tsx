'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface SidebarItem {
  label: string;
  href: string;
  icon: string;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

const sidebarSections: SidebarSection[] = [
  {
    title: 'Moderation',
    items: [
      { label: 'Overview', href: '/admin', icon: '📊' },
      { label: 'Applications', href: '/admin/applications', icon: '📋' },
      { label: 'All Posts', href: '/admin/posts', icon: '📝' },
      { label: 'Comments', href: '/admin/comments', icon: '💬' },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Users', href: '/admin/users', icon: '👥' },
      { label: 'Categories', href: '/admin/categories', icon: '🏷️' },
      { label: 'Media', href: '/admin/media', icon: '🎬' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Analytics', href: '/admin/analytics', icon: '📈' },
      { label: 'Settings', href: '/admin/settings', icon: '⚙️' },
    ],
  },
];

function SidebarContent({
  sections,
  pathname,
  onItemClick,
}: {
  sections: SidebarSection[];
  pathname: string;
  onItemClick?: () => void;
}) {
  return (
    <nav className="p-3 sm:p-4 space-y-6">
      {sections.map((section) => (
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
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href));

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
                      ? 'linear-gradient(90deg, var(--accent), var(--accent))'
                      : undefined,
                    boxShadow: isActive ? '0 0 20px var(--glow-accent)' : undefined,
                  }}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                      style={{ background: 'var(--secondary)' }}
                    />
                  )}
                  <span className="text-lg sm:text-xl">{item.icon}</span>
                  <span
                    className="text-sm"
                    style={{ fontFamily: 'var(--font-body)', letterSpacing: '-0.02em' }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* Navigation links */}
      <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-all duration-200 min-h-[44px]"
        >
          <span className="text-lg sm:text-xl">🎨</span>
          <span
            className="text-sm"
            style={{ fontFamily: 'var(--font-body)', letterSpacing: '-0.02em' }}
          >
            Contributor Dashboard
          </span>
        </Link>
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

export default function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 active:scale-95"
        style={{
          background: 'var(--accent)',
          boxShadow: '0 0 20px var(--glow-accent)',
        }}
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
      >
        <span className="text-2xl text-[var(--background)]">{mobileOpen ? '✕' : '☰'}</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
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
            onItemClick={() => setMobileOpen(false)}
          />
        </div>
      </aside>
    </>
  );
}

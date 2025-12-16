'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/hooks';
import { getInitials } from '@/lib/utils';
import { type User } from '@supabase/supabase-js';

interface DashboardHeaderProps {
  user: User;
  profile: {
    display_name?: string | null;
    avatar_url?: string | null;
    role: string;
  };
}

export default function DashboardHeader({ user, profile }: DashboardHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = profile.display_name || user.email?.split('@')[0] || 'User';

  return (
    <header
      className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-4 lg:px-6"
      style={{ 
        background: 'var(--surface)', 
        borderBottom: '1px solid var(--border)' 
      }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center gap-3"
      >
        <div className="flex flex-col items-center">
          <span 
            className="text-lg sm:text-xl font-bold tracking-wider"
            style={{ 
              fontFamily: 'var(--font-kindergarten)',
              color: 'var(--primary)' 
            }}
          >
            scroungers
          </span>
          <span 
            className="text-[7px] sm:text-[9px] uppercase tracking-[0.25em] -mt-1"
            style={{ 
              fontFamily: 'var(--font-body)',
              color: 'var(--accent)',
              fontWeight: 500,
            }}
          >
            MULTIMEDIA
          </span>
        </div>
        <span 
          className="text-xs sm:text-sm px-2 py-0.5 rounded hidden sm:inline-block" 
          style={{ 
            background: 'var(--primary)', 
            color: 'var(--background)',
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
          }}
        >
          Dashboard
        </span>
      </Link>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Quick actions */}
        <Link
          href="/dashboard/posts/new"
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{ 
            background: 'var(--primary)', 
            color: 'var(--background)',
            fontFamily: 'var(--font-body)'
          }}
        >
          <span>✨</span>
          <span>New Post</span>
        </Link>

        {/* User dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-[var(--surface-elevated)]"
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
              style={{ background: 'var(--primary)', color: 'var(--background)' }}
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(displayName)
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {displayName}
              </p>
              <p className="text-xs capitalize" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                {profile.role}
              </p>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              style={{ color: 'var(--foreground)' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg py-2"
              style={{ 
                background: 'var(--surface-elevated)', 
                border: '1px solid var(--border)' 
              }}
            >
              <Link
                href="/dashboard/profile"
                className="block px-4 py-2 text-sm hover:bg-[var(--surface)]"
                style={{ color: 'var(--foreground)' }}
                onClick={() => setDropdownOpen(false)}
              >
                👤 My Profile
              </Link>
              <Link
                href="/dashboard/settings"
                className="block px-4 py-2 text-sm hover:bg-[var(--surface)]"
                style={{ color: 'var(--foreground)' }}
                onClick={() => setDropdownOpen(false)}
              >
                ⚙️ Settings
              </Link>
              <hr className="my-2" style={{ borderColor: 'var(--border)' }} />
              <button
                onClick={() => void signOut()}
                className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface)]"
                style={{ color: 'var(--accent)' }}
              >
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}




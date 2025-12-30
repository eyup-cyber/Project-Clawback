/**
 * Session Manager Component
 * Phase 7.6: List sessions, device info, revoke
 */

'use client';

import { useCallback, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { formatRelativeTime } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface Session {
  id: string;
  user_id: string;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  ip_address: string;
  location: string | null;
  is_current: boolean;
  last_active_at: string;
  created_at: string;
}

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  desktop: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  mobile: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  tablet: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  unknown: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  mapPin: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  clock: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  shield: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  x: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  logout: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  check: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

// ============================================================================
// DEVICE ICON MAP
// ============================================================================

const getDeviceIcon = (type: Session['device_type']) => {
  switch (type) {
    case 'desktop':
      return Icons.desktop;
    case 'mobile':
      return Icons.mobile;
    case 'tablet':
      return Icons.tablet;
    default:
      return Icons.unknown;
  }
};

// ============================================================================
// FETCHER
// ============================================================================

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

// ============================================================================
// SESSION CARD COMPONENT
// ============================================================================

function SessionCard({
  session,
  onRevoke,
  isRevoking,
}: {
  session: Session;
  onRevoke: (id: string) => void;
  isRevoking: boolean;
}) {
  return (
    <div
      className={`
        p-4 rounded-xl border transition-all
        ${session.is_current ? 'ring-2 ring-[var(--primary)]' : ''}
      `}
      style={{
        background: 'var(--surface)',
        borderColor: session.is_current ? 'var(--primary)' : 'var(--border)',
      }}
    >
      <div className="flex items-start gap-4">
        {/* Device icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: session.is_current ? 'var(--primary)' : 'var(--surface-elevated)',
            color: session.is_current ? 'var(--background)' : 'var(--foreground)',
          }}
        >
          {getDeviceIcon(session.device_type)}
        </div>

        {/* Session info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate" style={{ color: 'var(--foreground)' }}>
              {session.browser} on {session.os}
            </h4>
            {session.is_current && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  background: 'var(--secondary)',
                  color: 'var(--background)',
                }}
              >
                {Icons.check}
                Current
              </span>
            )}
          </div>

          <div
            className="mt-2 space-y-1 text-xs"
            style={{ color: 'var(--foreground)', opacity: 0.6 }}
          >
            {session.location && (
              <div className="flex items-center gap-1.5">
                {Icons.mapPin}
                <span>{session.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              {Icons.shield}
              <span>IP: {session.ip_address}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {Icons.clock}
              <span>
                {session.is_current
                  ? 'Active now'
                  : `Last active ${formatRelativeTime(session.last_active_at)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {!session.is_current && (
          <button
            onClick={() => onRevoke(session.id)}
            disabled={isRevoking}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--surface-elevated)] disabled:opacity-50"
            style={{ color: '#ef4444' }}
            title="Revoke session"
          >
            {isRevoking ? (
              <div
                className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{
                  borderColor: '#ef4444',
                  borderTopColor: 'transparent',
                }}
              />
            ) : (
              Icons.logout
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SessionManager() {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeAllConfirm, setRevokeAllConfirm] = useState(false);

  const { data, error, isLoading } = useSWR<{ sessions: Session[] }>(
    '/api/auth/sessions',
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  const sessions = data?.sessions || [];
  const currentSession = sessions.find((s) => s.is_current);
  const otherSessions = sessions.filter((s) => !s.is_current);

  const handleRevoke = useCallback(async (sessionId: string) => {
    setRevokingId(sessionId);

    try {
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to revoke session');

      // Refresh the sessions list
      mutate('/api/auth/sessions');
    } catch (error) {
      console.error('Failed to revoke session:', error);
    } finally {
      setRevokingId(null);
    }
  }, []);

  const handleRevokeAll = useCallback(async () => {
    setRevokeAllConfirm(false);

    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to revoke sessions');

      // Refresh the sessions list
      mutate('/api/auth/sessions');
    } catch (error) {
      console.error('Failed to revoke all sessions:', error);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl animate-pulse"
            style={{ background: 'var(--surface)' }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-6 rounded-xl border text-center"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <p style={{ color: '#ef4444' }}>Failed to load sessions</p>
        <button
          onClick={() => mutate('/api/auth/sessions')}
          className="mt-2 text-sm underline"
          style={{ color: 'var(--primary)' }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3
            className="text-lg font-bold"
            style={{
              color: 'var(--foreground)',
              fontFamily: 'var(--font-kindergarten)',
            }}
          >
            Active Sessions
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Manage your active sessions across devices
          </p>
        </div>

        {otherSessions.length > 0 && (
          <button
            onClick={() => setRevokeAllConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
            }}
          >
            {Icons.logout}
            <span className="text-sm font-medium">Sign out all others</span>
          </button>
        )}
      </div>

      {/* Current session */}
      {currentSession && (
        <div>
          <h4
            className="text-xs font-medium uppercase tracking-wider mb-3"
            style={{ color: 'var(--foreground)', opacity: 0.5 }}
          >
            This device
          </h4>
          <SessionCard
            session={currentSession}
            onRevoke={(id) => void handleRevoke(id)}
            isRevoking={revokingId === currentSession.id}
          />
        </div>
      )}

      {/* Other sessions */}
      {otherSessions.length > 0 && (
        <div>
          <h4
            className="text-xs font-medium uppercase tracking-wider mb-3"
            style={{ color: 'var(--foreground)', opacity: 0.5 }}
          >
            Other devices ({otherSessions.length})
          </h4>
          <div className="space-y-3">
            {otherSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onRevoke={(id) => void handleRevoke(id)}
                isRevoking={revokingId === session.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {sessions.length === 0 && (
        <div
          className="p-8 rounded-xl border text-center"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{
              background: 'var(--surface-elevated)',
              color: 'var(--foreground)',
              opacity: 0.4,
            }}
          >
            {Icons.desktop}
          </div>
          <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>No active sessions found</p>
        </div>
      )}

      {/* Security tip */}
      <div
        className="p-4 rounded-xl border flex items-start gap-3"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--primary)', color: 'var(--background)' }}
        >
          {Icons.shield}
        </div>
        <div>
          <h4 className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
            Security Tip
          </h4>
          <p className="text-xs mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            If you notice any suspicious activity or don&apos;t recognize a device, revoke its
            access immediately and change your password.
          </p>
        </div>
      </div>

      {/* Revoke all confirmation modal */}
      {revokeAllConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setRevokeAllConfirm(false)}
        >
          <div
            className="p-6 rounded-xl w-full max-w-md animate-in fade-in zoom-in-95"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-lg font-bold mb-2"
              style={{
                color: 'var(--foreground)',
                fontFamily: 'var(--font-kindergarten)',
              }}
            >
              Sign out all other devices?
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              This will sign you out from all other browsers and devices. You will remain signed in
              on this device.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRevokeAllConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRevokeAll()}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: '#ef4444',
                  color: 'white',
                }}
              >
                Sign out all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface Session {
  id: string;
  device: {
    type: string;
    browser: string;
    os: string;
  };
  ipAddress: string;
  location: string | null;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

interface TwoFactorStatus {
  enabled: boolean;
  verifiedAt: string | null;
}

export default function SecuritySettingsPage() {
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchSecurityData = useCallback(async () => {
    try {
      // Fetch 2FA status
      const twoFaRes = await fetch('/api/auth/2fa/setup');
      if (twoFaRes.ok) {
        const twoFaData = await twoFaRes.json();
        setTwoFactorStatus(twoFaData.data);
      }

      // Fetch sessions
      const sessionsRes = await fetch('/api/auth/sessions');
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData.data.sessions || []);
      }
    } catch {
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSecurityData();
  }, [fetchSecurityData]);

  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        toast.success('Session revoked');
      } else {
        throw new Error('Failed to revoke session');
      }
    } catch {
      toast.error('Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllSessions = async () => {
    if (!confirm('This will sign you out of all other devices. Continue?')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Revoked ${data.data.revoked} session(s)`);
        void fetchSecurityData();
      } else {
        throw new Error('Failed to revoke sessions');
      }
    } catch {
      toast.error('Failed to revoke sessions');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📲';
      default:
        return '💻';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--surface)] rounded w-48" />
          <div className="h-32 bg-[var(--surface)] rounded" />
          <div className="h-64 bg-[var(--surface)] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}>
        Security Settings
      </h1>

      {/* Two-Factor Authentication */}
      <section className="mb-8 rounded-xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: twoFactorStatus?.enabled ? 'var(--primary)' : 'var(--border)' }}>
              <span className="text-2xl">{twoFactorStatus?.enabled ? '🔒' : '🔓'}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                Two-Factor Authentication
              </h2>
              <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                {twoFactorStatus?.enabled 
                  ? `Enabled since ${twoFactorStatus.verifiedAt ? formatDate(twoFactorStatus.verifiedAt) : 'recently'}`
                  : 'Add an extra layer of security to your account'}
              </p>
            </div>
          </div>
          <Link
            href={twoFactorStatus?.enabled ? '#' : '/2fa'}
            onClick={twoFactorStatus?.enabled ? (e) => {
              e.preventDefault();
              // Would show disable modal
              toast.error('To disable 2FA, use the verification flow');
            } : undefined}
            className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-[1.02]"
            style={{
              background: twoFactorStatus?.enabled ? 'transparent' : 'var(--primary)',
              color: twoFactorStatus?.enabled ? 'var(--accent)' : 'var(--background)',
              border: twoFactorStatus?.enabled ? '1px solid var(--accent)' : 'none',
            }}
          >
            {twoFactorStatus?.enabled ? 'Manage' : 'Enable'}
          </Link>
        </div>
      </section>

      {/* Active Sessions */}
      <section className="rounded-xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
            Active Sessions
          </h2>
          {sessions.length > 1 && (
            <button
              type="button"
              onClick={() => void revokeAllSessions()}
              className="text-sm hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Sign out all other sessions
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            No active sessions found
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ background: 'var(--background)' }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{getDeviceIcon(session.device.type)}</span>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {session.device.browser} on {session.device.os}
                      {session.isCurrent && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded" style={{ background: 'var(--primary)', color: 'var(--background)' }}>
                          Current
                        </span>
                      )}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                      {session.ipAddress}
                      {session.location && ` • ${session.location}`}
                      {' • '}Last active {formatDate(session.lastActiveAt)}
                    </p>
                  </div>
                </div>
                {!session.isCurrent && (
                  <button
                    type="button"
                    onClick={() => void revokeSession(session.id)}
                    disabled={revoking === session.id}
                    className="text-sm px-3 py-1 rounded border transition-all hover:bg-[var(--surface-elevated)] disabled:opacity-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  >
                    {revoking === session.id ? 'Revoking...' : 'Revoke'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Login History Link */}
      <div className="mt-6 text-center">
        <Link
          href="/dashboard/settings/security/history"
          className="text-sm hover:underline"
          style={{ color: 'var(--primary)' }}
        >
          View login history →
        </Link>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function TwoFactorVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [code, setCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isBackupCode && code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          isBackupCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Invalid code');
      }

      toast.success('Verified successfully');
      router.push(redirectTo);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--background)' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--primary)' }}
          >
            Two-Factor Verification
          </h1>
          <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            Enter the code from your authenticator app
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <form onSubmit={(e) => void handleVerify(e)} className="space-y-6">
            {/* Code Type Toggle */}
            <div
              className="flex rounded-xl overflow-hidden"
              style={{ background: 'var(--background)' }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsBackupCode(false);
                  setCode('');
                }}
                className={`flex-1 py-2 text-sm font-medium transition-all ${!isBackupCode ? 'bg-[var(--primary)] text-[var(--background)]' : ''}`}
                style={{ color: isBackupCode ? 'var(--foreground)' : undefined }}
              >
                Authenticator Code
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsBackupCode(true);
                  setCode('');
                }}
                className={`flex-1 py-2 text-sm font-medium transition-all ${isBackupCode ? 'bg-[var(--primary)] text-[var(--background)]' : ''}`}
                style={{ color: !isBackupCode ? 'var(--foreground)' : undefined }}
              >
                Backup Code
              </button>
            </div>

            {/* Code Input */}
            {!isBackupCode ? (
              <div>
                <label
                  htmlFor="totp-code"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--foreground)' }}
                >
                  6-Digit Code
                </label>
                <input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full py-4 text-center text-2xl tracking-widest rounded-xl border outline-none focus:border-[var(--primary)]"
                  style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>
            ) : (
              <div>
                <label
                  htmlFor="backup-code"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--foreground)' }}
                >
                  Backup Code
                </label>
                <input
                  id="backup-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  className="w-full py-4 text-center text-xl tracking-wider rounded-xl border outline-none focus:border-[var(--primary)]"
                  style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                  Enter one of your backup codes (with or without the hyphen)
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading || (!isBackupCode && code.length !== 6) || (isBackupCode && code.length < 8)
              }
              className="w-full py-3 rounded-xl font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{ background: 'var(--primary)', color: 'var(--background)' }}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t text-center" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm mb-3" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              Having trouble?
            </p>
            <Link
              href="/contact"
              className="text-sm hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              Contact Support
            </Link>
          </div>
        </div>

        <p
          className="text-center text-sm mt-6"
          style={{ color: 'var(--foreground)', opacity: 0.5 }}
        >
          <Link href="/login" className="hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}

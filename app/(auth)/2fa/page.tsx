'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

type SetupStep = 'initial' | 'scan' | 'verify' | 'backup' | 'complete';

interface SetupData {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export default function TwoFactorSetupPage() {
  const _router = useRouter();
  const [step, setStep] = useState<SetupStep>('initial');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [backupCodesSaved, setBackupCodesSaved] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to initialize 2FA setup');
      }

      setSetupData({
        qrCode: data.data.qrCode,
        secret: data.data.secret,
        backupCodes: data.data.backupCodes,
      });
      setStep('scan');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: verificationCode,
          isSetupVerification: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Invalid code');
      }

      setStep('backup');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (setupData?.backupCodes) {
      void navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      toast.success('Backup codes copied to clipboard');
    }
  };

  const downloadBackupCodes = () => {
    if (setupData?.backupCodes) {
      const content = `Scroungers Multimedia - 2FA Backup Codes\n${'='.repeat(45)}\n\nStore these codes in a safe place. Each code can only be used once.\n\n${setupData.backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nGenerated: ${new Date().toISOString()}`;

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scroungers-2fa-backup-codes.txt';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup codes downloaded');
    }
  };

  const completeSetup = () => {
    if (!backupCodesSaved) {
      toast.error('Please confirm you have saved your backup codes');
      return;
    }
    setStep('complete');
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
            Two-Factor Authentication
          </h1>
          <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            Add an extra layer of security to your account
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Step: Initial */}
          {step === 'initial' && (
            <div className="text-center space-y-6">
              <div
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
                style={{ background: 'var(--primary)', opacity: 0.1 }}
              >
                <span className="text-4xl">🔐</span>
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                  Secure Your Account
                </h2>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Two-factor authentication adds an extra layer of security by requiring a code from
                  your phone in addition to your password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void startSetup()}
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}
              >
                {loading ? 'Setting up...' : 'Get Started'}
              </button>
            </div>
          )}

          {/* Step: Scan QR Code */}
          {step === 'scan' && setupData && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                  Scan QR Code
                </h2>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Scan this code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
              </div>

              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-xl">
                  <img src={setupData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs mb-2" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                  Can&apos;t scan? Enter this code manually:
                </p>
                <code
                  className="block p-2 rounded text-sm break-all"
                  style={{ background: 'var(--background)', color: 'var(--primary)' }}
                >
                  {setupData.secret}
                </code>
              </div>

              <button
                type="button"
                onClick={() => setStep('verify')}
                className="w-full py-3 rounded-xl font-bold transition-all hover:scale-[1.02]"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}
              >
                Continue
              </button>
            </div>
          )}

          {/* Step: Verify */}
          {step === 'verify' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                  Verify Setup
                </h2>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full py-4 text-center text-2xl tracking-widest rounded-xl border outline-none focus:border-[var(--primary)]"
                style={{
                  background: 'var(--background)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              />

              <button
                type="button"
                onClick={() => void verifyCode()}
                disabled={loading || verificationCode.length !== 6}
                className="w-full py-3 rounded-xl font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}
              >
                {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
              </button>

              <button
                type="button"
                onClick={() => setStep('scan')}
                className="w-full py-2 text-sm"
                style={{ color: 'var(--foreground)', opacity: 0.7 }}
              >
                Back to QR code
              </button>
            </div>
          )}

          {/* Step: Backup Codes */}
          {step === 'backup' && setupData && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-4xl">🔑</span>
                <h2 className="text-xl font-bold mt-2 mb-2" style={{ color: 'var(--foreground)' }}>
                  Save Backup Codes
                </h2>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Save these codes in a secure location. You can use them to access your account if
                  you lose your phone.
                </p>
              </div>

              <div
                className="grid grid-cols-2 gap-2 p-4 rounded-xl"
                style={{ background: 'var(--background)' }}
              >
                {setupData.backupCodes.map((code) => (
                  <code
                    key={code}
                    className="text-sm py-1 text-center"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {code}
                  </code>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyBackupCodes}
                  className="flex-1 py-2 rounded-lg border text-sm font-medium transition-all hover:bg-[var(--surface-elevated)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={downloadBackupCodes}
                  className="flex-1 py-2 rounded-lg border text-sm font-medium transition-all hover:bg-[var(--surface-elevated)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                >
                  Download
                </button>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupCodesSaved}
                  onChange={(e) => setBackupCodesSaved(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                  I have saved my backup codes
                </span>
              </label>

              <button
                type="button"
                onClick={completeSetup}
                disabled={!backupCodesSaved}
                className="w-full py-3 rounded-xl font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}
              >
                Complete Setup
              </button>
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && (
            <div className="text-center space-y-6">
              <div
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
                style={{ background: 'var(--primary)' }}
              >
                <span className="text-4xl">✓</span>
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                  2FA Enabled!
                </h2>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Your account is now protected with two-factor authentication.
                </p>
              </div>
              <Link
                href="/dashboard/settings"
                className="block w-full py-3 rounded-xl font-bold transition-all hover:scale-[1.02] text-center"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}
              >
                Go to Settings
              </Link>
            </div>
          )}
        </div>

        <p
          className="text-center text-sm mt-6"
          style={{ color: 'var(--foreground)', opacity: 0.5 }}
        >
          <Link href="/dashboard" className="hover:underline">
            Skip for now
          </Link>
        </p>
      </div>
    </div>
  );
}

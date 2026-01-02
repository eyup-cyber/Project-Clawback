'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { forgotPasswordSchema } from '@/lib/validations';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate
    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0]?.message || 'Invalid email');
      setLoading(false);
      return;
    }

    // Send reset email
    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      toast.error(resetError.message || 'Failed to send reset email');
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div
        className="p-8 rounded-lg border text-center"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(50, 205, 50, 0.2)' }}
        >
          <span className="text-3xl">✉️</span>
        </div>
        <h1 className="text-2xl font-display mb-4" style={{ color: 'var(--foreground)' }}>
          Check Your Email
        </h1>
        <p className="mb-6" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
          We&apos;ve sent a password reset link to <strong>{email}</strong>. Click the link in the
          email to reset your password.
        </p>
        <p className="text-sm mb-6" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
          Don&apos;t see the email? Check your spam folder.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2 rounded-lg font-medium"
          style={{
            background: 'var(--primary)',
            color: '#000',
          }}
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div
      className="p-8 rounded-lg border"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <h1 className="text-2xl font-display text-center mb-2" style={{ color: 'var(--foreground)' }}>
        Forgot Password?
      </h1>
      <p className="text-center mb-6" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm mb-1"
            style={{ color: 'var(--foreground)', opacity: 0.8 }}
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            className="w-full px-4 py-3 rounded-lg border outline-none transition-all focus:ring-2"
            style={{
              background: 'var(--background)',
              borderColor: error ? '#EF4444' : 'var(--border)',
              color: 'var(--foreground)',
            }}
            placeholder="you@example.com"
          />
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
          style={{
            background: 'var(--primary)',
            color: '#000',
          }}
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      {/* Back to login */}
      <p className="mt-6 text-center text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
        Remember your password?{' '}
        <Link
          href="/login"
          className="font-medium hover:underline"
          style={{ color: 'var(--primary)' }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

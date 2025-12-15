'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);
  const supabase = createClient();

  const handleResend = async () => {
    setResending(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user?.email) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) {
        toast.error(error.message || 'Failed to resend email');
      } else {
        toast.success('Verification email sent!');
      }
    } else {
      toast.error('No user email found. Please try signing up again.');
    }

    setResending(false);
  };

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
        <span className="text-3xl">📧</span>
      </div>
      
      <h1
        className="text-2xl font-display mb-4"
        style={{ color: 'var(--foreground)' }}
      >
        Verify Your Email
      </h1>
      
      <p className="mb-6" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
        We&apos;ve sent a verification link to your email address. 
        Click the link to activate your account.
      </p>

      <div className="space-y-4">
        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full py-3 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 border"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
        >
          {resending ? 'Sending...' : 'Resend Verification Email'}
        </button>

        <Link
          href="/login"
          className="block w-full py-3 rounded-lg font-medium transition-all hover:opacity-90"
          style={{
            background: 'var(--primary)',
            color: '#000',
          }}
        >
          Go to Sign In
        </Link>
      </div>

      <p className="mt-6 text-sm" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
        Don&apos;t see the email? Check your spam folder.
      </p>
    </div>
  );
}




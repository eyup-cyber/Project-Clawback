'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { registerSchema, type RegisterInput } from '@/lib/validations';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterInput>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({});
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: '#EF4444' };
    if (score <= 3) return { score, label: 'Fair', color: '#F59E0B' };
    if (score <= 4) return { score, label: 'Good', color: '#32CD32' };
    return { score, label: 'Strong', color: '#10B981' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Validate
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof RegisterInput, string>> = {};
      result.error.issues.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof RegisterInput] = err.message;
        }
      });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    // Sign up
    const { error } = await signUp(formData.email, formData.password, formData.fullName);

    if (error) {
      toast.error(error.message || 'Failed to create account');
      setLoading(false);
      return;
    }

    toast.success('Account created! Please check your email to verify.');
    router.push('/verify-email');
  };

  return (
    <div
      className="p-8 rounded-lg border glass"
      style={{
        borderColor: 'var(--border)',
      }}
    >
      <h1
        className="text-2xl font-display text-center mb-6"
        style={{ color: 'var(--foreground)' }}
      >
        Create Account
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm mb-1"
            style={{ color: 'var(--foreground)', opacity: 0.8 }}
          >
            Full Name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-[var(--primary)]"
            style={{
              background: 'var(--background)',
              borderColor: errors.fullName ? '#EF4444' : 'var(--border)',
              color: 'var(--foreground)',
            }}
            placeholder="Your name"
          />
          {errors.fullName && (
            <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>
          )}
        </div>

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
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-[var(--primary)]"
            style={{
              background: 'var(--background)',
              borderColor: errors.email ? '#EF4444' : 'var(--border)',
              color: 'var(--foreground)',
            }}
            placeholder="you@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm mb-1"
            style={{ color: 'var(--foreground)', opacity: 0.8 }}
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-[var(--primary)]"
            style={{
              background: 'var(--background)',
              borderColor: errors.password ? '#EF4444' : 'var(--border)',
              color: 'var(--foreground)',
            }}
            placeholder="••••••••"
          />
          {formData.password && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded"
                    style={{
                      background: i <= passwordStrength.score ? passwordStrength.color : 'var(--border)',
                    }}
                  />
                ))}
              </div>
              <p className="text-xs" style={{ color: passwordStrength.color }}>
                {passwordStrength.label}
              </p>
            </div>
          )}
          {errors.password && (
            <p className="mt-1 text-sm text-red-500">{errors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm mb-1"
            style={{ color: 'var(--foreground)', opacity: 0.8 }}
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-[var(--primary)]"
            style={{
              background: 'var(--background)',
              borderColor: errors.confirmPassword ? '#EF4444' : 'var(--border)',
              color: 'var(--foreground)',
            }}
            placeholder="••••••••"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Terms */}
        <div className="flex items-start gap-2">
          <input
            id="agreeToTerms"
            name="agreeToTerms"
            type="checkbox"
            checked={formData.agreeToTerms}
            onChange={handleChange}
            className="mt-1"
          />
          <label
            htmlFor="agreeToTerms"
            className="text-sm"
            style={{ color: 'var(--foreground)', opacity: 0.8 }}
          >
            I agree to the{' '}
            <Link href="/terms" className="underline" style={{ color: 'var(--primary)' }}>
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline" style={{ color: 'var(--primary)' }}>
              Privacy Policy
            </Link>
          </label>
        </div>
        {errors.agreeToTerms && (
          <p className="text-sm text-red-500">{errors.agreeToTerms}</p>
        )}

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
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      {/* Login link */}
      <p className="mt-6 text-center text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
        Already have an account?{' '}
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




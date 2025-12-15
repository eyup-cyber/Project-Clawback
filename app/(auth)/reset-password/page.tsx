'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [formData, setFormData] = useState<ResetPasswordInput>({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<ResetPasswordInput>>({});
  const [loading, setLoading] = useState(false);
  const { updatePassword } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Validate
    const result = resetPasswordSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<ResetPasswordInput> = {};
      result.error.issues.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof ResetPasswordInput] = err.message;
        }
      });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    // Update password
    const { error } = await updatePassword(formData.password);

    if (error) {
      toast.error(error.message || 'Failed to reset password');
      setLoading(false);
      return;
    }

    toast.success('Password updated successfully!');
    router.push('/login');
  };

  return (
    <div
      className="p-8 rounded-lg border"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <h1
        className="text-2xl font-display text-center mb-2"
        style={{ color: 'var(--foreground)' }}
      >
        Reset Password
      </h1>
      <p
        className="text-center mb-6"
        style={{ color: 'var(--foreground)', opacity: 0.7 }}
      >
        Enter your new password below.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm mb-1"
            style={{ color: 'var(--foreground)', opacity: 0.8 }}
          >
            New Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border outline-none transition-all focus:ring-2"
            style={{
              background: 'var(--background)',
              borderColor: errors.password ? '#EF4444' : 'var(--border)',
              color: 'var(--foreground)',
            }}
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-500">{errors.password}</p>
          )}
        </div>

        {/* Requirements */}
        <div className="text-xs space-y-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
          <p>Password must:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Be at least 8 characters long</li>
            <li>Contain at least one uppercase letter</li>
            <li>Contain at least one lowercase letter</li>
            <li>Contain at least one number</li>
          </ul>
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm mb-1"
            style={{ color: 'var(--foreground)', opacity: 0.8 }}
          >
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border outline-none transition-all focus:ring-2"
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
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      {/* Back to login */}
      <p className="mt-6 text-center text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
        <Link
          href="/login"
          className="font-medium hover:underline"
          style={{ color: 'var(--primary)' }}
        >
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}




'use client';

import { cn } from '@/lib/utils';
import { Switch } from './primitives';

const Spinner = () => (
  <svg className="h-4 w-4 animate-spin text-(--foreground)" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

interface SwitchFieldProps {
  label?: string;
  description?: string;
  checked?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  onChange?: (checked: boolean) => void;
  className?: string;
}

export function SwitchField({
  label,
  description,
  checked = false,
  disabled,
  loading,
  error,
  onChange,
  className,
}: Readonly<SwitchFieldProps>) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-(--border) bg-(--surface) p-3 transition-colors',
        'hover:border-(--border-hover)',
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
    >
      <Switch
        checked={checked}
        onCheckedChange={(val) => onChange?.(Boolean(val))}
        disabled={disabled || loading}
      />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          {label && <div className="text-sm font-semibold text-(--foreground)">{label}</div>}
          {loading && <Spinner />}
        </div>
        {description && <p className="text-sm text-(--foreground)/70">{description}</p>}
        {error && (
          <p className="text-sm text-(--accent)" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

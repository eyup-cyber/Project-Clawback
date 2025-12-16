'use client';

import { cn } from '@/lib/utils';
import { Checkbox } from './primitives';

type CheckboxState = boolean | 'indeterminate';

interface CheckboxFieldProps {
  label?: string;
  description?: string;
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  error?: string;
  onChange?: (checked: CheckboxState) => void;
  className?: string;
}

export function CheckboxField({
  label,
  description,
  checked = false,
  indeterminate,
  disabled,
  error,
  onChange,
  className,
}: Readonly<CheckboxFieldProps>) {
  const state: CheckboxState = indeterminate ? 'indeterminate' : checked;

  return (
    <label
      className={cn(
        'flex items-start gap-3 rounded-xl border border-(--border) bg-(--surface) p-3 transition-colors',
        'hover:border-(--border-hover)',
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
    >
      <Checkbox
        checked={state}
        onCheckedChange={(val) => onChange?.(val as CheckboxState)}
        disabled={disabled}
      />
      <div className="flex-1 space-y-1">
        {label && <div className="text-sm font-semibold text-(--foreground)">{label}</div>}
        {description && <p className="text-sm text-(--foreground)/70">{description}</p>}
        {error && (
          <p className="text-sm text-(--accent)" role="alert">
            {error}
          </p>
        )}
      </div>
    </label>
  );
}


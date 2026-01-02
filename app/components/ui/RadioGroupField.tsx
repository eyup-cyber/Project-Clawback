'use client';

import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './primitives';

type Option = {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
};

interface RadioGroupFieldProps {
  label?: string;
  hint?: string;
  error?: string;
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function RadioGroupField({
  label,
  hint,
  error,
  options,
  value,
  onChange,
  disabled,
  className,
}: Readonly<RadioGroupFieldProps>) {
  return (
    <div
      className={cn('space-y-2 rounded-xl border border-(--border) bg-(--surface) p-3', className)}
    >
      {label && <div className="text-sm font-semibold text-(--foreground)">{label}</div>}

      <RadioGroup
        value={value}
        onValueChange={(val) => onChange?.(val)}
        className="space-y-2"
        disabled={disabled}
      >
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              'flex items-start gap-3 rounded-lg px-2 py-1.5 transition-colors',
              'hover:bg-(--surface-elevated)',
              opt.disabled && 'opacity-60 cursor-not-allowed'
            )}
          >
            <RadioGroupItem value={opt.value} disabled={opt.disabled || disabled} />
            <div className="space-y-0.5">
              <div className="text-sm text-(--foreground)">{opt.label}</div>
              {opt.description && (
                <p className="text-sm text-(--foreground)/70">{opt.description}</p>
              )}
            </div>
          </label>
        ))}
      </RadioGroup>

      {error && (
        <p className="text-sm text-(--accent)" role="alert">
          {error}
        </p>
      )}
      {!error && hint && <p className="text-sm text-(--foreground)/70">{hint}</p>}
    </div>
  );
}

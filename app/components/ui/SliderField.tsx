'use client';

import { cn } from '@/lib/utils';
import { Slider } from './primitives';

type SliderValue = number | [number, number];

interface SliderFieldProps {
  label?: string;
  description?: string;
  value?: SliderValue;
  onChange?: (value: SliderValue) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function SliderField({
  label,
  description,
  value = 0,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  error,
  className,
}: Readonly<SliderFieldProps>) {
  const isRange = Array.isArray(value);
  const current = isRange ? value : [value];

  const handleChange = (vals: number[]) => {
    if (isRange) {
      const [start = min, end = max] = vals;
      onChange?.([start, end]);
    } else {
      onChange?.(vals[0] ?? min);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <div className="text-sm font-semibold text-(--foreground)">{label}</div>}
      {description && <p className="text-sm text-(--foreground)/70">{description}</p>}

      <div className="flex items-center gap-4">
        <Slider
          value={current}
          min={min}
          max={max}
          step={step}
          onValueChange={handleChange}
          disabled={disabled}
          className={cn('flex-1', error && 'opacity-90')}
        />
        <div className="min-w-[64px] rounded-md border border-(--border) bg-(--surface) px-2 py-1 text-center text-sm">
          {isRange ? `${current[0]} – ${current[1]}` : current[0]}
        </div>
      </div>

      {error && (
        <p className="text-sm text-(--accent)" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

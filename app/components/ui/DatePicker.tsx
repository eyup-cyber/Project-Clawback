'use client';

import { cn } from '@/lib/utils';

type Mode = 'single' | 'range' | 'datetime' | 'time';

interface BaseProps {
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

interface SingleValueProps extends BaseProps {
  mode?: Extract<Mode, 'single' | 'datetime' | 'time'>;
  value?: string;
  onChange?: (value: string) => void;
}

interface RangeValueProps extends BaseProps {
  mode: 'range';
  value?: { start?: string; end?: string };
  onChange?: (value: { start?: string; end?: string }) => void;
}

type DatePickerProps = SingleValueProps | RangeValueProps;

export function DatePicker(props: Readonly<DatePickerProps>) {
  const { label, hint, error, disabled, className } = props;

  const renderField = () => {
    if (props.mode === 'range') {
      const { value = {}, onChange } = props;
      return (
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            type="date"
            value={value.start ?? ''}
            onChange={(e) => onChange?.({ ...value, start: e.target.value })}
            disabled={disabled}
            aria-label="Start date"
            className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm focus:border-(--primary) focus:outline-none"
          />
          <span className="text-sm text-(--foreground)/60 text-center">to</span>
          <input
            type="date"
            value={value.end ?? ''}
            onChange={(e) => onChange?.({ ...value, end: e.target.value })}
            disabled={disabled}
            aria-label="End date"
            className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm focus:border-(--primary) focus:outline-none"
          />
        </div>
      );
    }

    const singleProps = props as SingleValueProps;
    const { value, onChange } = singleProps;
    const mode = singleProps.mode ?? 'single';

    let inputType: 'date' | 'datetime-local' | 'time' = 'date';
    if (mode === 'datetime') inputType = 'datetime-local';
    else if (mode === 'time') inputType = 'time';

    return (
      <input
        type={inputType}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        aria-label={label ?? 'Select date'}
        className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm focus:border-(--primary) focus:outline-none"
      />
    );
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <div className="text-sm font-semibold text-(--foreground)">{label}</div>}
      {renderField()}
      {error && (
        <p className="text-sm text-(--accent)" role="alert">
          {error}
        </p>
      )}
      {!error && hint && <p className="text-sm text-(--foreground)/70">{hint}</p>}
    </div>
  );
}

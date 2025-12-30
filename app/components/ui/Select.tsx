'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './primitives';

type Option = { label: string; value: string; disabled?: boolean };

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

interface BaseProps {
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  loading?: boolean;
}

interface SingleSelectProps extends BaseProps {
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
}

export function SelectField({
  label,
  hint,
  error,
  placeholder = 'Select an option',
  options,
  value,
  onChange,
  disabled,
  className,
  searchable,
  loading,
}: Readonly<SingleSelectProps>) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      searchable
        ? options.filter((opt) => opt.label.toLowerCase().includes(query.toLowerCase()))
        : options,
    [options, query, searchable]
  );

  const triggerStyles = cn(
    'w-full justify-between',
    error && 'border-(--accent) focus-visible:ring-(--accent)',
    loading && 'cursor-wait',
    className
  );

  return (
    <div className="w-full space-y-2">
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-semibold text-(--foreground)">{label}</label>
          {loading && <Spinner />}
        </div>
      )}

      <Select value={value} onValueChange={(val) => onChange?.(val)} disabled={disabled || loading}>
        <SelectTrigger className={triggerStyles} aria-label={label || placeholder}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {searchable && (
            <div className="p-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm focus:border-(--primary) focus:outline-none"
              />
            </div>
          )}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-(--foreground)/60">No options</div>
          )}
          {filtered.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && (
        <p className="text-sm text-(--accent)" role="alert">
          {error}
        </p>
      )}
      {!error && hint && <p className="text-sm text-(--foreground)/70">{hint}</p>}
    </div>
  );
}

interface MultiSelectProps extends BaseProps {
  options: Option[];
  values?: string[];
  onChange?: (values: string[]) => void;
  maxHeight?: number;
}

export function MultiSelectField({
  label,
  hint,
  error,
  placeholder = 'Select options',
  options,
  values = [],
  onChange,
  disabled,
  className,
  searchable,
  loading,
  maxHeight = 240,
}: Readonly<MultiSelectProps>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      searchable
        ? options.filter((opt) => opt.label.toLowerCase().includes(query.toLowerCase()))
        : options,
    [options, query, searchable]
  );

  const toggleValue = (val: string) => {
    if (values.includes(val)) {
      onChange?.(values.filter((v) => v !== val));
    } else {
      onChange?.([...values, val]);
    }
  };

  return (
    <div className="w-full space-y-2">
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-semibold text-(--foreground)">{label}</label>
          {loading && <Spinner />}
        </div>
      )}

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          disabled={disabled || loading}
          aria-label={label || placeholder}
          className={cn(
            'w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-left text-sm',
            'flex items-center justify-between gap-2 transition-all hover:border-(--border-hover)',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary) focus-visible:ring-offset-2 focus-visible:ring-offset-(--background)',
            error && 'border-(--accent) focus-visible:ring-(--accent)',
            loading && 'cursor-wait',
            className
          )}
        >
          <span className="truncate">
            {values.length === 0 ? placeholder : `${values.length} selected`}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[260px] max-w-[85vw] space-y-1"
          style={{ maxHeight, overflowY: 'auto' }}
        >
          {searchable && (
            <div className="p-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm focus:border-(--primary) focus:outline-none"
              />
            </div>
          )}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-(--foreground)/60">No options</div>
          )}
          {filtered.map((opt) => {
            const checked = values.includes(opt.value);
            return (
              <DropdownMenuItem
                key={opt.value}
                disabled={opt.disabled}
                onSelect={(e) => {
                  e.preventDefault();
                  toggleValue(opt.value);
                }}
                className="flex items-center gap-2"
              >
                <Checkbox checked={checked} />
                <span className="truncate">{opt.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <p className="text-sm text-(--accent)" role="alert">
          {error}
        </p>
      )}
      {!error && hint && <p className="text-sm text-(--foreground)/70">{hint}</p>}
    </div>
  );
}

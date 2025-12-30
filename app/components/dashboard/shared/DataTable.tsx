'use client';

import { useState } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export default function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
  onRowClick,
  emptyMessage = 'No data available',
  loading = false,
}: DataTableProps<T>) {
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortBy) return 0;
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    const comparison = String(aVal) > String(bVal) ? 1 : -1;
    return sortDir === 'asc' ? comparison : -comparison;
  });

  if (loading) {
    return (
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="p-8 flex items-center justify-center">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{
              borderColor: 'var(--border)',
              borderTopColor: 'var(--primary)',
            }}
          />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="p-8 text-center">
          <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Desktop header */}
      <div
        className="hidden md:grid gap-4 p-4 text-sm font-medium"
        style={{
          gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
          background: 'var(--surface-elevated)',
          color: 'var(--foreground)',
          opacity: 0.7,
        }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className={`${col.sortable ? 'cursor-pointer hover:opacity-100' : ''} ${col.className || ''}`}
            onClick={() => col.sortable && handleSort(col.key)}
          >
            {col.header}
            {sortBy === col.key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {sortedData.map((item) => (
          <div
            key={String(item[keyField])}
            className={`p-4 transition-colors ${
              onRowClick ? 'cursor-pointer hover:bg-[var(--surface-elevated)]' : ''
            }`}
            onClick={() => onRowClick?.(item)}
          >
            {/* Desktop row */}
            <div
              className="hidden md:grid gap-4 items-center"
              style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
            >
              {columns.map((col) => (
                <div key={col.key} className={col.className || ''}>
                  {col.render ? col.render(item) : String(item[col.key] ?? '')}
                </div>
              ))}
            </div>

            {/* Mobile row */}
            <div className="md:hidden space-y-2">
              {columns.map((col) => (
                <div key={col.key} className="flex justify-between gap-2">
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--foreground)', opacity: 0.6 }}
                  >
                    {col.header}:
                  </span>
                  <span className={col.className || ''}>
                    {col.render ? col.render(item) : String(item[col.key] ?? '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

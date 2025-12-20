'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ExperimentVariant {
  id: string;
  key: string;
  name: string;
  description?: string;
  weight: number;
  control: boolean;
  config?: Record<string, unknown>;
}

interface Experiment {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ExperimentVariant[];
  sampleSize: number;
  startDate: string | null;
  endDate: string | null;
  winningVariant: string | null;
  createdAt: string;
  updatedAt: string;
  createdByProfile: { username: string; display_name: string } | null;
}

interface ExperimentResults {
  variants: Array<{
    key: string;
    name: string;
    participants: number;
    conversions: number;
    conversionRate: number;
    avgValue?: number;
  }>;
  winner?: string;
  confidence?: number;
}

interface CreateExperimentInput {
  key: string;
  name: string;
  description?: string;
  variants: Array<{
    key: string;
    name: string;
    weight: number;
    control: boolean;
  }>;
  sampleSize: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
  running: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  paused: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-400',
  },
  completed: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
};

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'draft' | 'running' | 'paused' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingResults, setViewingResults] = useState<string | null>(null);
  const [results, setResults] = useState<ExperimentResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [formData, setFormData] = useState<CreateExperimentInput>({
    key: '',
    name: '',
    description: '',
    variants: [
      { key: 'control', name: 'Control', weight: 50, control: true },
      { key: 'treatment', name: 'Treatment', weight: 50, control: false },
    ],
    sampleSize: 100,
  });

  const fetchExperiments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const response = await fetch(`/api/admin/experiments?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch experiments');
      }

      setExperiments(data.data.experiments);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experiments');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchExperiments();
  }, [fetchExperiments]);

  const filteredExperiments = experiments.filter((exp) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      exp.key.toLowerCase().includes(query) ||
      exp.name.toLowerCase().includes(query) ||
      exp.description?.toLowerCase().includes(query)
    );
  });

  const handleStatusChange = async (experiment: Experiment, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/experiments/${experiment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      setExperiments((prev) =>
        prev.map((e) =>
          e.id === experiment.id ? { ...e, status: newStatus as Experiment['status'] } : e
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleViewResults = async (experimentKey: string) => {
    setViewingResults(experimentKey);
    setLoadingResults(true);

    try {
      const response = await fetch(`/api/admin/experiments/${experimentKey}/results`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch results');
      }

      setResults(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoadingResults(false);
    }
  };

  const handleCreateExperiment = async () => {
    if (!formData.key || !formData.name) {
      setError('Key and name are required');
      return;
    }

    // Validate variant weights sum to 100
    const totalWeight = formData.variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight !== 100) {
      setError('Variant weights must sum to 100%');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/admin/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create experiment');
      }

      setShowCreateModal(false);
      resetForm();
      await fetchExperiments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create experiment');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExperiment = async (experiment: Experiment) => {
    if (
      !confirm(
        `Are you sure you want to delete the experiment "${experiment.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/experiments/${experiment.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete experiment');
      }

      setExperiments((prev) => prev.filter((e) => e.id !== experiment.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete experiment');
    }
  };

  const resetForm = () => {
    setFormData({
      key: '',
      name: '',
      description: '',
      variants: [
        { key: 'control', name: 'Control', weight: 50, control: true },
        { key: 'treatment', name: 'Treatment', weight: 50, control: false },
      ],
      sampleSize: 100,
    });
  };

  const handleKeyInput = (value: string) => {
    const formatted = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^[0-9]/, '');
    setFormData((prev) => ({ ...prev, key: formatted }));
  };

  const addVariant = () => {
    const newVariantNum = formData.variants.length;
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          key: `variant_${newVariantNum}`,
          name: `Variant ${newVariantNum}`,
          weight: 0,
          control: false,
        },
      ],
    }));
  };

  const removeVariant = (index: number) => {
    if (formData.variants.length <= 2) {
      setError('Experiment must have at least 2 variants');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const updateVariant = (index: number, updates: Partial<CreateExperimentInput['variants'][0]>) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, ...updates } : v)),
    }));
  };

  const distributeWeightsEvenly = () => {
    const evenWeight = Math.floor(100 / formData.variants.length);
    const remainder = 100 - evenWeight * formData.variants.length;
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => ({
        ...v,
        weight: evenWeight + (i === 0 ? remainder : 0),
      })),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{
              fontFamily: 'var(--font-kindergarten)',
              color: 'var(--accent)',
            }}
          >
            A/B Experiments
          </h1>
          <p
            style={{
              color: 'var(--foreground)',
              opacity: 0.7,
              fontFamily: 'var(--font-body)',
            }}
          >
            Manage experiments and analyze results
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
          style={{ background: 'var(--primary)', color: 'var(--background)' }}
        >
          + Create Experiment
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div
          className="p-4 rounded-lg border"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
          }}
        >
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-4 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div
        className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search experiments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border outline-none transition-all focus:ring-2"
            style={{
              background: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'draft', 'running', 'paused', 'completed'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === status ? 'ring-2 ring-[var(--primary)]' : ''
              }`}
              style={{
                background: filter === status ? 'var(--primary)' : 'var(--background)',
                color: filter === status ? 'var(--background)' : 'var(--foreground)',
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Experiments list */}
      {loading ? (
        <div className="text-center py-12">
          <div
            className="animate-spin w-8 h-8 border-4 rounded-full mx-auto"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
          />
          <p className="mt-4" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Loading experiments...
          </p>
        </div>
      ) : filteredExperiments.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-6xl mb-4">🧪</div>
          <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            {searchQuery ? 'No experiments match your search' : 'No experiments yet'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 rounded-lg"
              style={{ background: 'var(--primary)', color: 'var(--background)' }}
            >
              Create your first experiment
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExperiments.map((experiment) => (
            <div
              key={experiment.id}
              className="p-6 rounded-lg border transition-all hover:shadow-md"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                {/* Experiment info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3
                      className="text-lg font-bold truncate"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {experiment.name}
                    </h3>
                    <code
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        opacity: 0.7,
                      }}
                    >
                      {experiment.key}
                    </code>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[experiment.status].bg} ${STATUS_COLORS[experiment.status].text}`}
                    >
                      {experiment.status.charAt(0).toUpperCase() + experiment.status.slice(1)}
                    </span>
                  </div>

                  {experiment.description && (
                    <p
                      className="text-sm mb-3"
                      style={{ color: 'var(--foreground)', opacity: 0.6 }}
                    >
                      {experiment.description}
                    </p>
                  )}

                  {/* Variants */}
                  <div className="mb-3">
                    <p
                      className="text-sm font-medium mb-2"
                      style={{ color: 'var(--foreground)', opacity: 0.7 }}
                    >
                      Variants ({experiment.variants.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {experiment.variants.map((variant) => (
                        <div
                          key={variant.key}
                          className={`px-3 py-1 rounded text-sm ${
                            variant.control ? 'ring-2 ring-blue-500' : ''
                          }`}
                          style={{ background: 'var(--background)', color: 'var(--foreground)' }}
                        >
                          <span className="font-medium">{variant.name}</span>
                          <span className="ml-2" style={{ opacity: 0.6 }}>
                            {variant.weight}%
                          </span>
                          {variant.control && (
                            <span className="ml-1 text-xs text-blue-500">(control)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sample size */}
                  <div
                    className="text-sm mb-3"
                    style={{ color: 'var(--foreground)', opacity: 0.6 }}
                  >
                    Sample size: {experiment.sampleSize}% of traffic
                  </div>

                  {/* Winner badge */}
                  {experiment.winningVariant && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm">
                      🏆 Winner: {experiment.winningVariant}
                    </div>
                  )}

                  {/* Meta info */}
                  <div
                    className="flex flex-wrap gap-4 text-xs mt-3"
                    style={{ color: 'var(--foreground)', opacity: 0.5 }}
                  >
                    <span>Created {new Date(experiment.createdAt).toLocaleDateString()}</span>
                    {experiment.createdByProfile && (
                      <span>
                        by{' '}
                        {experiment.createdByProfile.display_name ||
                          experiment.createdByProfile.username}
                      </span>
                    )}
                    {experiment.startDate && (
                      <span>Started {new Date(experiment.startDate).toLocaleDateString()}</span>
                    )}
                    {experiment.endDate && (
                      <span>Ends {new Date(experiment.endDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-3 lg:items-end">
                  {/* Status actions */}
                  <div className="flex flex-wrap gap-2">
                    {experiment.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => void handleStatusChange(experiment, 'running')}
                        className="px-3 py-1 rounded text-sm font-medium transition-all"
                        style={{ background: 'var(--primary)', color: 'var(--background)' }}
                      >
                        ▶️ Start
                      </button>
                    )}
                    {experiment.status === 'running' && (
                      <button
                        type="button"
                        onClick={() => void handleStatusChange(experiment, 'paused')}
                        className="px-3 py-1 rounded text-sm font-medium transition-all"
                        style={{ background: 'var(--secondary)', color: 'var(--background)' }}
                      >
                        ⏸️ Pause
                      </button>
                    )}
                    {experiment.status === 'paused' && (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(experiment, 'running')}
                          className="px-3 py-1 rounded text-sm font-medium transition-all"
                          style={{ background: 'var(--primary)', color: 'var(--background)' }}
                        >
                          ▶️ Resume
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(experiment, 'completed')}
                          className="px-3 py-1 rounded text-sm font-medium transition-all"
                          style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
                        >
                          Complete
                        </button>
                      </>
                    )}
                  </div>

                  {/* View results */}
                  {(experiment.status === 'running' ||
                    experiment.status === 'paused' ||
                    experiment.status === 'completed') && (
                    <button
                      type="button"
                      onClick={() => void handleViewResults(experiment.key)}
                      className="px-3 py-1 rounded text-sm transition-all hover:opacity-80"
                      style={{ background: 'var(--accent)', color: 'var(--background)' }}
                    >
                      📊 View Results
                    </button>
                  )}

                  {/* Delete */}
                  {experiment.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteExperiment(experiment)}
                      className="px-3 py-1 rounded text-sm transition-all hover:opacity-80"
                      style={{ border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ef4444' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div
        className="p-4 rounded-lg border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>
          Related
        </h3>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/features"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            Feature Flags →
          </Link>
          <Link
            href="/admin/analytics"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            Analytics →
          </Link>
          <Link
            href="/admin"
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            Admin Dashboard →
          </Link>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-6"
            style={{ background: 'var(--surface)' }}
          >
            <h2
              className="text-2xl font-bold mb-6"
              style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}
            >
              Create Experiment
            </h2>

            <div className="space-y-4">
              {/* Key */}
              <div>
                <label
                  htmlFor="exp-key"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Key *
                </label>
                <input
                  id="exp-key"
                  type="text"
                  value={formData.key}
                  onChange={(e) => handleKeyInput(e.target.value)}
                  placeholder="my_experiment"
                  className="w-full px-4 py-2 rounded-lg border outline-none transition-all focus:ring-2"
                  style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              {/* Name */}
              <div>
                <label
                  htmlFor="exp-name"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Name *
                </label>
                <input
                  id="exp-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="My Experiment"
                  className="w-full px-4 py-2 rounded-lg border outline-none transition-all focus:ring-2"
                  style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="exp-desc"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  Description
                </label>
                <textarea
                  id="exp-desc"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Describe what this experiment tests..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border outline-none transition-all focus:ring-2 resize-none"
                  style={{
                    background: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              {/* Variants */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className="block text-sm font-medium"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Variants *
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={distributeWeightsEvenly}
                      className="text-xs px-2 py-1 rounded"
                      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
                    >
                      Distribute evenly
                    </button>
                    <button
                      type="button"
                      onClick={addVariant}
                      className="text-xs px-2 py-1 rounded"
                      style={{ background: 'var(--primary)', color: 'var(--background)' }}
                    >
                      + Add variant
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {formData.variants.map((variant, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border"
                      style={{
                        borderColor: variant.control ? 'var(--primary)' : 'var(--border)',
                        background: 'var(--background)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={variant.key}
                          onChange={(e) =>
                            updateVariant(index, {
                              key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                            })
                          }
                          placeholder="variant_key"
                          className="flex-1 px-2 py-1 rounded border text-sm"
                          style={{
                            background: 'var(--surface)',
                            borderColor: 'var(--border)',
                            color: 'var(--foreground)',
                          }}
                        />
                        <input
                          type="text"
                          value={variant.name}
                          onChange={(e) => updateVariant(index, { name: e.target.value })}
                          placeholder="Variant Name"
                          className="flex-1 px-2 py-1 rounded border text-sm"
                          style={{
                            background: 'var(--surface)',
                            borderColor: 'var(--border)',
                            color: 'var(--foreground)',
                          }}
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={variant.weight}
                            onChange={(e) =>
                              updateVariant(index, { weight: parseInt(e.target.value) || 0 })
                            }
                            min="0"
                            max="100"
                            className="w-16 px-2 py-1 rounded border text-sm text-center"
                            style={{
                              background: 'var(--surface)',
                              borderColor: 'var(--border)',
                              color: 'var(--foreground)',
                            }}
                          />
                          <span
                            className="text-sm"
                            style={{ color: 'var(--foreground)', opacity: 0.5 }}
                          >
                            %
                          </span>
                        </div>
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="control"
                            checked={variant.control}
                            onChange={() => {
                              setFormData((prev) => ({
                                ...prev,
                                variants: prev.variants.map((v, i) => ({
                                  ...v,
                                  control: i === index,
                                })),
                              }));
                            }}
                          />
                          <span style={{ color: 'var(--foreground)' }}>Control</span>
                        </label>
                        {formData.variants.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                            style={{ color: '#ef4444' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Weight sum indicator */}
                <div className="mt-2 text-sm">
                  <span style={{ color: 'var(--foreground)', opacity: 0.6 }}>Total weight: </span>
                  <span
                    style={{
                      color:
                        formData.variants.reduce((sum, v) => sum + v.weight, 0) === 100
                          ? '#22c55e'
                          : '#ef4444',
                    }}
                  >
                    {formData.variants.reduce((sum, v) => sum + v.weight, 0)}%
                  </span>
                  {formData.variants.reduce((sum, v) => sum + v.weight, 0) !== 100 && (
                    <span style={{ color: '#ef4444', marginLeft: '8px' }}>(must equal 100%)</span>
                  )}
                </div>
              </div>

              {/* Sample size */}
              <div>
                <label className="flex items-center justify-between text-sm font-medium mb-2">
                  <span style={{ color: 'var(--foreground)' }}>Sample Size</span>
                  <span style={{ color: 'var(--primary)' }}>{formData.sampleSize}% of traffic</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={formData.sampleSize}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, sampleSize: parseInt(e.target.value) }))
                  }
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ background: 'var(--border)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                  Lower sample sizes are useful for high-traffic experiments
                </p>
              </div>
            </div>

            {/* Modal actions */}
            <div
              className="flex justify-end gap-3 mt-6 pt-4 border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateExperiment()}
                disabled={
                  saving ||
                  !formData.key ||
                  !formData.name ||
                  formData.variants.reduce((sum, v) => sum + v.weight, 0) !== 100
                }
                className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}
              >
                {saving ? 'Creating...' : 'Create Experiment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {viewingResults && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-6"
            style={{ background: 'var(--surface)' }}
          >
            <h2
              className="text-2xl font-bold mb-6"
              style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}
            >
              Experiment Results
            </h2>

            {loadingResults ? (
              <div className="text-center py-8">
                <div
                  className="animate-spin w-8 h-8 border-4 rounded-full mx-auto"
                  style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
                />
                <p className="mt-4" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                  Loading results...
                </p>
              </div>
            ) : results ? (
              <div className="space-y-6">
                {/* Winner announcement */}
                {results.winner && (
                  <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/30 text-center">
                    <p className="text-lg font-bold text-green-700 dark:text-green-400">
                      🏆 Winner: {results.winner}
                    </p>
                    {results.confidence && (
                      <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                        Statistical confidence: {results.confidence.toFixed(1)}%
                      </p>
                    )}
                  </div>
                )}

                {/* Variant results */}
                <div className="space-y-4">
                  {results.variants.map((variant) => (
                    <div
                      key={variant.key}
                      className={`p-4 rounded-lg border ${
                        results.winner === variant.key ? 'ring-2 ring-green-500' : ''
                      }`}
                      style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium" style={{ color: 'var(--foreground)' }}>
                          {variant.name}
                          {results.winner === variant.key && (
                            <span className="ml-2 text-green-500">🏆</span>
                          )}
                        </h4>
                        <span className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                          {variant.conversionRate.toFixed(2)}%
                        </span>
                      </div>

                      {/* Conversion bar */}
                      <div
                        className="h-3 rounded-full overflow-hidden"
                        style={{ background: 'var(--border)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${variant.conversionRate}%`,
                            background:
                              results.winner === variant.key ? '#22c55e' : 'var(--primary)',
                          }}
                        />
                      </div>

                      {/* Stats */}
                      <div
                        className="flex justify-between mt-3 text-sm"
                        style={{ color: 'var(--foreground)', opacity: 0.6 }}
                      >
                        <span>{variant.participants.toLocaleString()} participants</span>
                        <span>{variant.conversions.toLocaleString()} conversions</span>
                        {variant.avgValue !== undefined && (
                          <span>Avg value: ${variant.avgValue.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Disclaimer */}
                {!results.winner && (
                  <p
                    className="text-sm text-center"
                    style={{ color: 'var(--foreground)', opacity: 0.5 }}
                  >
                    No statistically significant winner yet. Continue running the experiment.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-center py-8" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                No results available
              </p>
            )}

            <div
              className="flex justify-end mt-6 pt-4 border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                type="button"
                onClick={() => {
                  setViewingResults(null);
                  setResults(null);
                }}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

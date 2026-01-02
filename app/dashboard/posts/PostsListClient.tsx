/**
 * Posts List Client Component
 * Phase 1.2.2: Posts list with filters, bulk actions, and status management
 */

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import { formatRelativeTime, getContentTypeIcon, getContentTypeLabel } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

type PostStatus = 'draft' | 'pending_review' | 'published' | 'scheduled' | 'archived' | 'rejected';
type ContentType = 'written' | 'video' | 'audio' | 'visual';
type SortField = 'created_at' | 'updated_at' | 'title' | 'views';
type SortOrder = 'asc' | 'desc';

interface Post {
  id: string;
  title: string;
  slug: string;
  status: PostStatus;
  content_type: ContentType;
  view_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  scheduled_for: string | null;
}

interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// ============================================================================
// ICONS
// ============================================================================

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ArchiveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

const DuplicateIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

// ChevronDownIcon removed - unused

// ============================================================================
// CONSTANTS
// ============================================================================

const statusColors: Record<PostStatus, { bg: string; text: string; label: string }> = {
  draft: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-600 dark:text-gray-300',
    label: 'Draft',
  },
  pending_review: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    label: 'Pending Review',
  },
  published: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    label: 'Published',
  },
  scheduled: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'Scheduled',
  },
  archived: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-500 dark:text-gray-400',
    label: 'Archived',
  },
  rejected: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    label: 'Rejected',
  },
};

const statusOptions: { value: PostStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'archived', label: 'Archived' },
];

const typeOptions: { value: ContentType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'written', label: 'Written' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'visual', label: 'Visual' },
];

const sortOptions: { value: `${SortField}:${SortOrder}`; label: string }[] = [
  { value: 'updated_at:desc', label: 'Recently Updated' },
  { value: 'created_at:desc', label: 'Newest First' },
  { value: 'created_at:asc', label: 'Oldest First' },
  { value: 'title:asc', label: 'Title A-Z' },
  { value: 'title:desc', label: 'Title Z-A' },
  { value: 'views:desc', label: 'Most Views' },
];

// ============================================================================
// FETCHER
// ============================================================================

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

// ============================================================================
// COMPONENTS
// ============================================================================

interface PostRowProps {
  post: Post;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onAction: (action: string, postId: string) => void;
}

function PostRow({ post, selected, onSelect, onAction }: PostRowProps) {
  const [showActions, setShowActions] = useState(false);
  const status = statusColors[post.status] || statusColors.draft;

  return (
    <div
      className={`flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
        selected ? 'bg-blue-50 dark:bg-blue-900/10' : ''
      }`}
    >
      {/* Checkbox */}
      <div className="pr-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
      </div>

      {/* Type icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 mr-4"
        style={{ background: 'var(--background)' }}
      >
        {getContentTypeIcon(post.content_type)}
      </div>

      {/* Title and meta */}
      <div className="flex-1 min-w-0 pr-4">
        <Link
          href={`/dashboard/posts/${post.id}/edit`}
          className="font-medium truncate block hover:text-[var(--primary)] transition-colors"
          style={{ color: 'var(--foreground)' }}
        >
          {post.title || 'Untitled'}
        </Link>
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-1"
          style={{ color: 'var(--foreground)', opacity: 0.5 }}
        >
          <span>{getContentTypeLabel(post.content_type)}</span>
          <span>•</span>
          <span>Updated {formatRelativeTime(post.updated_at)}</span>
          {post.view_count > 0 && (
            <>
              <span>•</span>
              <span>{post.view_count.toLocaleString()} views</span>
            </>
          )}
          {post.scheduled_for && post.status === 'scheduled' && (
            <>
              <span>•</span>
              <span>Scheduled for {new Date(post.scheduled_for).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text} flex-shrink-0 mr-4`}
      >
        {status.label}
      </span>

      {/* Actions */}
      <div className="relative flex items-center gap-1">
        <Link
          href={`/dashboard/posts/${post.id}/edit`}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Edit"
        >
          ✏️
        </Link>
        {post.status === 'published' && (
          <Link
            href={`/articles/${post.slug}`}
            target="_blank"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="View"
          >
            👁️
          </Link>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowActions(!showActions)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="More options"
          >
            ⋮
          </button>
          {showActions && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default bg-transparent border-0"
                onClick={() => setShowActions(false)}
                aria-label="Close menu"
              />
              <div
                className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg border z-20 py-1"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onAction('duplicate', post.id);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                  style={{ color: 'var(--foreground)' }}
                >
                  <DuplicateIcon />
                  Duplicate
                </button>
                {post.status !== 'archived' && (
                  <button
                    type="button"
                    onClick={() => {
                      onAction('archive', post.id);
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    style={{ color: 'var(--foreground)' }}
                  >
                    <ArchiveIcon />
                    Archive
                  </button>
                )}
                {post.status === 'archived' && (
                  <button
                    type="button"
                    onClick={() => {
                      onAction('unarchive', post.id);
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    style={{ color: 'var(--foreground)' }}
                  >
                    <ArchiveIcon />
                    Restore
                  </button>
                )}
                <hr className="my-1" style={{ borderColor: 'var(--border)' }} />
                <button
                  type="button"
                  onClick={() => {
                    onAction('delete', post.id);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <TrashIcon />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PostsListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters from URL
  const initialStatus = (searchParams.get('status') as PostStatus) || '';
  const initialType = (searchParams.get('type') as ContentType) || '';
  const initialSort = searchParams.get('sort') || 'updated_at:desc';
  const initialSearch = searchParams.get('q') || '';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [status, setStatus] = useState<PostStatus | ''>(initialStatus);
  const [contentType, setContentType] = useState<ContentType | ''>(initialType);
  const [sort, setSort] = useState(initialSort);
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Build query string
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (status) params.set('status', status);
    if (contentType) params.set('type', contentType);
    if (sort) params.set('sort', sort);
    if (search) params.set('q', search);
    return params.toString();
  }, [status, contentType, sort, search, page]);

  // Fetch posts
  const { data, isLoading, mutate } = useSWR<PostsResponse>(
    `/api/dashboard/posts?${queryString}`,
    fetcher
  );

  // Update URL on filter change
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (contentType) params.set('type', contentType);
    if (sort !== 'updated_at:desc') params.set('sort', sort);
    if (search) params.set('q', search);
    if (page > 1) params.set('page', String(page));
    const newUrl = params.toString() ? `/dashboard/posts?${params.toString()}` : '/dashboard/posts';
    router.replace(newUrl, { scroll: false });
  }, [status, contentType, sort, search, page, router]);

  // Handle filter changes
  const handleStatusChange = (newStatus: PostStatus | '') => {
    setStatus(newStatus);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleTypeChange = (newType: ContentType | '') => {
    setContentType(newType);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    setPage(1);
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPage(1);
    setSelectedIds(new Set());
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.posts) {
      setSelectedIds(new Set(data.posts.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectPost = (postId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(postId);
    } else {
      newSelected.delete(postId);
    }
    setSelectedIds(newSelected);
  };

  // Post actions
  const handleAction = useCallback(
    async (action: string, postId: string) => {
      try {
        switch (action) {
          case 'duplicate': {
            const dupRes = await fetch(`/api/posts/${postId}/duplicate`, {
              method: 'POST',
            });
            if (!dupRes.ok) throw new Error('Failed to duplicate');
            toast.success('Post duplicated');
            await mutate();
            break;
          }

          case 'archive': {
            const archiveRes = await fetch(`/api/posts/${postId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'archived' }),
            });
            if (!archiveRes.ok) throw new Error('Failed to archive');
            toast.success('Post archived');
            await mutate();
            break;
          }

          case 'unarchive': {
            const unarchiveRes = await fetch(`/api/posts/${postId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'draft' }),
            });
            if (!unarchiveRes.ok) throw new Error('Failed to restore');
            toast.success('Post restored');
            await mutate();
            break;
          }

          case 'delete': {
            if (!confirm('Are you sure you want to delete this post? This cannot be undone.'))
              return;
            const deleteRes = await fetch(`/api/posts/${postId}`, {
              method: 'DELETE',
            });
            if (!deleteRes.ok) throw new Error('Failed to delete');
            toast.success('Post deleted');
            await mutate();
            break;
          }
        }
      } catch {
        toast.error(`Failed to ${action} post`);
      }
    },
    [mutate]
  );

  // Bulk actions
  const handleBulkAction = useCallback(
    async (action: string) => {
      if (selectedIds.size === 0) return;

      const ids = Array.from(selectedIds);
      try {
        switch (action) {
          case 'archive':
            await Promise.all(
              ids.map((id) =>
                fetch(`/api/posts/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'archived' }),
                })
              )
            );
            toast.success(`${ids.length} posts archived`);
            break;

          case 'delete':
            if (
              !confirm(
                `Are you sure you want to delete ${ids.length} posts? This cannot be undone.`
              )
            )
              return;
            await Promise.all(ids.map((id) => fetch(`/api/posts/${id}`, { method: 'DELETE' })));
            toast.success(`${ids.length} posts deleted`);
            break;
        }
        setSelectedIds(new Set());
        await mutate();
      } catch {
        toast.error(`Failed to ${action} posts`);
      }
    },
    [selectedIds, mutate]
  );

  const posts = data?.posts || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;
  const allSelected = posts.length > 0 && selectedIds.size === posts.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold"
            style={{
              fontFamily: 'var(--font-kindergarten)',
              color: 'var(--primary)',
            }}
          >
            My Posts
          </h1>
          <p style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            {total} {total === 1 ? 'post' : 'posts'} total
          </p>
        </div>
        <Link
          href="/dashboard/posts/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium"
          style={{ background: 'var(--primary)', color: 'var(--background)' }}
        >
          <PlusIcon />
          New Post
        </Link>
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as PostStatus | '')}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{
            background: 'var(--background)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={contentType}
          onChange={(e) => handleTypeChange(e.target.value as ContentType | '')}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{
            background: 'var(--background)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
        >
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{
            background: 'var(--background)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="flex-1 min-w-[200px] relative">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search posts..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onBlur={updateUrl}
            className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
            style={{
              background: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50">
            <SearchIcon />
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div
          className="flex items-center gap-4 p-3 rounded-lg border"
          style={{ background: 'var(--primary)', borderColor: 'transparent' }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--background)' }}>
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void handleBulkAction('archive');
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium
                         bg-white/20 hover:bg-white/30 transition-colors"
              style={{ color: 'var(--background)' }}
            >
              <ArchiveIcon />
              Archive
            </button>
            <button
              type="button"
              onClick={() => {
                void handleBulkAction('delete');
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium
                         bg-red-500 hover:bg-red-600 transition-colors text-white"
            >
              <TrashIcon />
              Delete
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-sm underline"
            style={{ color: 'var(--background)' }}
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Posts List */}
      {isLoading ? (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center p-4 border-b animate-pulse"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded mr-4" />
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg mr-4" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {/* Header row */}
          <div
            className="flex items-center p-4 border-b font-medium text-sm"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
              opacity: 0.7,
            }}
          >
            <div className="pr-4">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </div>
            <span className="flex-1">Post</span>
            <span className="w-28 text-center">Status</span>
            <span className="w-24 text-center">Actions</span>
          </div>

          {/* Post rows */}
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {posts.map((post) => (
              <PostRow
                key={post.id}
                post={post}
                selected={selectedIds.has(post.id)}
                onSelect={(checked) => handleSelectPost(post.id, checked)}
                onAction={handleAction}
              />
            ))}
          </div>
        </div>
      ) : (
        <div
          className="p-12 rounded-xl border text-center"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <span className="text-6xl block mb-4">📝</span>
          <h2
            className="text-xl font-bold mb-2"
            style={{
              fontFamily: 'var(--font-kindergarten)',
              color: 'var(--foreground)',
            }}
          >
            {search || status || contentType ? 'No posts found' : 'No posts yet'}
          </h2>
          <p className="mb-6" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            {search || status || contentType
              ? 'Try adjusting your filters or search query.'
              : 'Create your first post and share your voice with the world.'}
          </p>
          {!search && !status && !contentType && (
            <Link
              href="/dashboard/posts/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium"
              style={{
                background: 'var(--primary)',
                color: 'var(--background)',
              }}
            >
              <PlusIcon />
              Create Your First Post
            </Link>
          )}
        </div>
      )}

      {/* Pagination */}
      {(data?.totalPages || 0) > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Page {page} of {data?.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-50"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={!hasMore}
              className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-50"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

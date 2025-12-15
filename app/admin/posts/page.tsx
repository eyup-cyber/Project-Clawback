import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatRelativeTime, getContentTypeIcon, getContentTypeLabel } from '@/lib/utils';
import PostModerationActions from './PostModerationActions';
import type { PostStatus, ContentType } from '@/types/database';

interface PostAuthor {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

interface AdminPost {
  id: string;
  title: string;
  slug: string;
  content_type: 'written' | 'video' | 'audio' | 'visual';
  status: string;
  created_at: string;
  reaction_count: number;
  view_count: number;
  author: PostAuthor | null;
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  let query = supabase
    .from('posts')
    .select(`
      *,
      author:profiles(id, display_name, username, avatar_url)
    `)
    .order('created_at', { ascending: false });

  if (params.status) {
    query = query.eq('status', params.status as PostStatus);
  }

  if (params.type) {
    query = query.eq('content_type', params.type as ContentType);
  }

  const { data: posts } = await query;

  const statusColors: Record<string, { bg: string; text: string }> = {
    draft: { bg: 'var(--border)', text: 'var(--foreground)' },
    pending: { bg: 'var(--secondary)', text: 'var(--background)' },
    pending_review: { bg: 'var(--secondary)', text: 'var(--background)' },
    published: { bg: 'var(--primary)', text: 'var(--background)' },
    archived: { bg: 'var(--accent)', text: 'var(--background)' },
  };

  return (
    <div>
      <div className="mb-8">
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--accent)' }}
        >
          All Posts
        </h1>
        <p style={{ color: 'var(--foreground)', opacity: 0.7, fontFamily: 'var(--font-body)' }}>
          Review, moderate, and manage all platform content.
        </p>
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap gap-4 p-4 rounded-lg mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <select
          defaultValue={params.status || ''}
          className="px-4 py-2 rounded-lg border"
          style={{
            background: 'var(--background)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending Review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select
          defaultValue={params.type || ''}
          className="px-4 py-2 rounded-lg border"
          style={{
            background: 'var(--background)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
        >
          <option value="">All Types</option>
          <option value="written">Written</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="visual">Visual</option>
        </select>
        <input
          type="search"
          placeholder="Search posts..."
          className="flex-1 px-4 py-2 rounded-lg border"
          style={{
            background: 'var(--background)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
        />
      </div>

      {/* Posts list */}
      {posts && posts.length > 0 ? (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {(posts as AdminPost[]).map((post) => (
              <div
                key={post.id}
                className="p-4 hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Type icon */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: 'var(--background)' }}
                    >
                      {getContentTypeIcon(post.content_type)}
                    </div>

                    {/* Title and meta */}
                    <div className="min-w-0 flex-1">
                      <h3
                        className="font-medium truncate"
                        style={{ color: 'var(--foreground)', fontFamily: 'var(--font-body)' }}
                      >
                        {post.title || 'Untitled'}
                      </h3>
                      <div
                        className="flex items-center gap-3 text-xs mt-1"
                        style={{ color: 'var(--foreground)', opacity: 0.5 }}
                      >
                        <span>by {post.author?.display_name || post.author?.username || 'Unknown'}</span>
                        <span>•</span>
                        <span>{getContentTypeLabel(post.content_type)}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(post.created_at)}</span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium capitalize flex-shrink-0"
                      style={{
                        background: statusColors[post.status]?.bg || 'var(--border)',
                        color: statusColors[post.status]?.text || 'var(--foreground)',
                      }}
                    >
                      {post.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Actions for pending posts */}
                {(post.status === 'pending' || post.status === 'pending_review') && (
                  <PostModerationActions postId={post.id} postTitle={post.title} />
                )}

                {/* Quick actions for other posts */}
                {post.status !== 'pending' && post.status !== 'pending_review' && (
                  <div className="mt-3 flex gap-2">
                    {post.status === 'published' && (
                      <Link
                        href={`/articles/${post.slug}`}
                        target="_blank"
                        className="text-sm px-3 py-1 rounded hover:bg-[var(--background)]"
                        style={{ color: 'var(--primary)' }}
                      >
                        View →
                      </Link>
                    )}
                    {post.status !== 'archived' && (
                      <button
                        className="text-sm px-3 py-1 rounded hover:bg-[var(--background)]"
                        style={{ color: 'var(--accent)' }}
                      >
                        Archive
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="p-12 rounded-lg border text-center"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <span className="text-6xl block mb-4">📝</span>
          <h2
            className="text-xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}
          >
            No posts found
          </h2>
          <p style={{ color: 'var(--foreground)', opacity: 0.6, fontFamily: 'var(--font-body)' }}>
            {params.status
              ? `No posts with status "${params.status.replace('_', ' ')}"`
              : 'No posts have been created yet.'}
          </p>
        </div>
      )}
    </div>
  );
}

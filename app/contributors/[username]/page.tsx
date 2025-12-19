import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Nav from '../../components/Nav';
import Footer from '../../components/layout/Footer';
import { getInitials, formatRelativeTime, getContentTypeIcon } from '@/lib/utils';

interface ContributorPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content_type: 'written' | 'video' | 'audio' | 'visual';
  featured_image_url: string | null;
  published_at: string | null;
  reading_time: number | null;
  reaction_count: number;
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: contributor } = await supabase
    .from('profiles')
    .select('display_name, bio')
    .eq('username', username)
    .single();

  if (!contributor) return {};

  return {
    title: contributor.display_name,
    description:
      contributor.bio || `Articles by ${contributor.display_name} on Scroungers Multimedia`,
  };
}

export default async function ContributorProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: contributor } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (!contributor) {
    notFound();
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('author_id', contributor.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  return (
    <>
      <Nav />
      <section className="min-h-screen py-24 px-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-4xl mx-auto">
          {/* Profile header */}
          <div className="text-center mb-12">
            {/* Avatar */}
            <div
              className="w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl font-bold overflow-hidden"
              style={{
                background: 'var(--primary)',
                color: 'var(--background)',
                border: '4px solid var(--secondary)',
              }}
            >
              {contributor.avatar_url ? (
                 
                <img
                  src={contributor.avatar_url}
                  alt={contributor.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(contributor.display_name || 'U')
              )}
            </div>

            {/* Name and username */}
            <h1
              className="text-4xl font-bold mb-2"
              style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--primary)' }}
            >
              {contributor.display_name}
            </h1>
            <p className="text-lg mb-4" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              @{contributor.username}
            </p>

            {/* Bio */}
            {contributor.bio && (
              <p
                className="text-lg max-w-2xl mx-auto mb-6"
                style={{ color: 'var(--foreground)', fontFamily: 'var(--font-body)' }}
              >
                {contributor.bio}
              </p>
            )}

            {/* Stats */}
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: 'var(--primary)' }}>
                  {contributor.article_count || 0}
                </p>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                  Posts
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: 'var(--secondary)' }}>
                  {contributor.total_views || 0}
                </p>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                  Views
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
                  {contributor.total_reactions || 0}
                </p>
                <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                  Stars
                </p>
              </div>
            </div>

            {/* Links */}
            <div className="flex justify-center gap-4 flex-wrap">
              {contributor.kofi_username && (
                <a
                  href={`https://ko-fi.com/${contributor.kofi_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium"
                  style={{ background: 'var(--secondary)', color: 'var(--background)' }}
                >
                  ☕ Support on Ko-fi
                </a>
              )}
              {contributor.twitter_handle && (
                <a
                  href={`https://twitter.com/${contributor.twitter_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                >
                  🐦 @{contributor.twitter_handle}
                </a>
              )}
              {contributor.website_url && (
                <a
                  href={contributor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                >
                  🌐 Website
                </a>
              )}
            </div>
          </div>

          {/* Posts */}
          <div>
            <h2
              className="text-2xl font-bold mb-6"
              style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--secondary)' }}
            >
              Posts by {contributor.display_name}
            </h2>

            {posts && posts.length > 0 ? (
              <div className="space-y-6">
                {posts.map((post: ContributorPost) => (
                  <Link
                    key={post.id}
                    href={`/articles/${post.slug}`}
                    className="block p-6 rounded-lg border transition-all hover:border-[var(--primary)] hover:shadow-lg group"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex gap-4">
                      {/* Type icon */}
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: 'var(--background)' }}
                      >
                        {getContentTypeIcon(post.content_type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-xl font-bold group-hover:text-[var(--primary)] transition-colors"
                          style={{
                            fontFamily: 'var(--font-kindergarten)',
                            color: 'var(--foreground)',
                          }}
                        >
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p
                            className="mt-2 line-clamp-2"
                            style={{
                              color: 'var(--foreground)',
                              opacity: 0.7,
                              fontFamily: 'var(--font-body)',
                            }}
                          >
                            {post.excerpt}
                          </p>
                        )}
                        <div
                          className="flex items-center gap-4 mt-3 text-sm"
                          style={{ color: 'var(--foreground)', opacity: 0.5 }}
                        >
                          <span>
                            {post.published_at ? formatRelativeTime(post.published_at) : 'Recently'}
                          </span>
                          <span>•</span>
                          <span>{post.reading_time || 5} min read</span>
                          <span>•</span>
                          <span>⭐ {post.reaction_count || 0}</span>
                        </div>
                      </div>

                      {/* Featured image */}
                      {post.featured_image_url && (
                        <div className="hidden md:block w-32 h-24 rounded-lg overflow-hidden flex-shrink-0">
                          { }
                          <img
                            src={post.featured_image_url}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div
                className="p-12 rounded-lg border text-center"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                  No published posts yet. Check back soon!
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Nav from '../../components/Nav';
import Footer from '../../components/layout/Footer';
import { formatRelativeTime, getContentTypeIcon } from '@/lib/utils';

interface PostTag {
  post_id: string;
}

interface TagPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content_type: 'written' | 'video' | 'audio' | 'visual';
  featured_image_url: string | null;
  reading_time: number | null;
  published_at: string | null;
  author: { display_name: string; username: string; avatar_url: string | null } | null;
  category: { name: string; slug: string } | null;
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const tagName = tag.replace(/-/g, ' ');
  return {
    title: `#${tagName} | Tags`,
    description: `Browse all posts tagged with #${tagName} on Scroungers Multimedia.`,
  };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: tagSlug } = await params;
  const supabase = await createClient();

  // Get tag
  const { data: tag } = await supabase.from('tags').select('*').eq('slug', tagSlug).single();

  if (!tag) {
    notFound();
  }

  // Get posts with this tag
  const { data: postTags } = await supabase
    .from('post_tags')
    .select('post_id')
    .eq('tag_id', tag.id);

  const postIds = postTags?.map((pt: PostTag) => pt.post_id) || [];

  const { data: posts } =
    postIds.length > 0
      ? await supabase
          .from('posts')
          .select(
            '*, author:profiles(display_name, username, avatar_url), category:categories(name, slug)'
          )
          .in('id', postIds)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
      : { data: [] };

  return (
    <>
      <Nav />
      <section className="min-h-screen py-24 px-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-6xl mx-auto">
          {/* Tag header */}
          <div className="text-center mb-12">
            <div
              className="inline-block px-6 py-3 rounded-full text-2xl mb-4"
              style={{ background: 'var(--primary)', color: 'var(--background)' }}
            >
              #{tag.name}
            </div>
            <h1
              className="text-4xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}
            >
              Posts tagged with #{tag.name}
            </h1>
            <p style={{ color: 'var(--secondary)' }}>
              {tag.post_count || posts?.length || 0} posts
            </p>
          </div>

          {/* Posts list */}
          {posts && posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post: TagPost) => (
                <Link
                  key={post.id}
                  href={`/articles/${post.slug}`}
                  className="block p-6 rounded-lg border transition-all hover:border-[var(--primary)] hover:shadow-lg group"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div className="flex gap-6">
                    {/* Featured image */}
                    {post.featured_image_url && (
                      <div className="hidden md:block w-48 h-32 rounded-lg overflow-hidden flex-shrink-0">
                        { }
                        <img
                          src={post.featured_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className="text-sm px-2 py-1 rounded"
                          style={{ background: 'var(--background)', color: 'var(--foreground)' }}
                        >
                          {getContentTypeIcon(post.content_type)} {post.content_type}
                        </span>
                        {post.category && (
                          <span
                            className="text-sm px-2 py-1 rounded"
                            style={{ background: 'var(--secondary)', color: 'var(--background)' }}
                          >
                            {post.category.name}
                          </span>
                        )}
                      </div>

                      <h2
                        className="text-2xl font-bold mb-2 group-hover:text-[var(--primary)] transition-colors"
                        style={{
                          fontFamily: 'var(--font-kindergarten)',
                          color: 'var(--foreground)',
                        }}
                      >
                        {post.title}
                      </h2>

                      {post.excerpt && (
                        <p
                          className="line-clamp-2 mb-4"
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
                        className="flex items-center gap-4 text-sm"
                        style={{ color: 'var(--foreground)', opacity: 0.5 }}
                      >
                        <span>{post.author?.display_name || 'Anonymous'}</span>
                        <span>•</span>
                        <span>{post.reading_time || 5} min read</span>
                        <span>•</span>
                        <span>
                          {post.published_at ? formatRelativeTime(post.published_at) : 'Recently'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div
              className="p-12 rounded-lg border text-center"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <span className="text-6xl block mb-4">🏷️</span>
              <h2
                className="text-xl font-bold mb-2"
                style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}
              >
                No posts with this tag yet
              </h2>
              <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                Check back later or explore other content.
              </p>
            </div>
          )}

          {/* Browse more */}
          <div className="mt-16 text-center">
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border transition-colors hover:bg-[var(--surface)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              ← Browse All Articles
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

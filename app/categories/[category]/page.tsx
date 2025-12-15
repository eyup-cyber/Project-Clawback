import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Nav from '../../components/Nav';
import Footer from '../../components/layout/Footer';
import { formatRelativeTime, getContentTypeIcon } from '@/lib/utils';

interface CategoryPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content_type: 'written' | 'video' | 'audio' | 'visual';
  featured_image_url: string | null;
  reading_time: number | null;
  published_at: string | null;
  author: { display_name: string } | null;
}

export async function generateMetadata({ params }: { params: { category: string } }) {
  const categoryName = params.category.replace(/-/g, ' ');
  return {
    title: `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} | Categories`,
    description: `Browse all posts in the ${categoryName} category on Scroungers Multimedia.`,
  };
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const supabase = await createClient();

  // Get category
  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', params.category)
    .single();

  if (!category) {
    notFound();
  }

  // Get posts in category
  const { data: posts } = await supabase
    .from('posts')
    .select('*, author:profiles(display_name, username, avatar_url)')
    .eq('category_id', category.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  return (
    <>
      <Nav />
      <section className="min-h-screen py-24 px-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-6xl mx-auto">
          {/* Category header */}
          <div className="text-center mb-12">
            <span className="text-6xl mb-4 block">
              {getCategoryIcon(category.slug)}
            </span>
            <h1
              className="text-5xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--primary)' }}
            >
              {category.name}
            </h1>
            {category.description && (
              <p
                className="text-lg max-w-2xl mx-auto"
                style={{ color: 'var(--foreground)', opacity: 0.7, fontFamily: 'var(--font-body)' }}
              >
                {category.description}
              </p>
            )}
            <p className="mt-4" style={{ color: 'var(--secondary)' }}>
              {category.post_count || posts?.length || 0} posts
            </p>
          </div>

          {/* Posts grid */}
          {posts && posts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post: CategoryPost) => (
                <Link
                  key={post.id}
                  href={`/articles/${post.slug}`}
                  className="group block rounded-lg border overflow-hidden transition-all hover:border-[var(--primary)] hover:shadow-lg"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  {/* Featured image */}
                  {post.featured_image_url && (
                    <div className="aspect-video overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.featured_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  {!post.featured_image_url && (
                    <div
                      className="aspect-video flex items-center justify-center text-5xl"
                      style={{ background: 'var(--background)' }}
                    >
                      {getContentTypeIcon(post.content_type)}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3 text-sm" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                      <span>{getContentTypeIcon(post.content_type)}</span>
                      <span>{post.reading_time || 5} min</span>
                    </div>
                    <h3
                      className="text-xl font-bold mb-2 group-hover:text-[var(--primary)] transition-colors"
                      style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}
                    >
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p
                        className="line-clamp-2 mb-4"
                        style={{ color: 'var(--foreground)', opacity: 0.7, fontFamily: 'var(--font-body)' }}
                      >
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--secondary)' }}>
                        {post.author?.display_name || 'Anonymous'}
                      </span>
                      <span style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                        {post.published_at ? formatRelativeTime(post.published_at) : 'Draft'}
                      </span>
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
              <span className="text-6xl block mb-4">📝</span>
              <h2
                className="text-xl font-bold mb-2"
                style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}
              >
                No posts yet
              </h2>
              <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                Be the first to write about {category.name.toLowerCase()}!
              </p>
              <Link
                href="/apply"
                className="inline-block mt-6 px-6 py-3 rounded-lg"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}
              >
                Become a Contributor
              </Link>
            </div>
          )}

          {/* Browse other categories */}
          <div className="mt-16 text-center">
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border transition-colors hover:bg-[var(--surface)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              ← Browse All Categories
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

function getCategoryIcon(slug: string): string {
  const icons: Record<string, string> = {
    'housing': '🏠',
    'benefits': '📋',
    'healthcare': '🏥',
    'labour': '👷',
    'economic-justice': '💰',
    'disability-rights': '♿',
    'immigration': '🌍',
    'education': '📚',
    'environment': '🌱',
    'criminal-justice': '⚖️',
    'media-criticism': '📺',
    'local-politics': '🏛️',
  };
  return icons[slug] || '📝';
}


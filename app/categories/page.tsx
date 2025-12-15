import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Nav from '../components/Nav';
import Footer from '../components/layout/Footer';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  post_count: number | null;
  posts: { count: number }[];
}

export const metadata = {
  title: 'Categories',
  description: 'Browse content by category on Scroungers Multimedia.',
};

const categoryIcons: Record<string, string> = {
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
  'default': '📝',
};

const categoryDescriptions: Record<string, string> = {
  'housing': 'Stories about housing crises, homelessness, tenant rights, and the struggle for shelter.',
  'benefits': 'Navigating the benefits system, Universal Credit, PIP, and bureaucratic battles.',
  'healthcare': 'NHS experiences, mental health, disability access, and healthcare inequalities.',
  'labour': 'Workers\' rights, precarious employment, gig economy, and union struggles.',
  'economic-justice': 'Poverty, inequality, cost of living, and economic policy impacts.',
  'disability-rights': 'Disability justice, accessibility, ableism, and lived experiences.',
  'immigration': 'Immigration policy, asylum, citizenship, and migrant experiences.',
  'education': 'Educational inequality, student debt, and access to learning.',
  'environment': 'Climate justice, environmental racism, and sustainable futures.',
  'criminal-justice': 'Policing, prisons, legal aid, and justice system reform.',
  'media-criticism': 'Analysis of mainstream media, propaganda, and media representation.',
  'local-politics': 'Council decisions, local campaigns, and community organizing.',
};

export default async function CategoriesPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('categories')
    .select('*, posts:posts(count)')
    .order('post_count', { ascending: false });

  return (
    <>
      <Nav />
      <section className="min-h-screen py-24 px-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-6xl mx-auto">
          <h1
            className="text-5xl font-bold mb-4 text-center"
            style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--primary)' }}
          >
            explore categories
          </h1>
          <p
            className="text-center mb-12 text-lg max-w-2xl mx-auto"
            style={{ color: 'var(--foreground)', opacity: 0.7, fontFamily: 'var(--font-body)' }}
          >
            Dive into topics that matter. Real stories from people who live these realities every day.
          </p>

          {categories && categories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category: Category) => (
                <Link
                  key={category.id}
                  href={`/articles?category=${category.slug}`}
                  className="p-6 rounded-lg border transition-all hover:border-[var(--primary)] hover:shadow-lg group"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className="text-4xl flex-shrink-0 group-hover:scale-110 transition-transform"
                      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                    >
                      {categoryIcons[category.slug] || categoryIcons['default']}
                    </span>
                    <div>
                      <h2
                        className="text-xl font-bold group-hover:text-[var(--primary)] transition-colors"
                        style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}
                      >
                        {category.name}
                      </h2>
                      <p
                        className="text-sm mt-2 line-clamp-2"
                        style={{ color: 'var(--foreground)', opacity: 0.7, fontFamily: 'var(--font-body)' }}
                      >
                        {category.description || categoryDescriptions[category.slug] || 'Explore content in this category.'}
                      </p>
                      <p className="text-sm mt-3" style={{ color: 'var(--secondary)' }}>
                        {category.post_count || 0} posts
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* Placeholder categories when database is empty */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.keys(categoryDescriptions).map((slug) => (
                <Link
                  key={slug}
                  href={`/articles?category=${slug}`}
                  className="p-6 rounded-lg border transition-all hover:border-[var(--primary)] hover:shadow-lg group"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className="text-4xl flex-shrink-0 group-hover:scale-110 transition-transform"
                    >
                      {categoryIcons[slug]}
                    </span>
                    <div>
                      <h2
                        className="text-xl font-bold group-hover:text-[var(--primary)] transition-colors capitalize"
                        style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}
                      >
                        {slug.replace(/-/g, ' ')}
                      </h2>
                      <p
                        className="text-sm mt-2 line-clamp-2"
                        style={{ color: 'var(--foreground)', opacity: 0.7, fontFamily: 'var(--font-body)' }}
                      >
                        {categoryDescriptions[slug]}
                      </p>
                      <p className="text-sm mt-3" style={{ color: 'var(--secondary)' }}>
                        0 posts
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}


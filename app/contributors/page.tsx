import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getInitials } from '@/lib/utils';
import Footer from '../components/layout/Footer';
import Nav from '../components/Nav';

export const metadata = {
  title: 'Contributors',
  description: 'Meet the voices behind Scroungers Multimedia.',
};

interface Contributor {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  article_count: number | null;
  total_reactions: number | null;
  kofi_username: string | null;
}

export default async function ContributorsPage() {
  const supabase = await createClient();

  const { data: contributors } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['contributor', 'editor', 'admin'])
    .eq('status', 'active')
    .order('article_count', { ascending: false });

  return (
    <>
      <Nav />
      <section className="min-h-screen py-24 px-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-6xl mx-auto">
          <h1
            className="text-5xl font-bold mb-4 text-center"
            style={{
              fontFamily: 'var(--font-kindergarten)',
              color: 'var(--primary)',
            }}
          >
            our contributors
          </h1>
          <p
            className="text-center mb-12 text-lg max-w-2xl mx-auto"
            style={{
              color: 'var(--foreground)',
              opacity: 0.7,
              fontFamily: 'var(--font-body)',
            }}
          >
            Voices from the margins. Real people with skin in the game, sharing their perspectives
            on politics, economics, and society.
          </p>

          {contributors && contributors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {contributors.map((contributor: Contributor) => (
                <Link
                  key={contributor.id}
                  href={`/contributors/${contributor.username}`}
                  className="p-6 rounded-lg border text-center transition-all hover:border-[var(--primary)] hover:shadow-lg group"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold overflow-hidden group-hover:scale-105 transition-transform"
                    style={{
                      background: 'var(--primary)',
                      color: 'var(--background)',
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

                  {/* Name */}
                  <h3
                    className="text-xl font-bold group-hover:text-[var(--primary)] transition-colors"
                    style={{
                      fontFamily: 'var(--font-kindergarten)',
                      color: 'var(--foreground)',
                    }}
                  >
                    {contributor.display_name}
                  </h3>

                  {/* Username */}
                  <p className="text-sm mb-3" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                    @{contributor.username}
                  </p>

                  {/* Bio excerpt */}
                  {contributor.bio && (
                    <p
                      className="text-sm line-clamp-2 mb-4"
                      style={{
                        color: 'var(--foreground)',
                        opacity: 0.7,
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {contributor.bio}
                    </p>
                  )}

                  {/* Stats */}
                  <div
                    className="flex justify-center gap-4 text-xs"
                    style={{ color: 'var(--foreground)', opacity: 0.6 }}
                  >
                    <span>{contributor.article_count || 0} posts</span>
                    <span>•</span>
                    <span>{contributor.total_reactions || 0} ⭐</span>
                  </div>

                  {/* Ko-fi */}
                  {contributor.kofi_username && (
                    <div className="mt-4">
                      <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs"
                        style={{
                          background: 'var(--secondary)',
                          color: 'var(--background)',
                        }}
                      >
                        ☕ Ko-fi
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div
              className="p-12 rounded-lg border text-center"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              <span className="text-6xl block mb-4">👥</span>
              <h2
                className="text-xl font-bold mb-2"
                style={{
                  fontFamily: 'var(--font-kindergarten)',
                  color: 'var(--foreground)',
                }}
              >
                Contributors coming soon
              </h2>
              <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>Be the first to join!</p>
              <Link
                href="/apply"
                className="inline-block mt-6 px-6 py-3 rounded-lg"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--background)',
                }}
              >
                Apply Now
              </Link>
            </div>
          )}

          {/* CTA */}
          <div
            className="mt-16 p-8 rounded-lg text-center"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--secondary)',
            }}
          >
            <h2
              className="text-3xl font-bold mb-4"
              style={{
                fontFamily: 'var(--font-kindergarten)',
                color: 'var(--secondary)',
              }}
            >
              Want to join them?
            </h2>
            <p className="mb-6 text-lg" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
              No credentials required. Just your perspective and your story.
            </p>
            <Link
              href="/apply"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-bold text-lg"
              style={{
                background: 'var(--primary)',
                color: 'var(--background)',
                fontFamily: 'var(--font-kindergarten)',
              }}
            >
              BECOME A CONTRIBUTOR →
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

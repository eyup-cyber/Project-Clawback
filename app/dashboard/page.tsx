import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import AnimatedStatCard from "@/app/components/dashboard/AnimatedStatCard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // Will be redirected by layout
  }

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get user's posts count
  const { count: postsCount } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("author_id", user.id);

  // Get total views (placeholder - would come from views table)
  const totalViews = 1234;

  // Get total reactions
  const { count: reactionsCount } = await supabase
    .from("reactions")
    .select("*", { count: "exact", head: true })
    .eq("post_id", user.id); // This is a placeholder query

  // Recent posts
  const { data: recentPosts } = await supabase
    .from("posts")
    .select("id, title, status, created_at, content_type")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    {
      label: "Total Posts",
      value: postsCount || 0,
      icon: "📝",
      color: "var(--primary)",
    },
    {
      label: "Total Views",
      value: totalViews,
      icon: "👀",
      color: "var(--secondary)",
    },
    {
      label: "Total Stars",
      value: reactionsCount || 0,
      icon: "⭐",
      color: "var(--accent)",
    },
    {
      label: "Ko-fi Earnings",
      value: "£0",
      icon: "☕",
      color: "var(--secondary)",
      isText: true,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome section */}
      <div>
        <h1
          className="text-2xl sm:text-3xl font-bold"
          style={{
            fontFamily: "var(--font-kindergarten)",
            color: "var(--primary)",
          }}
        >
          Welcome back, {profile?.display_name || "Contributor"}!
        </h1>
        <p
          className="text-sm sm:text-base mt-1"
          style={{
            color: "var(--foreground)",
            opacity: 0.7,
            fontFamily: "var(--font-body)",
            letterSpacing: "-0.02em",
          }}
        >
          Here&apos;s an overview of your content performance.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <AnimatedStatCard
            key={stat.label}
            label={stat.label}
            value={"isText" in stat ? stat.value : (stat.value as number)}
            icon={stat.icon}
            color={stat.color}
            delay={index * 0.1}
          />
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* Create new post */}
        <Link
          href="/dashboard/posts/new"
          className="p-4 sm:p-6 rounded-xl border group transition-all duration-300 hover:border-[var(--primary)] hover:shadow-lg"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-2xl sm:text-3xl transition-transform group-hover:scale-110 flex-shrink-0"
              style={{
                background: "var(--primary)",
                boxShadow: "0 0 20px var(--glow-primary)",
              }}
            >
              ✨
            </div>
            <div className="min-w-0">
              <h3
                className="text-lg sm:text-xl font-bold group-hover:text-[var(--primary)] transition-colors truncate"
                style={{
                  color: "var(--foreground)",
                  fontFamily: "var(--font-kindergarten)",
                }}
              >
                Create New Post
              </h3>
              <p
                className="text-xs sm:text-sm line-clamp-2"
                style={{
                  color: "var(--foreground)",
                  opacity: 0.6,
                  fontFamily: "var(--font-body)",
                  letterSpacing: "-0.02em",
                }}
              >
                Write an article, upload a video, or share your art
              </p>
            </div>
          </div>
        </Link>

        {/* View analytics */}
        <Link
          href="/dashboard/analytics"
          className="p-4 sm:p-6 rounded-xl border group transition-all duration-300 hover:border-[var(--secondary)] hover:shadow-lg"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-2xl sm:text-3xl transition-transform group-hover:scale-110 flex-shrink-0"
              style={{
                background: "var(--secondary)",
                boxShadow: "0 0 20px var(--glow-secondary)",
              }}
            >
              📈
            </div>
            <div className="min-w-0">
              <h3
                className="text-lg sm:text-xl font-bold group-hover:text-[var(--secondary)] transition-colors truncate"
                style={{
                  color: "var(--foreground)",
                  fontFamily: "var(--font-kindergarten)",
                }}
              >
                View Analytics
              </h3>
              <p
                className="text-xs sm:text-sm line-clamp-2"
                style={{
                  color: "var(--foreground)",
                  opacity: 0.6,
                  fontFamily: "var(--font-body)",
                  letterSpacing: "-0.02em",
                }}
              >
                See how your content is performing
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent posts */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div
          className="p-3 sm:p-4 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)" }}
        >
          <h2
            className="text-lg sm:text-xl font-bold"
            style={{
              fontFamily: "var(--font-kindergarten)",
              color: "var(--foreground)",
            }}
          >
            Recent Posts
          </h2>
          <Link
            href="/dashboard/posts"
            className="text-xs sm:text-sm hover:underline"
            style={{ color: "var(--primary)", fontFamily: "var(--font-body)" }}
          >
            View All →
          </Link>
        </div>

        {recentPosts && recentPosts.length > 0 ? (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {recentPosts.map((post) => (
              <Link
                key={post.id}
                href={`/dashboard/posts/${post.id}/edit`}
                className="flex items-center justify-between p-3 sm:p-4 hover:bg-[var(--surface-elevated)] transition-colors min-h-[60px]"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <span className="text-lg sm:text-xl flex-shrink-0">
                    {post.content_type === "written" && "📝"}
                    {post.content_type === "video" && "🎬"}
                    {post.content_type === "audio" && "🎙️"}
                    {post.content_type === "visual" && "🎨"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-medium text-sm sm:text-base truncate"
                      style={{
                        color: "var(--foreground)",
                        fontFamily: "var(--font-body)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {post.title || "Untitled"}
                    </p>
                    <p
                      className="text-[10px] sm:text-xs"
                      style={{
                        color: "var(--foreground)",
                        opacity: 0.5,
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span
                  className="px-2 py-1 rounded text-[10px] sm:text-xs capitalize flex-shrink-0 ml-2"
                  style={{
                    background:
                      post.status === "published"
                        ? "var(--primary)"
                        : post.status === "pending"
                        ? "var(--secondary)"
                        : "var(--border)",
                    color:
                      post.status === "draft"
                        ? "var(--foreground)"
                        : "var(--background)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  <span className="hidden sm:inline">{post.status}</span>
                  <span className="sm:hidden">
                    {post.status === "published"
                      ? "✓"
                      : post.status === "pending"
                      ? "⏳"
                      : "📝"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-6 sm:p-8 text-center">
            <p
              className="text-sm sm:text-base"
              style={{
                color: "var(--foreground)",
                opacity: 0.6,
                fontFamily: "var(--font-body)",
                letterSpacing: "-0.02em",
              }}
            >
              No posts yet. Create your first post!
            </p>
            <Link
              href="/dashboard/posts/new"
              className="inline-block mt-4 px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base transition-all hover:scale-105"
              style={{
                background: "var(--primary)",
                color: "var(--background)",
                fontFamily: "var(--font-body)",
                boxShadow: "0 0 20px var(--glow-primary)",
              }}
            >
              Create Post
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

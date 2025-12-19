import { createClient } from "@/lib/supabase/server";
import AnimatedStatCard from "@/app/components/dashboard/AnimatedStatCard";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's posts with stats
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, slug, status, view_count, unique_view_count, reaction_count, comment_count, published_at, content_type")
    .eq("author_id", user.id)
    .order("view_count", { ascending: false });

  // Calculate totals
  const totalViews = posts?.reduce((sum, post) => sum + (post.view_count || 0), 0) || 0;
  const totalReactions = posts?.reduce((sum, post) => sum + (post.reaction_count || 0), 0) || 0;
  const totalComments = posts?.reduce((sum, post) => sum + (post.comment_count || 0), 0) || 0;
  const publishedCount = posts?.filter(p => p.status === 'published').length || 0;

  // Get view trends (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: recentViews } = await supabase
    .from("post_views")
    .select("created_at, post_id")
    .in("post_id", posts?.map(p => p.id) || [])
    .gte("created_at", thirtyDaysAgo.toISOString());

  const viewsByDay = recentViews?.reduce((acc: Record<string, number>, view) => {
    const date = new Date(view.created_at).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {}) || {};

  const stats = [
    { label: "Total Views", value: totalViews, icon: "👀", color: "var(--primary)" },
    { label: "Total Reactions", value: totalReactions, icon: "⭐", color: "var(--secondary)" },
    { label: "Total Comments", value: totalComments, icon: "💬", color: "var(--accent)" },
    { label: "Published Posts", value: publishedCount, icon: "📝", color: "var(--primary)" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl sm:text-3xl font-bold"
          style={{
            fontFamily: "var(--font-kindergarten)",
            color: "var(--primary)",
          }}
        >
          Analytics
        </h1>
        <p
          className="text-sm sm:text-base mt-1"
          style={{
            color: "var(--foreground)",
            opacity: 0.7,
            fontFamily: "var(--font-body)",
          }}
        >
          Track how your content is performing.
        </p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <AnimatedStatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            delay={index * 0.1}
          />
        ))}
      </div>

      {/* Views trend chart placeholder */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2
          className="text-lg font-bold mb-4"
          style={{
            fontFamily: "var(--font-kindergarten)",
            color: "var(--foreground)",
          }}
        >
          Views (Last 30 Days)
        </h2>
        <div className="h-64 flex items-end gap-1">
          {Object.keys(viewsByDay).length > 0 ? (
            Object.entries(viewsByDay)
              .slice(-30)
              .map(([date, count]) => {
                const maxCount = Math.max(...Object.values(viewsByDay));
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div
                    key={date}
                    className="flex-1 rounded-t transition-all hover:opacity-80"
                    style={{
                      height: `${Math.max(height, 5)}%`,
                      background: "var(--primary)",
                      minWidth: "8px",
                    }}
                    title={`${date}: ${count} views`}
                  />
                );
              })
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p
                className="text-sm"
                style={{ color: "var(--foreground)", opacity: 0.5 }}
              >
                No view data available yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Top performing posts */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2
            className="text-lg font-bold"
            style={{
              fontFamily: "var(--font-kindergarten)",
              color: "var(--foreground)",
            }}
          >
            Top Performing Posts
          </h2>
        </div>

        {posts && posts.length > 0 ? (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {posts.slice(0, 10).map((post, index) => (
              <div
                key={post.id}
                className="p-4 flex items-center gap-4"
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    background: index < 3 ? "var(--primary)" : "var(--border)",
                    color: index < 3 ? "var(--background)" : "var(--foreground)",
                  }}
                >
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium truncate"
                    style={{
                      color: "var(--foreground)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {post.title || "Untitled"}
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    <span
                      className="text-xs"
                      style={{ color: "var(--foreground)", opacity: 0.6 }}
                    >
                      👀 {post.view_count || 0}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--foreground)", opacity: 0.6 }}
                    >
                      ⭐ {post.reaction_count || 0}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--foreground)", opacity: 0.6 }}
                    >
                      💬 {post.comment_count || 0}
                    </span>
                  </div>
                </div>
                <span
                  className="px-2 py-1 rounded text-xs capitalize flex-shrink-0"
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
                  }}
                >
                  {post.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p
              className="text-sm"
              style={{ color: "var(--foreground)", opacity: 0.6 }}
            >
              No posts yet. Create your first post to see analytics!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

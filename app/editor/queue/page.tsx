import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function EditorQueuePage() {
  const supabase = await createClient();

  // Get pending posts with author info
  const { data: pendingPosts } = await supabase
    .from("posts")
    .select(`
      id,
      title,
      subtitle,
      content_type,
      created_at,
      updated_at,
      author:profiles!posts_author_id_fkey(id, display_name, username, avatar_url),
      category:categories(name)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case "written": return "📝";
      case "video": return "🎬";
      case "audio": return "🎙️";
      case "visual": return "🎨";
      default: return "📄";
    }
  };

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
          Review Queue
        </h1>
        <p
          className="text-sm sm:text-base mt-1"
          style={{
            color: "var(--foreground)",
            opacity: 0.7,
            fontFamily: "var(--font-body)",
          }}
        >
          Posts awaiting editorial review
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div
          className="px-4 py-2 rounded-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <span
            className="text-2xl font-bold"
            style={{ color: "var(--secondary)" }}
          >
            {pendingPosts?.length || 0}
          </span>
          <span
            className="text-sm ml-2"
            style={{ color: "var(--foreground)", opacity: 0.7 }}
          >
            pending reviews
          </span>
        </div>
      </div>

      {/* Queue */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {pendingPosts && pendingPosts.length > 0 ? (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {pendingPosts.map((post) => {
              const author = post.author as unknown as { id: string; display_name: string; username: string; avatar_url: string | null };
              const category = post.category as unknown as { name: string } | null;
              
              return (
                <Link
                  key={post.id}
                  href={`/editor/${post.id}/review`}
                  className="block p-4 sm:p-6 hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Content type icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: "var(--surface-elevated)" }}
                    >
                      {getContentIcon(post.content_type)}
                    </div>

                    {/* Post info */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-lg font-bold truncate"
                        style={{
                          color: "var(--foreground)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {post.title || "Untitled"}
                      </h3>
                      {post.subtitle && (
                        <p
                          className="text-sm truncate mt-0.5"
                          style={{ color: "var(--foreground)", opacity: 0.7 }}
                        >
                          {post.subtitle}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        {/* Author */}
                        <div className="flex items-center gap-2">
                          {author?.avatar_url ? (
                            <img
                              src={author.avatar_url}
                              alt={author.display_name}
                              className="w-5 h-5 rounded-full"
                            />
                          ) : (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                              style={{ background: "var(--primary)", color: "var(--background)" }}
                            >
                              {author?.display_name?.[0] || "?"}
                            </div>
                          )}
                          <span
                            className="text-sm"
                            style={{ color: "var(--foreground)", opacity: 0.8 }}
                          >
                            {author?.display_name || "Unknown"}
                          </span>
                        </div>

                        {/* Category */}
                        {category && (
                          <span
                            className="px-2 py-0.5 rounded text-xs"
                            style={{
                              background: "var(--surface-elevated)",
                              color: "var(--foreground)",
                            }}
                          >
                            {category.name}
                          </span>
                        )}

                        {/* Submitted time */}
                        <span
                          className="text-xs"
                          style={{ color: "var(--foreground)", opacity: 0.5 }}
                        >
                          Submitted {formatDate(post.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Review button */}
                    <div className="flex-shrink-0">
                      <span
                        className="px-4 py-2 rounded-lg text-sm font-medium inline-block"
                        style={{
                          background: "var(--primary)",
                          color: "var(--background)",
                        }}
                      >
                        Review →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-8 sm:p-12 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3
              className="text-xl font-bold mb-2"
              style={{
                color: "var(--foreground)",
                fontFamily: "var(--font-kindergarten)",
              }}
            >
              Queue is empty!
            </h3>
            <p
              className="text-sm"
              style={{ color: "var(--foreground)", opacity: 0.6 }}
            >
              All caught up. No posts are waiting for review.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

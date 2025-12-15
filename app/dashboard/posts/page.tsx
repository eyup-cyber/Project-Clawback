import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  formatRelativeTime,
  getContentTypeIcon,
  getContentTypeLabel,
} from "@/lib/utils";

export default async function PostsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // Will be redirected by layout
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  const statusColors = {
    draft: { bg: "var(--border)", text: "var(--foreground)" },
    pending: { bg: "var(--secondary)", text: "var(--background)" },
    scheduled: { bg: "var(--accent)", text: "var(--background)" },
    published: { bg: "var(--primary)", text: "var(--background)" },
    archived: { bg: "var(--border)", text: "var(--foreground)" },
    rejected: { bg: "#ff4444", text: "#ffffff" },
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{
              fontFamily: "var(--font-kindergarten)",
              color: "var(--primary)",
            }}
          >
            My Posts
          </h1>
          <p
            style={{
              color: "var(--foreground)",
              opacity: 0.7,
              fontFamily: "var(--font-body)",
            }}
          >
            Manage and edit your content.
          </p>
        </div>
        <Link
          href="/dashboard/posts/new"
          className="px-4 py-2 rounded-lg flex items-center gap-2"
          style={{
            background: "var(--primary)",
            color: "var(--background)",
            fontFamily: "var(--font-body)",
          }}
        >
          <span>✨</span> New Post
        </Link>
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap gap-4 p-4 rounded-lg mb-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <select
          className="px-4 py-2 rounded-lg border"
          style={{
            background: "var(--background)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <option>All Status</option>
          <option>Draft</option>
          <option>Pending Review</option>
          <option>Published</option>
          <option>Archived</option>
        </select>
        <select
          className="px-4 py-2 rounded-lg border"
          style={{
            background: "var(--background)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <option>All Types</option>
          <option>Written</option>
          <option>Video</option>
          <option>Audio</option>
          <option>Visual</option>
        </select>
        <input
          type="search"
          placeholder="Search posts..."
          className="flex-1 px-4 py-2 rounded-lg border"
          style={{
            background: "var(--background)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* Posts list */}
      {posts && posts.length > 0 ? (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between p-4 hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Type icon */}
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: "var(--background)" }}
                  >
                    {getContentTypeIcon(post.content_type)}
                  </div>

                  {/* Title and meta */}
                  <div className="min-w-0 flex-1">
                    <h3
                      className="font-medium truncate"
                      style={{
                        color: "var(--foreground)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {post.title || "Untitled"}
                    </h3>
                    <div
                      className="flex items-center gap-3 text-xs mt-1"
                      style={{ color: "var(--foreground)", opacity: 0.5 }}
                    >
                      <span>{getContentTypeLabel(post.content_type)}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(post.created_at)}</span>
                      {post.view_count > 0 && (
                        <>
                          <span>•</span>
                          <span>{post.view_count} views</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium capitalize flex-shrink-0"
                    style={{
                      background:
                        statusColors[post.status as keyof typeof statusColors]
                          ?.bg || "var(--border)",
                      color:
                        statusColors[post.status as keyof typeof statusColors]
                          ?.text || "var(--foreground)",
                    }}
                  >
                    {post.status?.replace("_", " ")}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/dashboard/posts/${post.id}/edit`}
                    className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
                    title="Edit"
                  >
                    ✏️
                  </Link>
                  {post.status === "published" && (
                    <Link
                      href={`/articles/${post.slug}`}
                      target="_blank"
                      className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
                      title="View"
                    >
                      👁️
                    </Link>
                  )}
                  <button
                    className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
                    title="More options"
                  >
                    ⋮
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="p-12 rounded-lg border text-center"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <span className="text-6xl block mb-4">📝</span>
          <h2
            className="text-xl font-bold mb-2"
            style={{
              fontFamily: "var(--font-kindergarten)",
              color: "var(--foreground)",
            }}
          >
            No posts yet
          </h2>
          <p
            className="mb-6"
            style={{
              color: "var(--foreground)",
              opacity: 0.6,
              fontFamily: "var(--font-body)",
            }}
          >
            Create your first post and share your voice with the world.
          </p>
          <Link
            href="/dashboard/posts/new"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg"
            style={{
              background: "var(--primary)",
              color: "var(--background)",
              fontFamily: "var(--font-body)",
            }}
          >
            <span>✨</span> Create Your First Post
          </Link>
        </div>
      )}
    </div>
  );
}

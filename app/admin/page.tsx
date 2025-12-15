import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

interface PendingPost {
  id: string;
  title: string;
  author: { display_name: string; username: string } | null;
}

interface PendingApplication {
  id: string;
  created_at: string;
  user: { display_name: string; email: string } | null;
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Get counts
  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: totalPosts } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true });

  const { count: pendingReview } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: pendingApplications } = await supabase
    .from("contributor_applications")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // Recent pending posts
  const { data: recentPendingPosts } = await supabase
    .from("posts")
    .select(
      `
      *,
      author:profiles(display_name, username, avatar_url)
    `
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  // Recent applications
  const { data: recentApplications } = await supabase
    .from("contributor_applications")
    .select(
      `
      *,
      user:profiles!contributor_applications_user_id_fkey(display_name, username, email)
    `
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    {
      label: "Total Users",
      value: totalUsers || 0,
      icon: "👥",
      color: "var(--primary)",
      href: "/admin/users",
    },
    {
      label: "Total Posts",
      value: totalPosts || 0,
      icon: "📝",
      color: "var(--secondary)",
      href: "/admin/posts",
    },
    {
      label: "Pending Review",
      value: pendingReview || 0,
      icon: "⏳",
      color: "var(--accent)",
      href: "/admin/posts?status=pending",
    },
    {
      label: "Applications",
      value: pendingApplications || 0,
      icon: "📋",
      color: "#FF6B6B",
      href: "/admin/applications",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-3xl font-bold"
          style={{
            fontFamily: "var(--font-kindergarten)",
            color: "var(--accent)",
          }}
        >
          Admin Dashboard
        </h1>
        <p
          style={{
            color: "var(--foreground)",
            opacity: 0.7,
            fontFamily: "var(--font-body)",
          }}
        >
          Manage content, users, and platform settings.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="p-6 rounded-lg border transition-all hover:shadow-lg group"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
                style={{ background: `${stat.color}20` }}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-3xl font-bold" style={{ color: stat.color }}>
                  {stat.value.toLocaleString()}
                </p>
                <p
                  className="text-sm"
                  style={{
                    color: "var(--foreground)",
                    opacity: 0.6,
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {stat.label}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending posts */}
        <div
          className="rounded-lg border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="p-4 border-b flex items-center justify-between"
            style={{ borderColor: "var(--border)" }}
          >
            <h2
              className="text-xl font-bold"
              style={{
                fontFamily: "var(--font-kindergarten)",
                color: "var(--foreground)",
              }}
            >
              Pending Review
            </h2>
            <Link
              href="/admin/posts?status=pending"
              className="text-sm hover:underline"
              style={{ color: "var(--primary)" }}
            >
              View All →
            </Link>
          </div>

          {recentPendingPosts && recentPendingPosts.length > 0 ? (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {recentPendingPosts.map((post: PendingPost) => (
                <Link
                  key={post.id}
                  href={`/admin/posts/${post.id}`}
                  className="flex items-center justify-between p-4 hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <div className="min-w-0">
                    <p
                      className="font-medium truncate"
                      style={{
                        color: "var(--foreground)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {post.title || "Untitled"}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--foreground)", opacity: 0.5 }}
                    >
                      by{" "}
                      {post.author?.display_name ||
                        post.author?.username ||
                        "Unknown"}
                    </p>
                  </div>
                  <span
                    className="text-sm"
                    style={{ color: "var(--secondary)" }}
                  >
                    Review →
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p style={{ color: "var(--foreground)", opacity: 0.6 }}>
                No posts pending review 🎉
              </p>
            </div>
          )}
        </div>

        {/* Pending applications */}
        <div
          className="rounded-lg border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="p-4 border-b flex items-center justify-between"
            style={{ borderColor: "var(--border)" }}
          >
            <h2
              className="text-xl font-bold"
              style={{
                fontFamily: "var(--font-kindergarten)",
                color: "var(--foreground)",
              }}
            >
              Contributor Applications
            </h2>
            <Link
              href="/admin/applications"
              className="text-sm hover:underline"
              style={{ color: "var(--primary)" }}
            >
              View All →
            </Link>
          </div>

          {recentApplications && recentApplications.length > 0 ? (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {recentApplications.map((app: PendingApplication) => (
                <Link
                  key={app.id}
                  href={`/admin/applications/${app.id}`}
                  className="flex items-center justify-between p-4 hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <div className="min-w-0">
                    <p
                      className="font-medium truncate"
                      style={{
                        color: "var(--foreground)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {app.user?.display_name ||
                        app.user?.email ||
                        "Unknown User"}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--foreground)", opacity: 0.5 }}
                    >
                      {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className="text-sm"
                    style={{ color: "var(--secondary)" }}
                  >
                    Review →
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p style={{ color: "var(--foreground)", opacity: 0.6 }}>
                No pending applications
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div
        className="p-6 rounded-lg border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2
          className="text-xl font-bold mb-4"
          style={{
            fontFamily: "var(--font-kindergarten)",
            color: "var(--foreground)",
          }}
        >
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/posts?status=pending"
            className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            style={{
              background: "var(--secondary)",
              color: "var(--background)",
            }}
          >
            ⏳ Review Posts
          </Link>
          <Link
            href="/admin/applications"
            className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            style={{ background: "var(--primary)", color: "var(--background)" }}
          >
            📋 Review Applications
          </Link>
          <Link
            href="/admin/users"
            className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            style={{
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          >
            👥 Manage Users
          </Link>
          <Link
            href="/admin/settings"
            className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            style={{
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          >
            ⚙️ Site Settings
          </Link>
        </div>
      </div>
    </div>
  );
}

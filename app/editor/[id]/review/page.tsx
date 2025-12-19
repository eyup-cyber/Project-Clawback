"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

interface Post {
  id: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  content_html: string | null;
  content_type: string;
  featured_image_url: string | null;
  media_url: string | null;
  status: string;
  created_at: string;
  author: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
  category: {
    name: string;
  } | null;
}

export default function ReviewPostPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<"approve" | "request_changes" | "reject" | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const fetchPost = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          author:profiles!posts_author_id_fkey(id, display_name, username, avatar_url),
          category:categories(name)
        `)
        .eq("id", resolvedParams.id)
        .single();

      if (error || !data) {
        toast.error("Post not found");
        router.push("/editor/queue");
        return;
      }

      setPost(data as unknown as Post);
      setLoading(false);
    };

    void fetchPost();
  }, [resolvedParams.id, supabase, router]);

  const handleSubmitDecision = async () => {
    if (!decision) {
      toast.error("Please select a decision");
      return;
    }

    if ((decision === "reject" || decision === "request_changes") && !notes.trim()) {
      toast.error("Please provide notes for the author");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      let newStatus: string;
      switch (decision) {
        case "approve":
          newStatus = "published";
          break;
        case "request_changes":
          newStatus = "draft"; // Send back to draft for revisions
          break;
        case "reject":
          newStatus = "rejected";
          break;
        default:
          throw new Error("Invalid decision");
      }

      // Update post status
      const { error: updateError } = await supabase
        .from("posts")
        .update({
          status: newStatus,
          rejection_reason: decision === "reject" || decision === "request_changes" ? notes : null,
          published_at: decision === "approve" ? new Date().toISOString() : null,
        })
        .eq("id", resolvedParams.id);

      if (updateError) throw updateError;

      // Create notification for author
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: post?.author.id,
        type: decision === "approve" ? "post_approved" : decision === "reject" ? "post_rejected" : "post_changes_requested",
        title:
          decision === "approve"
            ? "Your post has been published!"
            : decision === "reject"
            ? "Your post was not approved"
            : "Changes requested for your post",
        message:
          decision === "approve"
            ? `"${post?.title}" is now live on the site.`
            : notes,
        link: decision === "approve" ? `/articles/${post?.id}` : `/dashboard/posts/${post?.id}/edit`,
      });

      if (notifError) {
        console.error("Failed to create notification:", notifError);
      }

      toast.success(
        decision === "approve"
          ? "Post approved and published!"
          : decision === "reject"
          ? "Post rejected"
          : "Sent back for revisions"
      );

      router.push("/editor/queue");
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit decision");
    } finally {
      setSubmitting(false);
    }
  };

  const calculateReadingTime = (html: string | null) => {
    if (!html) return 0;
    const text = html.replace(/<[^>]*>/g, "");
    const words = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  };

  const calculateWordCount = (html: string | null) => {
    if (!html) return 0;
    const text = html.replace(/<[^>]*>/g, "");
    return text.split(/\s+/).filter(Boolean).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)" }}
        />
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/editor/queue"
            className="flex items-center gap-2 mb-2 text-sm hover:text-[var(--primary)]"
            style={{ color: "var(--foreground)", opacity: 0.7 }}
          >
            ← Back to queue
          </Link>
          <h1
            className="text-xl sm:text-2xl font-bold"
            style={{
              fontFamily: "var(--font-kindergarten)",
              color: "var(--primary)",
            }}
          >
            Review Post
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Article preview - Left side */}
        <div className="lg:col-span-2">
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            {/* Featured image */}
            {post.featured_image_url && (
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full h-64 object-cover"
              />
            )}

            {/* Content */}
            <div className="p-6">
              <h2
                className="text-2xl font-bold mb-2"
                style={{
                  color: "var(--foreground)",
                  fontFamily: "var(--font-kindergarten)",
                }}
              >
                {post.title || "Untitled"}
              </h2>
              {post.subtitle && (
                <p
                  className="text-lg mb-4"
                  style={{ color: "var(--foreground)", opacity: 0.8 }}
                >
                  {post.subtitle}
                </p>
              )}

              {/* Media for non-written content */}
              {post.media_url && post.content_type === "video" && (
                <div className="mb-6 rounded-lg overflow-hidden">
                  <video src={post.media_url} controls className="w-full" />
                </div>
              )}
              {post.media_url && post.content_type === "audio" && (
                <div className="mb-6">
                  <audio src={post.media_url} controls className="w-full" />
                </div>
              )}

              {/* Article content */}
              {post.content_html && (
                <div
                  className="prose prose-invert max-w-none"
                  style={{
                    color: "var(--foreground)",
                    fontFamily: "var(--font-body)",
                  }}
                  dangerouslySetInnerHTML={{ __html: post.content_html }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Review panel - Right side */}
        <div className="space-y-6">
          {/* Post metadata */}
          <div
            className="p-4 rounded-xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <h3
              className="text-sm font-bold mb-4 uppercase tracking-wider"
              style={{ color: "var(--foreground)", opacity: 0.7 }}
            >
              Post Details
            </h3>

            <div className="space-y-3">
              {/* Author */}
              <div className="flex items-center gap-3">
                {post.author?.avatar_url ? (
                  <img
                    src={post.author.avatar_url}
                    alt={post.author.display_name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ background: "var(--primary)", color: "var(--background)" }}
                  >
                    {post.author?.display_name?.[0] || "?"}
                  </div>
                )}
                <div>
                  <p
                    className="font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {post.author?.display_name}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--foreground)", opacity: 0.6 }}
                  >
                    @{post.author?.username}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p style={{ color: "var(--foreground)", opacity: 0.6 }}>Submitted</p>
                    <p style={{ color: "var(--foreground)" }}>
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "var(--foreground)", opacity: 0.6 }}>Category</p>
                    <p style={{ color: "var(--foreground)" }}>
                      {post.category?.name || "Uncategorized"}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "var(--foreground)", opacity: 0.6 }}>Word Count</p>
                    <p style={{ color: "var(--foreground)" }}>
                      {calculateWordCount(post.content_html).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "var(--foreground)", opacity: 0.6 }}>Reading Time</p>
                    <p style={{ color: "var(--foreground)" }}>
                      {calculateReadingTime(post.content_html)} min
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Decision panel */}
          <div
            className="p-4 rounded-xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <h3
              className="text-sm font-bold mb-4 uppercase tracking-wider"
              style={{ color: "var(--foreground)", opacity: 0.7 }}
            >
              Decision
            </h3>

            <div className="space-y-2">
              <label
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${
                  decision === "approve" ? "border-[var(--primary)]" : ""
                }`}
                style={{
                  borderColor: decision === "approve" ? "var(--primary)" : "var(--border)",
                  background: decision === "approve" ? "rgba(50, 205, 50, 0.1)" : undefined,
                }}
              >
                <input
                  type="radio"
                  name="decision"
                  value="approve"
                  checked={decision === "approve"}
                  onChange={() => setDecision("approve")}
                  className="sr-only"
                />
                <span className="text-xl">✓</span>
                <div>
                  <p className="font-medium" style={{ color: "var(--foreground)" }}>
                    Approve
                  </p>
                  <p className="text-xs" style={{ color: "var(--foreground)", opacity: 0.6 }}>
                    Publish this post
                  </p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${
                  decision === "request_changes" ? "border-[var(--secondary)]" : ""
                }`}
                style={{
                  borderColor: decision === "request_changes" ? "var(--secondary)" : "var(--border)",
                  background: decision === "request_changes" ? "rgba(255, 215, 0, 0.1)" : undefined,
                }}
              >
                <input
                  type="radio"
                  name="decision"
                  value="request_changes"
                  checked={decision === "request_changes"}
                  onChange={() => setDecision("request_changes")}
                  className="sr-only"
                />
                <span className="text-xl">✏️</span>
                <div>
                  <p className="font-medium" style={{ color: "var(--foreground)" }}>
                    Request Changes
                  </p>
                  <p className="text-xs" style={{ color: "var(--foreground)", opacity: 0.6 }}>
                    Send back for revisions
                  </p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${
                  decision === "reject" ? "border-[var(--accent)]" : ""
                }`}
                style={{
                  borderColor: decision === "reject" ? "var(--accent)" : "var(--border)",
                  background: decision === "reject" ? "rgba(255, 99, 71, 0.1)" : undefined,
                }}
              >
                <input
                  type="radio"
                  name="decision"
                  value="reject"
                  checked={decision === "reject"}
                  onChange={() => setDecision("reject")}
                  className="sr-only"
                />
                <span className="text-xl">✕</span>
                <div>
                  <p className="font-medium" style={{ color: "var(--foreground)" }}>
                    Reject
                  </p>
                  <p className="text-xs" style={{ color: "var(--foreground)", opacity: 0.6 }}>
                    Do not publish
                  </p>
                </div>
              </label>
            </div>

            {/* Notes */}
            {(decision === "request_changes" || decision === "reject") && (
              <div className="mt-4">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Notes to Author *
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-lg border resize-none"
                  style={{
                    background: "var(--background)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                  placeholder={
                    decision === "reject"
                      ? "Explain why this post was rejected..."
                      : "What changes should be made..."
                  }
                />
              </div>
            )}

            <button
              onClick={() => void handleSubmitDecision()}
              disabled={submitting || !decision}
              className="w-full mt-4 py-3 rounded-lg font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:
                  decision === "approve"
                    ? "var(--primary)"
                    : decision === "request_changes"
                    ? "var(--secondary)"
                    : decision === "reject"
                    ? "var(--accent)"
                    : "var(--border)",
                color:
                  decision
                    ? "var(--background)"
                    : "var(--foreground)",
              }}
            >
              {submitting ? "Submitting..." : "Submit Decision"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

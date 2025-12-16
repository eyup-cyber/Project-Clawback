"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import TipTapEditor from "@/app/components/editor/TipTapEditor";
import MediaUploader from "@/app/components/media/MediaUploader";
import ImageImporter from "@/app/components/media/ImageImporter";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";

type ContentType = "written" | "video" | "audio" | "visual";

const contentTypes = [
  {
    id: "written",
    label: "Written Article",
    icon: "📝",
    description: "Write a text-based article",
  },
  {
    id: "video",
    label: "Video",
    icon: "🎬",
    description: "Upload a video essay or documentary",
  },
  {
    id: "audio",
    label: "Audio",
    icon: "🎙️",
    description: "Share a podcast episode or audio piece",
  },
  {
    id: "visual",
    label: "Visual Art",
    icon: "🎨",
    description: "Showcase your visual artwork or photography",
  },
];

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function NewPostPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<"type" | "content" | "details">("type");
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState("");
  const [kofiUsername, setKofiUsername] = useState("");
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageImportMode, setImageImportMode] = useState<"upload" | "import">("upload");

  // Fetch categories from Supabase
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("sort_order");
      if (data) setCategories(data);
    };
    void fetchCategories();
  }, [supabase]);

  const handleContentTypeSelect = (type: ContentType) => {
    setContentType(type);
    setStep("content");
  };

  const handleMediaUpload = (media: { url: string }) => {
    if (contentType === "visual") {
      setFeaturedImage(media.url);
    } else {
      setMediaUrl(media.url);
    }
  };

  const handleSave = async (statusValue: "draft" | "pending") => {
    if (!contentType || !title.trim()) {
      toast.error("Please fill in the required fields");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const slug = slugify(title);

      const { data, error } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          title,
          subtitle: subtitle || null,
          slug,
          excerpt: excerpt || null,
          content_html: content || null,
          content_type: contentType,
          category_id: categoryId || null,
          featured_image_url: featuredImage,
          media_url: mediaUrl,
          status: statusValue,
        })
        .select()
        .single();

      if (error) throw error;

      // Handle tags
      if (tags.trim()) {
        const tagNames = tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        for (const tagName of tagNames) {
          // Upsert tag
          const { data: tag } = await supabase
            .from("tags")
            .upsert(
              { name: tagName, slug: slugify(tagName) },
              { onConflict: "slug" }
            )
            .select()
            .single();

          if (tag) {
            // Link to post
            await supabase.from("post_tags").insert({
              post_id: data.id,
              tag_id: tag.id,
            });
          }
        }
      }

      toast.success(
        statusValue === "draft" ? "Draft saved!" : "Submitted for review!"
      );
      router.push("/dashboard/posts");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center gap-4 mb-8">
        {["type", "content", "details"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? "bg-[var(--primary)] text-[var(--background)]"
                  : i < ["type", "content", "details"].indexOf(step)
                  ? "bg-[var(--primary)] text-[var(--background)] opacity-50"
                  : "bg-[var(--border)] text-[var(--foreground)]"
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && (
              <div
                className="w-12 h-0.5 mx-2"
                style={{
                  background:
                    i < ["type", "content", "details"].indexOf(step)
                      ? "var(--primary)"
                      : "var(--border)",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Choose content type */}
      {step === "type" && (
        <div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              fontFamily: "var(--font-kindergarten)",
              color: "var(--primary)",
            }}
          >
            What would you like to create?
          </h1>
          <p
            className="mb-8"
            style={{ color: "var(--foreground)", opacity: 0.7 }}
          >
            Choose the type of content you want to publish.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleContentTypeSelect(type.id as ContentType)}
                className="p-6 rounded-lg border text-left transition-all hover:border-[var(--primary)] hover:shadow-lg group"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <span className="text-4xl group-hover:scale-110 inline-block transition-transform">
                  {type.icon}
                </span>
                <h3
                  className="text-xl font-bold mt-4 group-hover:text-[var(--primary)]"
                  style={{
                    color: "var(--foreground)",
                    fontFamily: "var(--font-kindergarten)",
                  }}
                >
                  {type.label}
                </h3>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--foreground)", opacity: 0.6 }}
                >
                  {type.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Content */}
      {step === "content" && contentType && (
        <div>
          <button
            onClick={() => setStep("type")}
            className="flex items-center gap-2 mb-6 text-sm hover:text-[var(--primary)]"
            style={{ color: "var(--foreground)", opacity: 0.7 }}
          >
            ← Back to content type
          </button>

          <h1
            className="text-3xl font-bold mb-2"
            style={{
              fontFamily: "var(--font-kindergarten)",
              color: "var(--primary)",
            }}
          >
            Create Your{" "}
            {contentType === "written"
              ? "Article"
              : contentType === "video"
              ? "Video"
              : contentType === "audio"
              ? "Audio Piece"
              : "Artwork"}
          </h1>
          <p
            className="mb-8"
            style={{ color: "var(--foreground)", opacity: 0.7 }}
          >
            {contentType === "written"
              ? "Write your article using the rich text editor below."
              : "Upload your media and add a description."}
          </p>

          <div className="space-y-6">
            {/* Title */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--foreground)" }}
              >
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a compelling title..."
                className="w-full p-3 rounded-lg border"
                style={{
                  background: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            {/* Subtitle */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--foreground)" }}
              >
                Subtitle
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Optional subtitle..."
                className="w-full p-3 rounded-lg border"
                style={{
                  background: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            {/* Media upload for non-written content */}
            {contentType !== "written" && (
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  {contentType === "visual" ? "Upload Artwork" : "Upload Media"}{" "}
                  *
                </label>
                <MediaUploader
                  mediaType={contentType === "visual" ? "image" : contentType}
                  onUploadComplete={handleMediaUpload}
                />
                {(mediaUrl || featuredImage) && (
                  <p
                    className="mt-2 text-sm"
                    style={{ color: "var(--primary)" }}
                  >
                    ✓ Media uploaded successfully
                  </p>
                )}
              </div>
            )}

            {/* Rich text editor for written content or description for media */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--foreground)" }}
              >
                {contentType === "written" ? "Content *" : "Description"}
              </label>
              <TipTapEditor
                content={content}
                onChange={setContent}
                placeholder={
                  contentType === "written"
                    ? "Start writing your article..."
                    : "Add a description for your content..."
                }
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep("details")}
                disabled={
                  !title.trim() ||
                  (contentType === "written" && !content.trim())
                }
                className="px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "var(--primary)",
                  color: "var(--background)",
                }}
              >
                Continue to Details →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === "details" && contentType && (
        <div>
          <button
            onClick={() => setStep("content")}
            className="flex items-center gap-2 mb-6 text-sm hover:text-[var(--primary)]"
            style={{ color: "var(--foreground)", opacity: 0.7 }}
          >
            ← Back to content
          </button>

          <h1
            className="text-3xl font-bold mb-2"
            style={{
              fontFamily: "var(--font-kindergarten)",
              color: "var(--primary)",
            }}
          >
            Final Details
          </h1>
          <p
            className="mb-8"
            style={{ color: "var(--foreground)", opacity: 0.7 }}
          >
            Add metadata and publish settings.
          </p>

          <div className="space-y-6">
            {/* Excerpt */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--foreground)" }}
              >
                Excerpt
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A brief summary for previews..."
                rows={3}
                className="w-full p-3 rounded-lg border resize-none"
                style={{
                  background: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            {/* Category */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--foreground)" }}
              >
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-3 rounded-lg border"
                style={{
                  background: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                <option value="">Select a category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--foreground)" }}
              >
                Tags
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Comma-separated tags..."
                className="w-full p-3 rounded-lg border"
                style={{
                  background: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
              <p
                className="text-xs mt-1"
                style={{ color: "var(--foreground)", opacity: 0.5 }}
              >
                e.g., housing, benefits, activism
              </p>
            </div>

            {/* Featured image for written content */}
            {contentType === "written" && (
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Featured Image
                </label>
                
                {/* Tabs for upload vs import */}
                <div className="mb-4 flex gap-2 border-b" style={{ borderColor: "var(--border)" }}>
                  <button
                    onClick={() => setImageImportMode("upload")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      imageImportMode === "upload" ? "border-b-2" : "opacity-60"
                    }`}
                    style={{
                      borderColor: imageImportMode === "upload" ? "var(--primary)" : "transparent",
                      color: "var(--foreground)",
                    }}
                  >
                    Upload Image
                  </button>
                  <button
                    onClick={() => setImageImportMode("import")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      imageImportMode === "import" ? "border-b-2" : "opacity-60"
                    }`}
                    style={{
                      borderColor: imageImportMode === "import" ? "var(--primary)" : "transparent",
                      color: "var(--foreground)",
                    }}
                  >
                    Import from Patreon/X
                  </button>
                </div>

                {imageImportMode === "upload" ? (
                  <>
                    <MediaUploader
                      mediaType="image"
                      onUploadComplete={(media) => setFeaturedImage(media.url)}
                    />
                    {featuredImage && (
                      <p
                        className="mt-2 text-sm"
                        style={{ color: "var(--primary)" }}
                      >
                        ✓ Featured image uploaded
                      </p>
                    )}
                  </>
                ) : (
                  <ImageImporter
                    onImageSelect={setFeaturedImage}
                    currentImage={featuredImage}
                  />
                )}
              </div>
            )}

            {/* Ko-fi username */}
            <div
              className="p-4 rounded-lg border"
              style={{
                background: "var(--surface)",
                borderColor: "var(--secondary)",
              }}
            >
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--secondary)" }}
              >
                ☕ Ko-fi Username (Optional)
              </label>
              <input
                type="text"
                value={kofiUsername}
                onChange={(e) => setKofiUsername(e.target.value)}
                placeholder="Your Ko-fi username for donations..."
                className="w-full p-3 rounded-lg border"
                style={{
                  background: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
              <p
                className="text-xs mt-2"
                style={{ color: "var(--foreground)", opacity: 0.6 }}
              >
                Readers will see a Ko-fi donation button on your post. You keep
                100% of all donations.
              </p>
            </div>

            {/* Action buttons */}
            <div
              className="flex flex-col sm:flex-row gap-4 justify-end pt-6 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                onClick={() => void handleSave("draft")}
                disabled={saving}
                className="px-6 py-3 rounded-lg font-medium border"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {saving ? "Saving..." : "Save as Draft"}
              </button>
              <button
                onClick={() => void handleSave("pending")}
                disabled={saving}
                className="px-6 py-3 rounded-lg font-medium"
                style={{
                  background: "var(--primary)",
                  color: "var(--background)",
                }}
              >
                {saving ? "Submitting..." : "Submit for Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

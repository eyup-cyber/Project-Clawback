"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import ImageImporter from "@/app/components/media/ImageImporter";
import MediaUploader from "@/app/components/media/MediaUploader";

interface MediaItem {
  id: string;
  url: string;
  thumbnail_url?: string | null;
  alt_text?: string | null;
  filename: string;
  media_type: string | null;
  mime_type: string;
  file_size: number;
  width?: number | null;
  height?: number | null;
  created_at: string;
}

export default function MediaLibraryPage() {
  const supabase = createClient();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterType, setFilterType] = useState<string>("all");
  const [importMode, setImportMode] = useState<"upload" | "import">("upload");
  const [showImporter, setShowImporter] = useState(false);

  useEffect(() => {
    fetchMedia();
  }, [filterType]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please log in to view your media");
        return;
      }

      let query = supabase
        .from("media")
        .select("*")
        .eq("uploader_id", user.id)
        .order("created_at", { ascending: false });

      if (filterType !== "all") {
        query = query.eq("media_type", filterType as "image" | "video" | "audio");
      }

      const { data, error } = await query;

      if (error) throw error;

      setMedia(data || []);
    } catch (error) {
      console.error("Error fetching media:", error);
      toast.error("Failed to load media");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this media item?")) return;

    try {
      const { error } = await supabase.from("media").delete().eq("id", id);

      if (error) throw error;

      toast.success("Media deleted");
      fetchMedia();
      if (selectedMedia?.id === id) {
        setSelectedMedia(null);
      }
    } catch (error) {
      console.error("Error deleting media:", error);
      toast.error("Failed to delete media");
    }
  };

  const handleImageImported = (imageUrl: string) => {
    toast.success("Image imported successfully!");
    fetchMedia();
    setShowImporter(false);
  };

  const handleMediaUploaded = () => {
    toast.success("Media uploaded successfully!");
    fetchMedia();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard!");
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-4xl font-bold mb-2"
            style={{
              fontFamily: "var(--font-kindergarten)",
              color: "var(--primary)",
            }}
          >
            Media Library
          </h1>
          <p style={{ color: "var(--foreground)", opacity: 0.7 }}>
            Manage your images, videos, and audio files. Import from Patreon/X or upload directly.
          </p>
        </div>

        {/* Actions Bar */}
        <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setShowImporter(!showImporter)}
              className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{
                background: showImporter ? "var(--primary)" : "var(--surface)",
                color: showImporter ? "var(--background)" : "var(--foreground)",
                border: `1px solid ${showImporter ? "var(--primary)" : "var(--border)"}`,
              }}
            >
              {showImporter ? "✕ Close" : "📥 Import from Patreon/X"}
            </button>
            <button
              onClick={() => setImportMode("upload")}
              className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{
                background: importMode === "upload" ? "var(--primary)" : "var(--surface)",
                color: importMode === "upload" ? "var(--background)" : "var(--foreground)",
                border: `1px solid ${importMode === "upload" ? "var(--primary)" : "var(--border)"}`,
              }}
            >
              📤 Upload Media
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            >
              <option value="all">All Media</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
            </select>

            <div className="flex gap-1 rounded-lg border p-1" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded transition-all ${
                  viewMode === "grid" ? "bg-[var(--primary)] text-[var(--background)]" : ""
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded transition-all ${
                  viewMode === "list" ? "bg-[var(--primary)] text-[var(--background)]" : ""
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Image Importer */}
        {showImporter && (
          <div className="mb-6 p-6 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
              Import Images from Patreon/X
            </h2>
            <ImageImporter onImageSelect={handleImageImported} />
          </div>
        )}

        {/* Media Uploader */}
        {importMode === "upload" && !showImporter && (
          <div className="mb-6 p-6 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
              Upload New Media
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>
                  Image
                </label>
                <MediaUploader mediaType="image" onUploadComplete={handleMediaUploaded} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>
                  Video
                </label>
                <MediaUploader mediaType="video" onUploadComplete={handleMediaUploaded} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>
                  Audio
                </label>
                <MediaUploader mediaType="audio" onUploadComplete={handleMediaUploaded} />
              </div>
            </div>
          </div>
        )}

        {/* Media Grid/List */}
        {loading ? (
          <div className="text-center py-12" style={{ color: "var(--foreground)", opacity: 0.7 }}>
            Loading media...
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-12" style={{ color: "var(--foreground)", opacity: 0.7 }}>
            <p className="text-lg mb-2">No media found</p>
            <p className="text-sm">Upload or import your first media file to get started.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {media.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square rounded-lg overflow-hidden border cursor-pointer hover:border-[var(--primary)] transition-all"
                style={{ borderColor: "var(--border)" }}
                onClick={() => setSelectedMedia(item)}
              >
                {item.media_type === "image" && (
                  <Image
                    src={item.thumbnail_url || item.url || ""}
                    alt={item.alt_text || item.filename}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                )}
                {item.media_type !== "image" && (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--surface)" }}>
                    <span className="text-4xl">
                      {item.media_type === "video" ? "🎬" : "🎵"}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyUrl(item.url);
                      }}
                      className="px-3 py-1.5 rounded text-sm font-medium"
                      style={{ background: "var(--primary)", color: "var(--background)" }}
                    >
                      Copy URL
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="px-3 py-1.5 rounded text-sm font-medium"
                      style={{ background: "#ef4444", color: "#fff" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {media.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-[var(--primary)] transition-all cursor-pointer"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                onClick={() => setSelectedMedia(item)}
              >
                <div className="relative w-20 h-20 rounded overflow-hidden flex-shrink-0">
                  {item.media_type === "image" && (
                    <Image
                      src={item.thumbnail_url || item.url || ""}
                      alt={item.alt_text || item.filename}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  )}
                  {item.media_type !== "image" && (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--surface)" }}>
                      <span className="text-2xl">
                        {item.media_type === "video" ? "🎬" : "🎵"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: "var(--foreground)" }}>
                    {item.filename}
                  </p>
                  <p className="text-sm truncate" style={{ color: "var(--foreground)", opacity: 0.6 }}>
                    {item.url}
                  </p>
                  <div className="flex gap-4 text-xs mt-1" style={{ color: "var(--foreground)", opacity: 0.5 }}>
                    <span>{item.media_type}</span>
                    {item.width && item.height && (
                      <span>{item.width} × {item.height}</span>
                    )}
                    <span>{(item.file_size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyUrl(item.url);
                    }}
                    className="px-3 py-1.5 rounded text-sm font-medium"
                    style={{ background: "var(--primary)", color: "var(--background)" }}
                  >
                    Copy URL
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="px-3 py-1.5 rounded text-sm font-medium"
                    style={{ background: "#ef4444", color: "#fff" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Media Details Modal */}
        {selectedMedia && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedMedia(null)}
          >
            <div
              className="max-w-4xl w-full rounded-lg border p-6 max-h-[90vh] overflow-y-auto"
              style={{ background: "var(--background)", borderColor: "var(--border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                  {selectedMedia.filename}
                </h2>
                <button
                  onClick={() => setSelectedMedia(null)}
                  className="text-2xl"
                  style={{ color: "var(--foreground)", opacity: 0.7 }}
                >
                  ×
                </button>
              </div>

              {selectedMedia.media_type === "image" && selectedMedia.url && (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-4" style={{ background: "var(--surface)" }}>
                  <Image
                    src={selectedMedia.url}
                    alt={selectedMedia.alt_text || selectedMedia.filename || "Media"}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}

              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium" style={{ color: "var(--foreground)", opacity: 0.7 }}>
                    URL
                  </label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={selectedMedia.url}
                      readOnly
                      className="flex-1 px-3 py-2 rounded border text-sm"
                      style={{
                        background: "var(--surface)",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }}
                    />
                    <button
                      onClick={() => copyUrl(selectedMedia.url)}
                      className="px-4 py-2 rounded font-medium"
                      style={{ background: "var(--primary)", color: "var(--background)" }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium" style={{ color: "var(--foreground)", opacity: 0.7 }}>
                      Type
                    </label>
                    <p className="mt-1" style={{ color: "var(--foreground)" }}>
                      {selectedMedia.media_type}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium" style={{ color: "var(--foreground)", opacity: 0.7 }}>
                      Size
                    </label>
                    <p className="mt-1" style={{ color: "var(--foreground)" }}>
                      {(selectedMedia.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {selectedMedia.width && selectedMedia.height && (
                    <>
                      <div>
                        <label className="text-sm font-medium" style={{ color: "var(--foreground)", opacity: 0.7 }}>
                          Dimensions
                        </label>
                        <p className="mt-1" style={{ color: "var(--foreground)" }}>
                          {selectedMedia.width} × {selectedMedia.height}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium" style={{ color: "var(--foreground)", opacity: 0.7 }}>
                          Format
                        </label>
                        <p className="mt-1" style={{ color: "var(--foreground)" }}>
                          {selectedMedia.mime_type}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      copyUrl(selectedMedia.url);
                      setSelectedMedia(null);
                    }}
                    className="px-4 py-2 rounded font-medium"
                    style={{ background: "var(--primary)", color: "var(--background)" }}
                  >
                    Copy URL
                  </button>
                  <button
                    onClick={() => {
                      handleDelete(selectedMedia.id);
                      setSelectedMedia(null);
                    }}
                    className="px-4 py-2 rounded font-medium"
                    style={{ background: "#ef4444", color: "#fff" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import Image from "next/image";

interface ImageImporterProps {
  onImageSelect: (imageUrl: string) => void;
  currentImage?: string | null;
}

export default function ImageImporter({ onImageSelect, currentImage }: ImageImporterProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<Array<{
    url: string;
    alt: string;
    width?: number;
    height?: number;
    id?: string;
    originalUrl?: string;
  }>>([]);
  const [uploading, setUploading] = useState(false);

  const handleFetch = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    setLoading(true);
    setImages([]);

    try {
      const response = await fetch("/api/media/fetch-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), uploadToR2: false }),
      });

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.data?.error || "Failed to fetch images");
      }

      if (data.data.images && data.data.images.length > 0) {
        setImages(data.data.images);
        toast.success(`Found ${data.data.images.length} image(s)`);
      } else {
        toast.error("No images found in this post");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch images");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAndSelect = async (imageUrl: string) => {
    setUploading(true);

    try {
      // Upload to R2 and get the stored URL
      const response = await fetch("/api/media/fetch-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url: url.trim(), 
          uploadToR2: true,
          selectedImageUrl: imageUrl, // Specify which image to upload
        }),
      });

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.data?.error || "Failed to upload image");
      }

      // Find the uploaded image
      const uploadedImage = data.data.images?.find((img: any) => 
        img.originalUrl === imageUrl || img.url === imageUrl
      );

      if (uploadedImage) {
        onImageSelect(uploadedImage.url);
        toast.success("Image imported and selected!");
      } else {
        // Fallback: use the original URL if upload failed
        onImageSelect(imageUrl);
        toast.success("Image selected (using original URL)");
      }
    } catch (error) {
      console.error("Upload error:", error);
      // Fallback: use the original URL
      onImageSelect(imageUrl);
      toast.success("Image selected (using original URL)");
    } finally {
      setUploading(false);
    }
  };

  const handleSelectDirect = (imageUrl: string) => {
    onImageSelect(imageUrl);
    toast.success("Image selected");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste Patreon or X (Twitter) post URL..."
          className="flex-1 px-4 py-2 rounded-lg border"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleFetch();
            }
          }}
        />
        <button
          onClick={handleFetch}
          disabled={loading || !url.trim()}
          className="px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: loading ? "var(--border)" : "var(--primary)",
            color: loading ? "var(--foreground)" : "var(--background)",
          }}
        >
          {loading ? "Fetching..." : "Fetch Images"}
        </button>
      </div>

      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm opacity-70">
            Found {images.length} image(s). Click to select:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden border cursor-pointer group hover:border-[var(--primary)] transition-all"
                style={{
                  borderColor: currentImage === image.url ? "var(--primary)" : "var(--border)",
                }}
                onClick={() => handleSelectDirect(image.url)}
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  unoptimized // External images may not be optimized
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUploadAndSelect(image.url);
                    }}
                    disabled={uploading}
                    className="px-4 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    style={{
                      background: "var(--primary)",
                      color: "var(--background)",
                    }}
                  >
                    {uploading ? "Uploading..." : "Import & Select"}
                  </button>
                </div>
                {currentImage === image.url && (
                  <div className="absolute top-2 right-2 bg-[var(--primary)] text-[var(--background)] rounded-full p-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {currentImage && (
        <div className="mt-4 p-4 rounded-lg border" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-medium mb-2">Selected Image:</p>
          <div className="relative aspect-video rounded-lg overflow-hidden">
            <Image
              src={currentImage}
              alt="Selected featured image"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        </div>
      )}

      <div className="text-xs opacity-60 space-y-1">
        <p>💡 <strong>Tip:</strong> Paste a Patreon post URL or X (Twitter) post URL to import images.</p>
        <p>Supported formats: Patreon posts, X/Twitter posts with images</p>
      </div>
    </div>
  );
}


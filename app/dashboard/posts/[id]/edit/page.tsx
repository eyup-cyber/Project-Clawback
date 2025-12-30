'use client';

import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import TipTapEditor from '@/app/components/editor/TipTapEditor';
import ImageImporter from '@/app/components/media/ImageImporter';
import MediaUploader from '@/app/components/media/MediaUploader';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';

type ContentType = 'written' | 'video' | 'audio' | 'visual';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Post {
  id: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  content_html: string | null;
  content_type: ContentType;
  category_id: string | null;
  featured_image_url: string | null;
  media_url: string | null;
  status: string;
}

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState('');
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageImportMode, setImageImportMode] = useState<'upload' | 'import'>('upload');

  // Fetch post and categories
  useEffect(() => {
    const fetchData = async () => {
      // Fetch post
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', resolvedParams.id)
        .single();

      if (postError || !postData) {
        toast.error('Post not found');
        router.push('/dashboard/posts');
        return;
      }

      setPost(postData as Post);
      setTitle(postData.title || '');
      setSubtitle(postData.subtitle || '');
      setExcerpt(postData.excerpt || '');
      setContent(postData.content_html || '');
      setCategoryId(postData.category_id || '');
      setFeaturedImage(postData.featured_image_url);
      setMediaUrl(postData.media_url);

      // Fetch tags
      const { data: postTags } = await supabase
        .from('post_tags')
        .select('tags(name)')
        .eq('post_id', resolvedParams.id);

      if (postTags) {
        const tagNames = postTags
          .map((pt) => (pt.tags as unknown as { name: string })?.name)
          .filter(Boolean);
        setTags(tagNames.join(', '));
      }

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('sort_order');

      if (categoriesData) setCategories(categoriesData);
      setLoading(false);
    };

    void fetchData();
  }, [resolvedParams.id, supabase, router]);

  const handleSave = async (statusValue?: string) => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setSaving(true);

    try {
      const slug = slugify(title);
      const newStatus = statusValue || post?.status || 'draft';

      const { error } = await supabase
        .from('posts')
        .update({
          title,
          subtitle: subtitle || null,
          slug,
          excerpt: excerpt || null,
          content_html: content || null,
          category_id: categoryId || null,
          featured_image_url: featuredImage,
          media_url: mediaUrl,
          status: newStatus,
        })
        .eq('id', resolvedParams.id);

      if (error) throw error;

      // Update tags
      await supabase.from('post_tags').delete().eq('post_id', resolvedParams.id);

      if (tags.trim()) {
        const tagNames = tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);

        for (const tagName of tagNames) {
          const { data: tag } = await supabase
            .from('tags')
            .upsert({ name: tagName, slug: slugify(tagName) }, { onConflict: 'slug' })
            .select()
            .single();

          if (tag) {
            await supabase.from('post_tags').insert({
              post_id: resolvedParams.id,
              tag_id: tag.id,
            });
          }
        }
      }

      toast.success(statusValue === 'pending' ? 'Submitted for review!' : 'Changes saved!');

      if (statusValue === 'pending') {
        router.push('/dashboard/posts');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{
            borderColor: 'var(--border)',
            borderTopColor: 'var(--primary)',
          }}
        />
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => router.push('/dashboard/posts')}
            className="flex items-center gap-2 mb-2 text-sm hover:text-[var(--primary)]"
            style={{ color: 'var(--foreground)', opacity: 0.7 }}
          >
            ← Back to posts
          </button>
          <h1
            className="text-2xl sm:text-3xl font-bold"
            style={{
              fontFamily: 'var(--font-kindergarten)',
              color: 'var(--primary)',
            }}
          >
            Edit Post
          </h1>
        </div>
        <span
          className="px-3 py-1 rounded-full text-sm capitalize"
          style={{
            background:
              post.status === 'published'
                ? 'var(--primary)'
                : post.status === 'pending'
                  ? 'var(--secondary)'
                  : post.status === 'rejected'
                    ? 'var(--accent)'
                    : 'var(--border)',
            color: post.status === 'draft' ? 'var(--foreground)' : 'var(--background)',
          }}
        >
          {post.status}
        </span>
      </div>

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a compelling title..."
            className="w-full p-3 rounded-lg border text-lg"
            style={{
              background: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          />
        </div>

        {/* Subtitle */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
            Subtitle
          </label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Optional subtitle..."
            className="w-full p-3 rounded-lg border"
            style={{
              background: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          />
        </div>

        {/* Media upload for non-written content */}
        {post.content_type !== 'written' && (
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              {post.content_type === 'visual' ? 'Artwork' : 'Media'}
            </label>
            <MediaUploader
              mediaType={post.content_type === 'visual' ? 'image' : post.content_type}
              onUploadComplete={(media) => {
                if (post.content_type === 'visual') {
                  setFeaturedImage(media.url);
                } else {
                  setMediaUrl(media.url);
                }
              }}
            />
            {(mediaUrl || (post.content_type === 'visual' && featuredImage)) && (
              <p className="mt-2 text-sm" style={{ color: 'var(--primary)' }}>
                ✓ Media uploaded
              </p>
            )}
          </div>
        )}

        {/* Content editor */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
            {post.content_type === 'written' ? 'Content' : 'Description'}
          </label>
          <TipTapEditor
            content={content}
            onChange={setContent}
            placeholder={
              post.content_type === 'written' ? 'Write your article...' : 'Add a description...'
            }
          />
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
            Excerpt
          </label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="A brief summary for previews..."
            rows={3}
            className="w-full p-3 rounded-lg border resize-none"
            style={{
              background: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
            Category
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full p-3 rounded-lg border"
            style={{
              background: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
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
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
            Tags
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Comma-separated tags..."
            className="w-full p-3 rounded-lg border"
            style={{
              background: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          />
        </div>

        {/* Featured image for written content */}
        {post.content_type === 'written' && (
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Featured Image
            </label>

            <div className="mb-4 flex gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setImageImportMode('upload')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  imageImportMode === 'upload' ? 'border-b-2' : 'opacity-60'
                }`}
                style={{
                  borderColor: imageImportMode === 'upload' ? 'var(--primary)' : 'transparent',
                  color: 'var(--foreground)',
                }}
              >
                Upload Image
              </button>
              <button
                onClick={() => setImageImportMode('import')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  imageImportMode === 'import' ? 'border-b-2' : 'opacity-60'
                }`}
                style={{
                  borderColor: imageImportMode === 'import' ? 'var(--primary)' : 'transparent',
                  color: 'var(--foreground)',
                }}
              >
                Import from Patreon/X
              </button>
            </div>

            {imageImportMode === 'upload' ? (
              <>
                <MediaUploader
                  mediaType="image"
                  onUploadComplete={(media) => setFeaturedImage(media.url)}
                />
                {featuredImage && (
                  <div className="mt-2">
                    <p className="text-sm mb-2" style={{ color: 'var(--primary)' }}>
                      ✓ Featured image set
                    </p>
                    <img src={featuredImage} alt="Featured" className="max-w-xs rounded-lg" />
                  </div>
                )}
              </>
            ) : (
              <ImageImporter onImageSelect={setFeaturedImage} currentImage={featuredImage} />
            )}
          </div>
        )}

        {/* Action buttons */}
        <div
          className="flex flex-col sm:flex-row gap-4 justify-end pt-6 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          {post.status === 'draft' && (
            <>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="px-6 py-3 rounded-lg font-medium border"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={() => void handleSave('pending')}
                disabled={saving}
                className="px-6 py-3 rounded-lg font-medium"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--background)',
                }}
              >
                {saving ? 'Submitting...' : 'Submit for Review'}
              </button>
            </>
          )}
          {post.status === 'pending' && (
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-6 py-3 rounded-lg font-medium"
              style={{
                background: 'var(--secondary)',
                color: 'var(--background)',
              }}
            >
              {saving ? 'Saving...' : 'Update Submission'}
            </button>
          )}
          {post.status === 'published' && (
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-6 py-3 rounded-lg font-medium"
              style={{
                background: 'var(--primary)',
                color: 'var(--background)',
              }}
            >
              {saving ? 'Saving...' : 'Update Published Post'}
            </button>
          )}
          {post.status === 'rejected' && (
            <>
              <button
                onClick={() => void handleSave('draft')}
                disabled={saving}
                className="px-6 py-3 rounded-lg font-medium border"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                onClick={() => void handleSave('pending')}
                disabled={saving}
                className="px-6 py-3 rounded-lg font-medium"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--background)',
                }}
              >
                {saving ? 'Submitting...' : 'Resubmit for Review'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

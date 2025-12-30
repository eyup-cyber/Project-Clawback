/**
 * Profile Page
 * Phase 1.1.6: Reader/Contributor profile with validation
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import MediaUploader from '@/app/components/media/MediaUploader';
import { createClient } from '@/lib/supabase/client';
import { getInitials } from '@/lib/utils';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const profileSchema = z.object({
  display_name: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name cannot exceed 50 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional().or(z.literal('')),
  website_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  twitter_handle: z
    .string()
    .max(15, 'Twitter handle cannot exceed 15 characters')
    .regex(/^[a-zA-Z0-9_]*$/, 'Invalid Twitter handle format')
    .optional()
    .or(z.literal('')),
  kofi_username: z.string().max(50, 'Ko-fi username too long').optional().or(z.literal('')),
  avatar_url: z.string().optional().or(z.literal('')),
  location: z
    .string()
    .max(100, 'Location cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
  github_username: z
    .string()
    .max(39, 'GitHub username cannot exceed 39 characters')
    .regex(/^[a-zA-Z0-9-]*$/, 'Invalid GitHub username')
    .optional()
    .or(z.literal('')),
  linkedin_url: z.string().url('Please enter a valid LinkedIn URL').optional().or(z.literal('')),
});

type ProfileData = z.infer<typeof profileSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface ValidationErrors {
  [key: string]: string | undefined;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProfilePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showBioPreview, setShowBioPreview] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    display_name: '',
    username: '',
    bio: '',
    website_url: '',
    twitter_handle: '',
    kofi_username: '',
    avatar_url: '',
    location: '',
    github_username: '',
    linkedin_url: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();

        if (data) {
          setProfile({
            display_name: data.display_name || '',
            username: data.username || '',
            bio: data.bio || '',
            website_url: data.website_url || '',
            twitter_handle: data.twitter_handle || '',
            kofi_username: data.kofi_username || '',
            avatar_url: data.avatar_url || '',
            location: data.location || '',
            github_username: data.github_username || '',
            linkedin_url: data.linkedin_url || '',
          });
        }
      }
      setLoading(false);
    };

    void loadProfile();
  }, [supabase]);

  // Validate a single field
  const validateField = useCallback((field: keyof ProfileData, value: string) => {
    try {
      const fieldSchema = profileSchema.shape[field];
      fieldSchema.parse(value);
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, [field]: err.issues[0]?.message }));
      }
      return false;
    }
  }, []);

  // Check if form is valid
  const isValid = useMemo(() => {
    const result = profileSchema.safeParse(profile);
    return result.success;
  }, [profile]);

  // Update field with validation
  const updateField = useCallback(
    (field: keyof ProfileData, value: string) => {
      setProfile((prev) => ({ ...prev, [field]: value }));
      validateField(field, value);
    },
    [validateField]
  );

  const handleSave = async () => {
    // Validate all fields
    const result = profileSchema.safeParse(profile);
    if (!result.success) {
      const newErrors: ValidationErrors = {};
      result.error.issues.forEach((err) => {
        const field = err.path[0] as string;
        newErrors[field] = err.message;
      });
      setErrors(newErrors);
      toast.error('Please fix the errors before saving');
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name,
          username: profile.username,
          bio: profile.bio,
          website_url: profile.website_url || null,
          twitter_handle: profile.twitter_handle || null,
          kofi_username: profile.kofi_username || null,
          avatar_url: profile.avatar_url || null,
          location: profile.location || null,
          github_username: profile.github_username || null,
          linkedin_url: profile.linkedin_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Profile updated!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = (media: { url: string }) => {
    updateField('avatar_url', media.url);
  };

  const handleAvatarRemove = () => {
    updateField('avatar_url', '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl" style={{ color: 'var(--foreground)' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1
        className="text-3xl font-bold mb-2"
        style={{
          fontFamily: 'var(--font-kindergarten)',
          color: 'var(--primary)',
        }}
      >
        Your Profile
      </h1>
      <p
        className="mb-8"
        style={{
          color: 'var(--foreground)',
          opacity: 0.7,
          fontFamily: 'var(--font-body)',
        }}
      >
        Customize how you appear to readers.
      </p>

      <div className="space-y-8">
        {/* Avatar section */}
        <div
          className="p-6 rounded-lg border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h2
            className="text-lg font-bold mb-4"
            style={{
              color: 'var(--foreground)',
              fontFamily: 'var(--font-kindergarten)',
            }}
          >
            Profile Photo
          </h2>
          <div className="flex items-center gap-6">
            {/* Current avatar */}
            <div className="relative">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold overflow-hidden"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--background)',
                }}
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(profile.display_name || 'User')
                )}
              </div>
              {profile.avatar_url && (
                <button
                  type="button"
                  onClick={handleAvatarRemove}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white
                             flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                  title="Remove avatar"
                  aria-label="Remove avatar"
                >
                  ×
                </button>
              )}
            </div>

            {/* Upload */}
            <div className="flex-1">
              <MediaUploader
                mediaType="image"
                onUploadComplete={handleAvatarUpload}
                maxSize={5 * 1024 * 1024} // 5MB
              />
              <p className="text-xs mt-2" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                JPG, PNG, GIF or WebP. Max 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Basic info */}
        <div
          className="p-6 rounded-lg border space-y-4"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h2
            className="text-lg font-bold"
            style={{
              color: 'var(--foreground)',
              fontFamily: 'var(--font-kindergarten)',
            }}
          >
            Basic Information
          </h2>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="display_name"
                className="block text-sm font-medium"
                style={{ color: 'var(--foreground)' }}
              >
                Display Name
              </label>
              <span className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                {profile.display_name?.length || 0}/50
              </span>
            </div>
            <input
              id="display_name"
              type="text"
              value={profile.display_name}
              onChange={(e) => updateField('display_name', e.target.value)}
              onBlur={() => validateField('display_name', profile.display_name)}
              placeholder="Your name as it appears to readers"
              maxLength={50}
              className={`w-full p-3 rounded-lg border ${errors.display_name ? 'border-red-500' : ''}`}
              style={{
                background: 'var(--background)',
                borderColor: errors.display_name ? undefined : 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
            {errors.display_name && (
              <p className="text-red-500 text-xs mt-1">{errors.display_name}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="username"
                className="block text-sm font-medium"
                style={{ color: 'var(--foreground)' }}
              >
                Username
              </label>
              <span className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                {profile.username?.length || 0}/30
              </span>
            </div>
            <div className="flex">
              <span
                className="px-3 py-3 rounded-l-lg border border-r-0 text-sm"
                style={{
                  background: 'var(--surface-elevated)',
                  borderColor: errors.username ? 'rgb(239 68 68)' : 'var(--border)',
                  color: 'var(--foreground)',
                  opacity: 0.6,
                }}
              >
                scroungers.media/
              </span>
              <input
                id="username"
                type="text"
                value={profile.username}
                onChange={(e) =>
                  updateField('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                }
                onBlur={() => validateField('username', profile.username)}
                placeholder="username"
                maxLength={30}
                className={`flex-1 p-3 rounded-r-lg border ${errors.username ? 'border-red-500' : ''}`}
                style={{
                  background: 'var(--background)',
                  borderColor: errors.username ? undefined : 'var(--border)',
                  color: 'var(--foreground)',
                }}
              />
            </div>
            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="bio"
                className="block text-sm font-medium"
                style={{ color: 'var(--foreground)' }}
              >
                Bio
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowBioPreview(!showBioPreview)}
                  className="text-xs px-2 py-1 rounded"
                  aria-label={showBioPreview ? 'Switch to edit mode' : 'Preview bio'}
                  style={{
                    background: showBioPreview ? 'var(--primary)' : 'var(--surface-elevated)',
                    color: showBioPreview ? 'var(--background)' : 'var(--foreground)',
                  }}
                >
                  {showBioPreview ? 'Edit' : 'Preview'}
                </button>
                <span
                  className={`text-xs ${(profile.bio?.length || 0) > 450 ? 'text-red-500' : ''}`}
                  style={{
                    color: (profile.bio?.length || 0) > 450 ? undefined : 'var(--foreground)',
                    opacity: 0.6,
                  }}
                >
                  {profile.bio?.length || 0}/500
                </span>
              </div>
            </div>
            {showBioPreview ? (
              <div
                className="w-full p-3 rounded-lg border min-h-[120px] prose prose-sm dark:prose-invert"
                style={{
                  background: 'var(--background)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                {profile.bio || <span style={{ opacity: 0.5 }}>No bio yet...</span>}
              </div>
            ) : (
              <textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => updateField('bio', e.target.value)}
                onBlur={() => validateField('bio', profile.bio || '')}
                placeholder="Tell readers about yourself..."
                rows={4}
                maxLength={500}
                className={`w-full p-3 rounded-lg border resize-none ${errors.bio ? 'border-red-500' : ''}`}
                style={{
                  background: 'var(--background)',
                  borderColor: errors.bio ? undefined : 'var(--border)',
                  color: 'var(--foreground)',
                }}
              />
            )}
            {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio}</p>}
          </div>

          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Location
            </label>
            <input
              id="location"
              type="text"
              value={profile.location}
              onChange={(e) => updateField('location', e.target.value)}
              onBlur={() => validateField('location', profile.location || '')}
              placeholder="City, Country"
              maxLength={100}
              className={`w-full p-3 rounded-lg border ${errors.location ? 'border-red-500' : ''}`}
              style={{
                background: 'var(--background)',
                borderColor: errors.location ? undefined : 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
            {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
          </div>
        </div>

        {/* Social links */}
        <div
          className="p-6 rounded-lg border space-y-4"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h2
            className="text-lg font-bold"
            style={{
              color: 'var(--foreground)',
              fontFamily: 'var(--font-kindergarten)',
            }}
          >
            Links & Social
          </h2>

          <div>
            <label
              htmlFor="website_url"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Website
            </label>
            <input
              id="website_url"
              type="url"
              value={profile.website_url}
              onChange={(e) => updateField('website_url', e.target.value)}
              onBlur={() => validateField('website_url', profile.website_url || '')}
              placeholder="https://yourwebsite.com"
              className={`w-full p-3 rounded-lg border ${errors.website_url ? 'border-red-500' : ''}`}
              style={{
                background: 'var(--background)',
                borderColor: errors.website_url ? undefined : 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
            {errors.website_url && (
              <p className="text-red-500 text-xs mt-1">{errors.website_url}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="twitter_handle"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Twitter/X Handle
            </label>
            <div className="flex">
              <span
                className="px-3 py-3 rounded-l-lg border border-r-0 text-sm"
                style={{
                  background: 'var(--surface-elevated)',
                  borderColor: errors.twitter_handle ? 'rgb(239 68 68)' : 'var(--border)',
                  color: 'var(--foreground)',
                  opacity: 0.6,
                }}
              >
                @
              </span>
              <input
                id="twitter_handle"
                type="text"
                value={profile.twitter_handle}
                onChange={(e) => updateField('twitter_handle', e.target.value.replace('@', ''))}
                onBlur={() => validateField('twitter_handle', profile.twitter_handle || '')}
                placeholder="username"
                maxLength={15}
                className={`flex-1 p-3 rounded-r-lg border ${errors.twitter_handle ? 'border-red-500' : ''}`}
                style={{
                  background: 'var(--background)',
                  borderColor: errors.twitter_handle ? undefined : 'var(--border)',
                  color: 'var(--foreground)',
                }}
              />
            </div>
            {errors.twitter_handle && (
              <p className="text-red-500 text-xs mt-1">{errors.twitter_handle}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="github_username"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              GitHub Username
            </label>
            <div className="flex">
              <span
                className="px-3 py-3 rounded-l-lg border border-r-0 text-sm"
                style={{
                  background: 'var(--surface-elevated)',
                  borderColor: errors.github_username ? 'rgb(239 68 68)' : 'var(--border)',
                  color: 'var(--foreground)',
                  opacity: 0.6,
                }}
              >
                github.com/
              </span>
              <input
                id="github_username"
                type="text"
                value={profile.github_username}
                onChange={(e) => updateField('github_username', e.target.value)}
                onBlur={() => validateField('github_username', profile.github_username || '')}
                placeholder="username"
                maxLength={39}
                className={`flex-1 p-3 rounded-r-lg border ${errors.github_username ? 'border-red-500' : ''}`}
                style={{
                  background: 'var(--background)',
                  borderColor: errors.github_username ? undefined : 'var(--border)',
                  color: 'var(--foreground)',
                }}
              />
            </div>
            {errors.github_username && (
              <p className="text-red-500 text-xs mt-1">{errors.github_username}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="linkedin_url"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              LinkedIn URL
            </label>
            <input
              id="linkedin_url"
              type="url"
              value={profile.linkedin_url}
              onChange={(e) => updateField('linkedin_url', e.target.value)}
              onBlur={() => validateField('linkedin_url', profile.linkedin_url || '')}
              placeholder="https://linkedin.com/in/username"
              className={`w-full p-3 rounded-lg border ${errors.linkedin_url ? 'border-red-500' : ''}`}
              style={{
                background: 'var(--background)',
                borderColor: errors.linkedin_url ? undefined : 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
            {errors.linkedin_url && (
              <p className="text-red-500 text-xs mt-1">{errors.linkedin_url}</p>
            )}
          </div>
        </div>

        {/* Ko-fi */}
        <div
          className="p-6 rounded-lg border"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--secondary)',
          }}
        >
          <h2
            className="text-lg font-bold mb-2"
            style={{
              color: 'var(--secondary)',
              fontFamily: 'var(--font-kindergarten)',
            }}
          >
            ☕ Ko-fi Donations
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            Add your Ko-fi username to receive donations directly from readers. You keep 100% of all
            tips.
          </p>
          <label
            htmlFor="kofi_username"
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--foreground)' }}
          >
            Ko-fi Username
          </label>
          <div className="flex">
            <span
              className="px-3 py-3 rounded-l-lg border border-r-0 text-sm"
              style={{
                background: 'var(--surface-elevated)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
                opacity: 0.6,
              }}
            >
              ko-fi.com/
            </span>
            <input
              id="kofi_username"
              type="text"
              value={profile.kofi_username}
              onChange={(e) => updateField('kofi_username', e.target.value)}
              onBlur={() => validateField('kofi_username', profile.kofi_username || '')}
              placeholder="your-username"
              className={`flex-1 p-3 rounded-r-lg border ${errors.kofi_username ? 'border-red-500' : ''}`}
              style={{
                background: 'var(--background)',
                borderColor: errors.kofi_username ? undefined : 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>
          {errors.kofi_username && (
            <p className="text-red-500 text-xs mt-1">{errors.kofi_username}</p>
          )}
        </div>

        {/* Save button */}
        <div
          className="flex items-center justify-between pt-6 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <Link
            href={`/contributors/${profile.username}`}
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            View public profile →
          </Link>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !isValid}
            className="px-8 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--primary)', color: 'var(--background)' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

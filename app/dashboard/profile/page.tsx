'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { getInitials } from '@/lib/utils';
import MediaUploader from '@/app/components/media/MediaUploader';

export default function ProfilePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    display_name: '',
    username: '',
    bio: '',
    website_url: '',
    twitter_handle: '',
    kofi_username: '',
    avatar_url: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfile({
            display_name: data.display_name || '',
            username: data.username || '',
            bio: data.bio || '',
            website_url: data.website_url || '',
            twitter_handle: data.twitter_handle || '',
            kofi_username: data.kofi_username || '',
            avatar_url: data.avatar_url || '',
          });
        }
      }
      setLoading(false);
    };
    
    void loadProfile();
  }, [supabase]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name,
          username: profile.username,
          bio: profile.bio,
          website_url: profile.website_url,
          twitter_handle: profile.twitter_handle,
          kofi_username: profile.kofi_username,
          avatar_url: profile.avatar_url,
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
    setProfile({ ...profile, avatar_url: media.url });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl" style={{ color: 'var(--foreground)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--primary)' }}
      >
        Your Profile
      </h1>
      <p className="mb-8" style={{ color: 'var(--foreground)', opacity: 0.7, fontFamily: 'var(--font-body)' }}>
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
            style={{ color: 'var(--foreground)', fontFamily: 'var(--font-kindergarten)' }}
          >
            Profile Photo
          </h2>
          <div className="flex items-center gap-6">
            {/* Current avatar */}
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold overflow-hidden"
              style={{ background: 'var(--primary)', color: 'var(--background)' }}
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

            {/* Upload */}
            <div className="flex-1">
              <MediaUploader
                mediaType="image"
                onUploadComplete={handleAvatarUpload}
                maxSize={5 * 1024 * 1024} // 5MB
              />
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
            style={{ color: 'var(--foreground)', fontFamily: 'var(--font-kindergarten)' }}
          >
            Basic Information
          </h2>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Display Name
            </label>
            <input
              type="text"
              value={profile.display_name}
              onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
              placeholder="Your name as it appears to readers"
              className="w-full p-3 rounded-lg border"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Username
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
                scroungers.media/
              </span>
              <input
                type="text"
                value={profile.username}
                onChange={(e) =>
                  setProfile({ ...profile, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })
                }
                placeholder="username"
                className="flex-1 p-3 rounded-r-lg border"
                style={{
                  background: 'var(--background)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              />
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Bio
            </label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell readers about yourself..."
              rows={4}
              className="w-full p-3 rounded-lg border resize-none"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>
        </div>

        {/* Social links */}
        <div
          className="p-6 rounded-lg border space-y-4"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h2
            className="text-lg font-bold"
            style={{ color: 'var(--foreground)', fontFamily: 'var(--font-kindergarten)' }}
          >
            Links & Social
          </h2>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Website
            </label>
            <input
              type="url"
              value={profile.website_url}
              onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
              placeholder="https://yourwebsite.com"
              className="w-full p-3 rounded-lg border"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          <div>
            <label
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
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  opacity: 0.6,
                }}
              >
                @
              </span>
              <input
                type="text"
                value={profile.twitter_handle}
                onChange={(e) =>
                  setProfile({ ...profile, twitter_handle: e.target.value.replace('@', '') })
                }
                placeholder="username"
                className="flex-1 p-3 rounded-r-lg border"
                style={{
                  background: 'var(--background)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Ko-fi */}
        <div
          className="p-6 rounded-lg border"
          style={{ background: 'var(--surface)', borderColor: 'var(--secondary)' }}
        >
          <h2
            className="text-lg font-bold mb-2"
            style={{ color: 'var(--secondary)', fontFamily: 'var(--font-kindergarten)' }}
          >
            ☕ Ko-fi Donations
          </h2>
          <p
            className="text-sm mb-4"
            style={{ color: 'var(--foreground)', opacity: 0.7 }}
          >
            Add your Ko-fi username to receive donations directly from readers. You keep 100% of all tips.
          </p>
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
              type="text"
              value={profile.kofi_username}
              onChange={(e) => setProfile({ ...profile, kofi_username: e.target.value })}
              placeholder="your-username"
              className="flex-1 p-3 rounded-r-lg border"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-8 py-3 rounded-lg font-medium"
            style={{ background: 'var(--primary)', color: 'var(--background)' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}




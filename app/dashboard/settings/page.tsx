"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { profile, updateProfile, updatePassword, loading } = useAuth();
  const [saving, setSaving] = useState(false);
  
  // Profile settings
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [kofiUsername, setKofiUsername] = useState("");

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
      setWebsiteUrl(profile.website_url || "");
      setTwitterHandle(profile.twitter_handle || "");
      setKofiUsername(profile.kofi_username || "");
    }
  }, [profile]);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const { error } = await updateProfile({
        display_name: displayName,
        bio,
        location,
        website_url: websiteUrl || null,
        twitter_handle: twitterHandle || null,
        kofi_username: kofiUsername || null,
      });

      if (error) throw error;
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw error;
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Password change error:", error);
      toast.error("Failed to update password");
    } finally {
      setChangingPassword(false);
    }
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

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl sm:text-3xl font-bold"
          style={{
            fontFamily: "var(--font-kindergarten)",
            color: "var(--primary)",
          }}
        >
          Settings
        </h1>
        <p
          className="text-sm sm:text-base mt-1"
          style={{
            color: "var(--foreground)",
            opacity: 0.7,
            fontFamily: "var(--font-body)",
          }}
        >
          Manage your account preferences.
        </p>
      </div>

      {/* Profile Settings */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2
          className="text-lg font-bold mb-6"
          style={{
            fontFamily: "var(--font-kindergarten)",
            color: "var(--foreground)",
          }}
        >
          Profile Information
        </h2>

        <div className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{
                background: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-lg border resize-none"
              style={{
                background: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
              placeholder="Tell readers about yourself..."
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{
                background: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
              placeholder="City, Country"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Website URL
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{
                background: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Twitter/X Handle
            </label>
            <div className="flex">
              <span
                className="px-3 py-3 rounded-l-lg border border-r-0"
                style={{
                  background: "var(--surface-elevated)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  opacity: 0.7,
                }}
              >
                @
              </span>
              <input
                type="text"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value)}
                className="flex-1 p-3 rounded-r-lg border"
                style={{
                  background: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
                placeholder="username"
              />
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--secondary)" }}
            >
              ☕ Ko-fi Username
            </label>
            <input
              type="text"
              value={kofiUsername}
              onChange={(e) => setKofiUsername(e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{
                background: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
              placeholder="Your Ko-fi username"
            />
            <p
              className="text-xs mt-1"
              style={{ color: "var(--foreground)", opacity: 0.6 }}
            >
              Your Ko-fi donation button will appear on your posts.
            </p>
          </div>

          <button
            onClick={() => void handleProfileSave()}
            disabled={saving}
            className="w-full py-3 rounded-lg font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{
              background: "var(--primary)",
              color: "var(--background)",
              boxShadow: "0 0 20px var(--glow-primary)",
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Password Settings */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2
          className="text-lg font-bold mb-6"
          style={{
            fontFamily: "var(--font-kindergarten)",
            color: "var(--foreground)",
          }}
        >
          Change Password
        </h2>

        <div className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{
                background: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{
                background: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 rounded-lg border"
              style={{
                background: "var(--background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          <button
            onClick={() => void handlePasswordChange()}
            disabled={changingPassword || !newPassword || !confirmPassword}
            className="w-full py-3 rounded-lg font-medium border transition-all hover:bg-[var(--surface-elevated)] disabled:opacity-50"
            style={{
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          >
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: "var(--surface)", borderColor: "var(--accent)" }}
      >
        <h2
          className="text-lg font-bold mb-4"
          style={{
            fontFamily: "var(--font-kindergarten)",
            color: "var(--accent)",
          }}
        >
          Danger Zone
        </h2>
        <p
          className="text-sm mb-4"
          style={{ color: "var(--foreground)", opacity: 0.7 }}
        >
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          className="px-6 py-2 rounded-lg font-medium border transition-all hover:bg-[var(--accent)] hover:text-[var(--background)]"
          style={{
            borderColor: "var(--accent)",
            color: "var(--accent)",
          }}
          onClick={() => toast.error("Please contact support to delete your account")}
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}

/**
 * Follow Button Component
 * Phase 1.1.5: Follow/unfollow button with optimistic updates
 */

'use client';

import { useCallback, useState } from 'react';

const UserPlusIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
);

const UserMinusIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
  </svg>
);

export type FollowType = 'user' | 'category' | 'tag';

interface FollowButtonProps {
  type: FollowType;
  id: string;
  initialFollowing?: boolean;
  onFollowChange?: (following: boolean) => void;
  className?: string;
}

export function FollowButton({
  type,
  id,
  initialFollowing = false,
  onFollowChange,
  className = '',
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const handleToggle = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    const optimisticFollowing = !following;
    setFollowing(optimisticFollowing);

    try {
      const res = await fetch('/api/follows/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          following_type: type,
          following_id: id,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to toggle follow');
      }

      const data = await res.json();
      setFollowing(data.isFollowing);
      onFollowChange?.(data.isFollowing);
    } catch (error) {
      // Revert optimistic update
      setFollowing(following);
      console.error('Error toggling follow:', error);
    } finally {
      setLoading(false);
    }
  }, [type, id, following, loading, onFollowChange]);

  return (
    <button
      onClick={() => void handleToggle()}
      disabled={loading}
      className={`
        inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${
          following
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }
        ${className}
      `}
      aria-label={following ? 'Unfollow' : 'Follow'}
    >
      {following ? (
        <>
          <UserMinusIcon className="w-4 h-4" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlusIcon className="w-4 h-4" />
          <span>Follow</span>
        </>
      )}
    </button>
  );
}

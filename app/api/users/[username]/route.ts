import { NextRequest } from 'next/server';
import { success, handleApiError } from '@/lib/api';
import { getProfileByUsername, getPublicProfile, getPostsByAuthor } from '@/lib/db';

interface RouteContext {
  params: Promise<{ username: string }>;
}

// ============================================================================
// GET /api/users/[username] - Get public profile by username
// ============================================================================
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { username } = await context.params;

    // Get the profile
    const profile = await getProfileByUsername(username);

    // Get public version only
    const publicProfile = await getPublicProfile(profile.id);

    // Get recent published posts
    const { posts: recentPosts } = await getPostsByAuthor(profile.id, {
      status: 'published',
      limit: 5,
    });

    return success({
      ...publicProfile,
      recentPosts,
    });
  } catch (err) {
    return handleApiError(err);
  }
}







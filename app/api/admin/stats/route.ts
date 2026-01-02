export const runtime = 'edge';

import { createClient } from '@/lib/supabase/server';
import { success, handleApiError, requireEditor } from '@/lib/api';
import { getApplicationStats } from '@/lib/db';

// ============================================================================
// GET /api/admin/stats - Get admin dashboard statistics
// ============================================================================
export async function GET() {
  try {
    await requireEditor();

    const supabase = await createClient();

    // Get counts in parallel
    const [
      { count: totalUsers },
      { count: totalPosts },
      { count: publishedPosts },
      { count: pendingPosts },
      { count: totalComments },
      { count: totalViews },
      { count: contributors },
      applicationStats,
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('comments').select('*', { count: 'exact', head: true }),
      supabase.from('post_views').select('*', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['contributor', 'editor', 'admin']),
      getApplicationStats(),
    ]);

    // Get recent activity
    const { data: recentPosts } = await supabase
      .from('posts')
      .select(
        `
        id,
        title,
        status,
        created_at,
        author:profiles!posts_author_id_fkey (
          username,
          display_name
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentComments } = await supabase
      .from('comments')
      .select(
        `
        id,
        content,
        created_at,
        author:profiles!comments_author_id_fkey (
          username,
          display_name
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentUsers } = await supabase
      .from('profiles')
      .select('id, username, display_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    return success({
      overview: {
        totalUsers: totalUsers || 0,
        contributors: contributors || 0,
        totalPosts: totalPosts || 0,
        publishedPosts: publishedPosts || 0,
        pendingPosts: pendingPosts || 0,
        totalComments: totalComments || 0,
        totalViews: totalViews || 0,
      },
      applications: applicationStats,
      recentActivity: {
        posts: recentPosts || [],
        comments: recentComments || [],
        users: recentUsers || [],
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

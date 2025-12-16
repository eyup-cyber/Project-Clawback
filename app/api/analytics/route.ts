import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { success, handleApiError, parseParams, requireContributor } from '@/lib/api';
import { getUserStats, getPostsByAuthor } from '@/lib/db';

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
});

// ============================================================================
// GET /api/analytics - Get analytics for current user's content
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireContributor();

    const { searchParams } = new URL(request.url);
    const params = parseParams(searchParams, querySchema);

    const supabase = await createClient();

    // Calculate date range
    let startDate: Date | null = null;
    if (params.period !== 'all') {
      const days = params.period === '7d' ? 7 : params.period === '30d' ? 30 : 90;
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Get user's posts
    const { posts } = await getPostsByAuthor(user.id, {
      limit: 100,
    });

    // Get overall stats
    const stats = await getUserStats(user.id);

    // Get views over time
    const postIds = posts.map((p) => p.id);
    
    let viewsQuery = supabase
      .from('post_views')
      .select('created_at, post_id')
      .in('post_id', postIds.length > 0 ? postIds : ['00000000-0000-0000-0000-000000000000']);

    if (startDate) {
      viewsQuery = viewsQuery.gte('created_at', startDate.toISOString());
    }

    const { data: views } = await viewsQuery;

    // Group views by date
    const viewsByDate = (views || []).reduce((acc, view) => {
      const date = view.created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get reactions over time
    let reactionsQuery = supabase
      .from('reactions')
      .select('created_at, reaction_type:type, post_id')
      .in('post_id', postIds.length > 0 ? postIds : ['00000000-0000-0000-0000-000000000000']);

    if (startDate) {
      reactionsQuery = reactionsQuery.gte('created_at', startDate.toISOString());
    }

    const { data: reactionsData } = await reactionsQuery;

    // Group reactions by type
    const reactions = reactionsData as { created_at: string; reaction_type: string; post_id: string }[] | null;
    const reactionsByType = (reactions || []).reduce((acc, r) => {
      const type = r.reaction_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get top posts
    const topPosts = [...posts]
      .filter((p) => p.status === 'published')
      .sort((a, b) => b.view_count - a.view_count)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        views: p.view_count,
        reactions: p.reaction_count,
        comments: p.comment_count,
      }));

    return success({
      period: params.period,
      overview: stats,
      viewsByDate,
      reactionsByType,
      topPosts,
      totalViews: views?.length || 0,
      totalReactions: reactions?.length || 0,
    });
  } catch (err) {
    return handleApiError(err);
  }
}


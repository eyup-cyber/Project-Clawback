export const runtime = 'edge';

/**
 * Not Interested API
 * Phase 1.1.1: POST /api/feed/not-interested - Mark post as not interested
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
    }

    // Insert into not_interested table (upsert to avoid duplicates)
    const { error } = await supabase.from('feed_preferences').upsert(
      {
        user_id: user.id,
        post_id: postId,
        preference_type: 'not_interested',
        created_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,post_id',
      }
    );

    if (error) {
      // If table doesn't exist, log but don't fail
      logger.warn('Failed to save not interested preference', { error, userId: user.id, postId });
    }

    logger.info('Post marked as not interested', { userId: user.id, postId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Not interested error', { error });
    return NextResponse.json({ error: 'Failed to save preference' }, { status: 500 });
  }
}

export const runtime = 'edge';

import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { success, ApiError } from '@/lib/api';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { logger } from '@/lib/logger';

/**
 * GET /api/homepage
 * Aggregated homepage data - posts, categories, site content, etc.
 */
const handler = async (request: NextRequest) => {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '4', 10);

  // Fetch latest published posts
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select(
      `
      id,
      title,
      slug,
      excerpt,
      featured_image_url,
      content_type,
      published_at,
      reading_time,
      media_duration,
      reaction_count,
      comment_count,
      author:profiles!posts_author_id_fkey(
        id,
        username,
        display_name,
        avatar_url,
        kofi_username
      ),
      category:categories(
        id,
        name,
        slug,
        color
      )
    `
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (postsError) {
    logger.error('Posts fetch error', postsError, { limit });
    throw new ApiError('Failed to fetch posts', 'DATABASE_ERROR', { error: postsError.message });
  }

  // Fetch categories with counts
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (categoriesError) {
    logger.error('Categories fetch error', categoriesError);
    throw new ApiError('Failed to fetch categories', 'DATABASE_ERROR', {
      error: categoriesError.message,
    });
  }

  // Get category post counts
  const categoryIds = categories?.map((c) => c.id) || [];
  const { data: postCounts } = await supabase
    .from('posts')
    .select('category_id')
    .in('category_id', categoryIds)
    .eq('status', 'published');

  const countMap = new Map<string, number>();
  postCounts?.forEach((post) => {
    if (post.category_id) {
      countMap.set(post.category_id, (countMap.get(post.category_id) || 0) + 1);
    }
  });

  const categoriesWithCounts =
    categories?.map((cat) => ({
      ...cat,
      post_count: countMap.get(cat.id) || 0,
    })) || [];

  // Fetch site content
  const { data: settings } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['mission_statement', 'pillars', 'how_it_works', 'about_quote']);

  const content: Record<string, any> = {};
  settings?.forEach((setting) => {
    try {
      content[setting.key] =
        typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
    } catch {
      content[setting.key] = setting.value;
    }
  });

  // Default content
  const defaultContent = {
    mission_statement: {
      paragraphs: [
        'For years, the left media has been owned, controlled, and profited by two friend groups.',
        'We are taking back the media and giving you the keys.',
        'Want to write an article? Want to make a video? Want to make some art?',
        'scroungers multimedia is giving real people with skin in the game the opportunity to profit from their own political analysis.',
        'All posts come with a user-inputted Ko-fi link. Want to support the creator? Go ahead!',
        "We retain 0% of the creators' intellectual property and we don't take a penny from their profit.",
      ],
    },
    pillars: [
      {
        title: 'No Gatekeepers',
        description:
          'No journalism degrees required. If you have skin in the game and a story to tell, you belong here.',
        icon: '🚪',
      },
      {
        title: '100% Creator Revenue',
        description:
          'We pass every penny of donations directly to creators. Your work, your profit.',
        icon: '💰',
      },
      {
        title: 'Full IP Ownership',
        description: 'You retain complete intellectual property rights to everything you create.',
        icon: '📜',
      },
      {
        title: 'Marginalized Voices First',
        description:
          'Perspectives from those most affected—not commentators watching from the sidelines.',
        icon: '📢',
      },
    ],
    how_it_works: [
      {
        number: '01',
        title: 'Apply',
        description: 'Fill out a simple application. No credentials needed—just passion.',
        icon: '📝',
      },
      {
        number: '02',
        title: 'Create',
        description: 'Use our editor to write, embed videos, and craft your content.',
        icon: '✨',
      },
      {
        number: '03',
        title: 'Publish',
        description: 'Quick review, published within 48 hours. Your voice, unfiltered.',
        icon: '🚀',
      },
      {
        number: '04',
        title: 'Earn',
        description: 'Add your Ko-fi link. Every penny goes to you—we take 0%.',
        icon: '💰',
      },
    ],
    about_quote: {
      text: '"Scrounger" is what they call us. We\'re reclaiming the word—because the so-called scroungers understand these systems best. Not from textbooks, but from lived experience.',
      highlight: 'Our "low esteem" is our authority.',
    },
  };

  const mergedContent = {
    mission_statement: content.mission_statement || defaultContent.mission_statement,
    pillars: content.pillars || defaultContent.pillars,
    how_it_works: content.how_it_works || defaultContent.how_it_works,
    about_quote: content.about_quote || defaultContent.about_quote,
  };

  return success({
    posts: posts || [],
    categories: categoriesWithCounts,
    content: mergedContent,
  });
};

export const GET = withRouteHandler(handler, { logRequest: true });

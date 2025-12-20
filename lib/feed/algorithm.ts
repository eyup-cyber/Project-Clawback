/**
 * Personalized Feed Algorithm
 * Phase 3.2.1: Relevance scoring and feed generation
 */

import { createClient } from '@/lib/supabase/server';

export interface FeedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  reading_time: number | null;
  published_at: string;
  view_count: number;
  reaction_count: number;
  comment_count: number;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
  } | null;
  tags: Array<{ id: string; name: string; slug: string }>;
  relevance_score?: number;
}

export interface FeedOptions {
  userId: string;
  page?: number;
  limit?: number;
  excludeRead?: boolean;
  category?: string;
  tag?: string;
  author?: string;
}

export interface FeedResult {
  posts: FeedPost[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Calculate relevance score for a post based on user preferences
 */
function calculateRelevanceScore(
  post: FeedPost,
  userPreferences: {
    followedAuthors: Set<string>;
    followedCategories: Set<string>;
    followedTags: Set<string>;
    readingHistory: Set<string>;
  }
): number {
  let score = 0;

  // Factor 1: Recency (exponential decay - posts from last 7 days get higher scores)
  const postDate = new Date(post.published_at);
  const daysSincePublish = (Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 1 - daysSincePublish / 7); // Decay over 7 days
  score += recencyScore * 30; // 30% weight

  // Factor 2: Followed author boost
  if (userPreferences.followedAuthors.has(post.author.id)) {
    score += 50; // Strong boost for followed authors
  }

  // Factor 3: Followed category boost
  if (post.category && userPreferences.followedCategories.has(post.category.id)) {
    score += 30;
  }

  // Factor 4: Followed tag boost
  const matchedTags = post.tags.filter((t) => userPreferences.followedTags.has(t.id));
  score += matchedTags.length * 15; // 15 points per matched tag

  // Factor 5: Engagement score (log scale to prevent extreme values)
  const engagement = post.reaction_count + post.comment_count * 2 + post.view_count / 10;
  score += Math.log(engagement + 1) * 10;

  // Factor 6: Not read yet bonus
  if (!userPreferences.readingHistory.has(post.id)) {
    score += 20; // Bonus for unread content
  }

  // Factor 7: Reading time preference (prefer shorter articles < 5 min, medium 5-15 min)
  if (post.reading_time) {
    if (post.reading_time <= 5) {
      score += 10; // Quick reads
    } else if (post.reading_time <= 15) {
      score += 15; // Optimal length
    } else if (post.reading_time > 30) {
      score -= 5; // Very long articles slightly penalized
    }
  }

  return score;
}

/**
 * Get personalized feed posts
 */
export async function getFeedPosts(options: FeedOptions): Promise<FeedResult> {
  const { userId, page = 1, limit = 20, excludeRead = false, category, tag, author } = options;

  const supabase = await createClient();
  const offset = (page - 1) * limit;

  // Get user preferences
  const [
    { data: followedAuthors },
    { data: followedCategories },
    { data: followedTags },
    { data: readingHistory },
  ] = await Promise.all([
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('following_type', 'user'),
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('following_type', 'category'),
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('following_type', 'tag'),
    excludeRead
      ? supabase.from('reading_history').select('post_id').eq('user_id', userId)
      : Promise.resolve({ data: [] }),
  ]);

  const userPreferences = {
    followedAuthors: new Set((followedAuthors || []).map((f) => f.following_id)),
    followedCategories: new Set((followedCategories || []).map((f) => f.following_id)),
    followedTags: new Set((followedTags || []).map((f) => f.following_id)),
    readingHistory: new Set((readingHistory || []).map((h) => h.post_id)),
  };

  // Build query
  let query = supabase
    .from('posts')
    .select(
      `
      id,
      title,
      slug,
      excerpt,
      featured_image_url,
      reading_time,
      published_at,
      view_count,
      reaction_count,
      comment_count,
      author:profiles!posts_author_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      ),
      category:categories!posts_category_id_fkey(
        id,
        name,
        slug,
        color
      ),
      tags:post_tags(
        tag:tags(
          id,
          name,
          slug
        )
      )
    `,
      { count: 'exact' }
    )
    .eq('status', 'published');

  // Apply filters
  if (category) {
    query = query.eq('category.slug', category);
  }

  if (author) {
    query = query.eq('author.username', author);
  }

  if (excludeRead && userPreferences.readingHistory.size > 0) {
    const readIds = Array.from(userPreferences.readingHistory);
    query = query.not('id', 'in', `(${readIds.join(',')})`);
  }

  // Get all posts first for scoring (limit to reasonable number for performance)
  const maxFetch = Math.min(limit * 3, 100); // Fetch 3x to sort, but cap at 100
  query = query.order('published_at', { ascending: false }).range(0, maxFetch - 1);

  const { data: allPosts, count, error } = await query;

  if (error) throw error;
  if (!allPosts || allPosts.length === 0) {
    return {
      posts: [],
      total: 0,
      page,
      totalPages: 0,
      hasMore: false,
    };
  }

  // Process tags (flatten nested structure)
  const posts: FeedPost[] = (allPosts || []).map((post: any) => ({
    ...post,
    tags: (post.tags || []).map((pt: any) => pt.tag).filter(Boolean),
  }));

  // Filter by tag if specified
  let filteredPosts = posts;
  if (tag) {
    filteredPosts = posts.filter((post) => post.tags.some((t) => t.slug === tag));
  }

  // Calculate relevance scores
  const scoredPosts = filteredPosts.map((post) => ({
    ...post,
    relevance_score: calculateRelevanceScore(post, userPreferences),
  }));

  // Sort by relevance score
  scoredPosts.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

  // Apply diversity factor (limit same author to max 2 consecutive)
  const diversifiedPosts: FeedPost[] = [];
  const authorCounts = new Map<string, number>();
  const maxConsecutiveSameAuthor = 2;

  for (const post of scoredPosts) {
    const authorId = post.author.id;
    const count = authorCounts.get(authorId) || 0;

    // Check if we've already included too many from this author recently
    const recentAuthorPosts = diversifiedPosts
      .slice(-maxConsecutiveSameAuthor)
      .filter((p) => p.author.id === authorId).length;

    if (recentAuthorPosts < maxConsecutiveSameAuthor) {
      diversifiedPosts.push(post);
      authorCounts.set(authorId, count + 1);

      if (diversifiedPosts.length >= limit * page) {
        break; // We have enough for this page
      }
    } else {
      // Skip this post, but keep it in the list for later
      // (in a real implementation, you'd have a more sophisticated diversity algorithm)
    }
  }

  // Paginate
  const start = offset;
  const end = offset + limit;
  const paginatedPosts = diversifiedPosts.slice(start, end);

  const total = Math.min(count || 0, diversifiedPosts.length);
  const totalPages = Math.ceil(total / limit);

  return {
    posts: paginatedPosts,
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Get trending posts (last 7 days, sorted by engagement)
 */
export async function getTrendingPosts(limit: number = 20): Promise<FeedPost[]> {
  const supabase = await createClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      id,
      title,
      slug,
      excerpt,
      featured_image_url,
      reading_time,
      published_at,
      view_count,
      reaction_count,
      comment_count,
      author:profiles!posts_author_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      ),
      category:categories!posts_category_id_fkey(
        id,
        name,
        slug,
        color
      ),
      tags:post_tags(
        tag:tags(
          id,
          name,
          slug
        )
      )
    `
    )
    .eq('status', 'published')
    .gte('published_at', sevenDaysAgo.toISOString())
    .order('reaction_count', { ascending: false })
    .order('comment_count', { ascending: false })
    .order('view_count', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((post: any) => ({
    ...post,
    tags: (post.tags || []).map((pt: any) => pt.tag).filter(Boolean),
  })) as FeedPost[];
}

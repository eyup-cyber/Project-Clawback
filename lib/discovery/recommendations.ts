/**
 * Content Recommendation Engine
 * Phase 47: Personalized and algorithmic content recommendations
 */

import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface RecommendedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  reading_time: number;
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
    color: string;
  } | null;
  tags: string[];
  score: number;
  reason: RecommendationReason;
}

export type RecommendationReason =
  | 'similar_content'
  | 'same_author'
  | 'same_category'
  | 'same_tags'
  | 'trending'
  | 'popular'
  | 'followed_author'
  | 'followed_category'
  | 'followed_tag'
  | 'reading_history'
  | 'collaborative'
  | 'editorial_pick';

export interface RecommendationContext {
  postId?: string;
  userId?: string;
  categoryId?: string;
  tagSlugs?: string[];
  excludeIds?: string[];
  limit?: number;
}

export interface RecommendationConfig {
  weights: {
    recency: number;
    popularity: number;
    engagement: number;
    relevance: number;
    personalization: number;
  };
  decayHalfLife: number; // Days for recency decay
  minScore: number;
  diversityFactor: number; // 0-1, higher = more diverse
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: RecommendationConfig = {
  weights: {
    recency: 0.2,
    popularity: 0.15,
    engagement: 0.15,
    relevance: 0.3,
    personalization: 0.2,
  },
  decayHalfLife: 7,
  minScore: 0.1,
  diversityFactor: 0.3,
};

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate recency score with exponential decay
 */
function calculateRecencyScore(publishedAt: Date, halfLifeDays: number): number {
  const now = new Date();
  const ageMs = now.getTime() - publishedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return 0.5 ** (ageDays / halfLifeDays);
}

/**
 * Calculate popularity score (normalized)
 */
function calculatePopularityScore(viewCount: number, maxViews: number): number {
  if (maxViews === 0) return 0;
  return Math.log10(viewCount + 1) / Math.log10(maxViews + 1);
}

/**
 * Calculate engagement score
 */
function calculateEngagementScore(
  reactionCount: number,
  commentCount: number,
  viewCount: number
): number {
  if (viewCount === 0) return 0;
  const engagementRate = (reactionCount + commentCount * 2) / viewCount;
  return Math.min(1, engagementRate * 10); // Cap at 1
}

/**
 * Calculate tag similarity score
 */
function calculateTagSimilarity(tags1: string[], tags2: string[]): number {
  if (tags1.length === 0 || tags2.length === 0) return 0;
  const set1 = new Set(tags1.map((t) => t.toLowerCase()));
  const set2 = new Set(tags2.map((t) => t.toLowerCase()));
  const intersection = new Set([...set1].filter((t) => set2.has(t)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size; // Jaccard similarity
}

// ============================================================================
// RECOMMENDATION STRATEGIES
// ============================================================================

/**
 * Get similar content recommendations
 */
export async function getSimilarContent(
  postId: string,
  limit: number = 5,
  config: RecommendationConfig = DEFAULT_CONFIG
): Promise<RecommendedPost[]> {
  const supabase = await createServiceClient();

  // Get source post
  const { data: sourcePost, error: sourceError } = await supabase
    .from('posts')
    .select('id, category_id, tags, author_id')
    .eq('id', postId)
    .single();

  if (sourceError || !sourcePost) {
    logger.error('[Recommendations] Source post not found', { postId });
    return [];
  }

  // Get candidate posts
  const { data: candidates, error: candidateError } = await supabase
    .from('posts')
    .select(
      `
      id, title, slug, excerpt, featured_image_url, reading_time,
      published_at, view_count, reaction_count, comment_count, tags,
      category_id, author_id,
      author:profiles!posts_author_id_fkey (id, username, display_name, avatar_url),
      category:categories (id, name, slug, color)
    `
    )
    .eq('status', 'published')
    .neq('id', postId)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(100);

  if (candidateError || !candidates) {
    logger.error('[Recommendations] Failed to get candidates', candidateError);
    return [];
  }

  // Score and rank candidates
  const maxViews = Math.max(...candidates.map((p) => p.view_count || 0), 1);

  const scoredCandidates = candidates.map((post) => {
    let score = 0;
    let reason: RecommendationReason = 'similar_content';

    // Same category boost
    if (post.category_id === sourcePost.category_id) {
      score += 0.3;
      reason = 'same_category';
    }

    // Tag similarity
    const tagSim = calculateTagSimilarity(sourcePost.tags || [], post.tags || []);
    score += tagSim * 0.4;
    if (tagSim > 0.3) {
      reason = 'same_tags';
    }

    // Same author (lower weight to encourage diversity)
    if (post.author_id === sourcePost.author_id) {
      score += 0.15;
      reason = 'same_author';
    }

    // Recency
    score +=
      calculateRecencyScore(new Date(post.published_at), config.decayHalfLife) *
      config.weights.recency;

    // Popularity
    score += calculatePopularityScore(post.view_count || 0, maxViews) * config.weights.popularity;

    // Engagement
    score +=
      calculateEngagementScore(
        post.reaction_count || 0,
        post.comment_count || 0,
        post.view_count || 0
      ) * config.weights.engagement;

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      featured_image_url: post.featured_image_url,
      reading_time: post.reading_time || 0,
      published_at: post.published_at,
      view_count: post.view_count || 0,
      reaction_count: post.reaction_count || 0,
      comment_count: post.comment_count || 0,
      author: (() => {
        const author = Array.isArray(post.author) ? post.author[0] : post.author;
        return (
          (author as unknown as RecommendedPost['author']) || {
            id: '',
            username: '',
            display_name: '',
            avatar_url: null,
          }
        );
      })(),
      category: (() => {
        const category = Array.isArray(post.category) ? post.category[0] : post.category;
        return (
          (category as unknown as RecommendedPost['category']) || {
            id: '',
            name: '',
            slug: '',
            color: '',
          }
        );
      })(),
      tags: post.tags || [],
      score,
      reason,
    };
  });

  // Filter and sort
  return scoredCandidates
    .filter((p) => p.score >= config.minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get personalized recommendations for a user
 */
export async function getPersonalizedRecommendations(
  userId: string,
  limit: number = 10,
  config: RecommendationConfig = DEFAULT_CONFIG
): Promise<RecommendedPost[]> {
  const supabase = await createServiceClient();

  // Get user's reading history, follows, and preferences
  const [readHistory, followedUsers, followedCategories, followedTags] = await Promise.all([
    supabase
      .from('reading_history')
      .select('post_id, progress, completed_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50),
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
  ]);

  const readPostIds = new Set((readHistory.data || []).map((r) => r.post_id));
  const followedUserIds = new Set((followedUsers.data || []).map((f) => f.following_id));
  const followedCategoryIds = new Set((followedCategories.data || []).map((f) => f.following_id));
  const followedTagIds = new Set((followedTags.data || []).map((f) => f.following_id));

  // Get candidate posts
  const { data: candidates, error } = await supabase
    .from('posts')
    .select(
      `
      id, title, slug, excerpt, featured_image_url, reading_time,
      published_at, view_count, reaction_count, comment_count, tags,
      category_id, author_id,
      author:profiles!posts_author_id_fkey (id, username, display_name, avatar_url),
      category:categories (id, name, slug, color)
    `
    )
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(200);

  if (error || !candidates) {
    logger.error('[Recommendations] Failed to get candidates', error);
    return [];
  }

  // Filter out already read posts
  const unreadCandidates = candidates.filter((p) => !readPostIds.has(p.id));

  // Score candidates
  const maxViews = Math.max(...unreadCandidates.map((p) => p.view_count || 0), 1);

  const scoredCandidates = unreadCandidates.map((post) => {
    let score = 0;
    let reason: RecommendationReason = 'popular';

    // Followed author boost
    if (followedUserIds.has(post.author_id)) {
      score += 0.4 * config.weights.personalization;
      reason = 'followed_author';
    }

    // Followed category boost
    if (post.category_id && followedCategoryIds.has(post.category_id)) {
      score += 0.3 * config.weights.personalization;
      reason = 'followed_category';
    }

    // Followed tags boost
    const matchingTags = (post.tags || []).filter((t: string) => followedTagIds.has(t));
    if (matchingTags.length > 0) {
      score +=
        (matchingTags.length / (post.tags?.length || 1)) * 0.25 * config.weights.personalization;
      reason = 'followed_tag';
    }

    // Recency
    score +=
      calculateRecencyScore(new Date(post.published_at), config.decayHalfLife) *
      config.weights.recency;

    // Popularity
    score += calculatePopularityScore(post.view_count || 0, maxViews) * config.weights.popularity;

    // Engagement
    score +=
      calculateEngagementScore(
        post.reaction_count || 0,
        post.comment_count || 0,
        post.view_count || 0
      ) * config.weights.engagement;

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      featured_image_url: post.featured_image_url,
      reading_time: post.reading_time || 0,
      published_at: post.published_at,
      view_count: post.view_count || 0,
      reaction_count: post.reaction_count || 0,
      comment_count: post.comment_count || 0,
      author: (() => {
        const author = Array.isArray(post.author) ? post.author[0] : post.author;
        return (
          (author as unknown as RecommendedPost['author']) || {
            id: '',
            username: '',
            display_name: '',
            avatar_url: null,
          }
        );
      })(),
      category: (() => {
        const category = Array.isArray(post.category) ? post.category[0] : post.category;
        return (
          (category as unknown as RecommendedPost['category']) || {
            id: '',
            name: '',
            slug: '',
            color: '',
          }
        );
      })(),
      tags: post.tags || [],
      score,
      reason,
    };
  });

  // Apply diversity: don't show too many from same author/category
  const diversified = applyDiversity(scoredCandidates, config.diversityFactor);

  return diversified.slice(0, limit);
}

/**
 * Get trending content
 */
export async function getTrendingContent(
  limit: number = 10,
  timeframeDays: number = 7
): Promise<RecommendedPost[]> {
  const supabase = await createServiceClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

  const { data: posts, error } = await supabase
    .from('posts')
    .select(
      `
      id, title, slug, excerpt, featured_image_url, reading_time,
      published_at, view_count, reaction_count, comment_count, tags,
      author:profiles!posts_author_id_fkey (id, username, display_name, avatar_url),
      category:categories (id, name, slug, color)
    `
    )
    .eq('status', 'published')
    .gte('published_at', cutoffDate.toISOString())
    .order('view_count', { ascending: false })
    .limit(limit * 2);

  if (error || !posts) {
    logger.error('[Recommendations] Failed to get trending content', error);
    return [];
  }

  // Calculate trending score based on velocity
  const scoredPosts = posts.map((post) => {
    const ageHours = (Date.now() - new Date(post.published_at).getTime()) / (1000 * 60 * 60);
    const velocity = (post.view_count || 0) / Math.max(1, ageHours);

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      featured_image_url: post.featured_image_url,
      reading_time: post.reading_time || 0,
      published_at: post.published_at,
      view_count: post.view_count || 0,
      reaction_count: post.reaction_count || 0,
      comment_count: post.comment_count || 0,
      author: (() => {
        const author = Array.isArray(post.author) ? post.author[0] : post.author;
        return (
          (author as unknown as RecommendedPost['author']) || {
            id: '',
            username: '',
            display_name: '',
            avatar_url: null,
          }
        );
      })(),
      category: (() => {
        const category = Array.isArray(post.category) ? post.category[0] : post.category;
        return (
          (category as unknown as RecommendedPost['category']) || {
            id: '',
            name: '',
            slug: '',
            color: '',
          }
        );
      })(),
      tags: post.tags || [],
      score: velocity,
      reason: 'trending' as RecommendationReason,
    };
  });

  return scoredPosts.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Get popular content (all time)
 */
export async function getPopularContent(limit: number = 10): Promise<RecommendedPost[]> {
  const supabase = await createServiceClient();

  const { data: posts, error } = await supabase
    .from('posts')
    .select(
      `
      id, title, slug, excerpt, featured_image_url, reading_time,
      published_at, view_count, reaction_count, comment_count, tags,
      author:profiles!posts_author_id_fkey (id, username, display_name, avatar_url),
      category:categories (id, name, slug, color)
    `
    )
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('view_count', { ascending: false })
    .limit(limit);

  if (error || !posts) {
    logger.error('[Recommendations] Failed to get popular content', error);
    return [];
  }

  const maxViews = Math.max(...posts.map((p) => p.view_count || 0), 1);

  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    featured_image_url: post.featured_image_url,
    reading_time: post.reading_time || 0,
    published_at: post.published_at,
    view_count: post.view_count || 0,
    reaction_count: post.reaction_count || 0,
    comment_count: post.comment_count || 0,
    author: (() => {
      const author = Array.isArray(post.author) ? post.author[0] : post.author;
      return (
        (author as unknown as RecommendedPost['author']) || {
          id: '',
          username: '',
          display_name: '',
          avatar_url: null,
        }
      );
    })(),
    category: (() => {
      const category = Array.isArray(post.category) ? post.category[0] : post.category;
      return (
        (category as unknown as RecommendedPost['category']) || {
          id: '',
          name: '',
          slug: '',
          color: '',
        }
      );
    })(),
    tags: post.tags || [],
    score: calculatePopularityScore(post.view_count || 0, maxViews),
    reason: 'popular' as RecommendationReason,
  }));
}

/**
 * Get editorial picks (featured content)
 */
export async function getEditorialPicks(limit: number = 5): Promise<RecommendedPost[]> {
  const supabase = await createServiceClient();

  const { data: posts, error } = await supabase
    .from('posts')
    .select(
      `
      id, title, slug, excerpt, featured_image_url, reading_time,
      published_at, view_count, reaction_count, comment_count, tags,
      author:profiles!posts_author_id_fkey (id, username, display_name, avatar_url),
      category:categories (id, name, slug, color)
    `
    )
    .eq('status', 'published')
    .eq('is_featured', true)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error || !posts) {
    logger.error('[Recommendations] Failed to get editorial picks', error);
    return [];
  }

  return posts.map((post, index) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    featured_image_url: post.featured_image_url,
    reading_time: post.reading_time || 0,
    published_at: post.published_at,
    view_count: post.view_count || 0,
    reaction_count: post.reaction_count || 0,
    comment_count: post.comment_count || 0,
    author: (() => {
      const author = Array.isArray(post.author) ? post.author[0] : post.author;
      return (
        (author as unknown as RecommendedPost['author']) || {
          id: '',
          username: '',
          display_name: '',
          avatar_url: null,
        }
      );
    })(),
    category: (() => {
      const category = Array.isArray(post.category) ? post.category[0] : post.category;
      return (
        (category as unknown as RecommendedPost['category']) || {
          id: '',
          name: '',
          slug: '',
          color: '',
        }
      );
    })(),
    tags: post.tags || [],
    score: 1 - index * 0.1, // Maintain order
    reason: 'editorial_pick' as RecommendationReason,
  }));
}

/**
 * Get content for category
 */
export async function getCategoryRecommendations(
  categoryId: string,
  limit: number = 10,
  excludeIds: string[] = []
): Promise<RecommendedPost[]> {
  const supabase = await createServiceClient();

  let query = supabase
    .from('posts')
    .select(
      `
      id, title, slug, excerpt, featured_image_url, reading_time,
      published_at, view_count, reaction_count, comment_count, tags,
      author:profiles!posts_author_id_fkey (id, username, display_name, avatar_url),
      category:categories (id, name, slug, color)
    `
    )
    .eq('status', 'published')
    .eq('category_id', categoryId)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit * 2);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: posts, error } = await query;

  if (error || !posts) {
    logger.error('[Recommendations] Failed to get category recommendations', error);
    return [];
  }

  const maxViews = Math.max(...posts.map((p) => p.view_count || 0), 1);

  const scored = posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    featured_image_url: post.featured_image_url,
    reading_time: post.reading_time || 0,
    published_at: post.published_at,
    view_count: post.view_count || 0,
    reaction_count: post.reaction_count || 0,
    comment_count: post.comment_count || 0,
    author: (() => {
      const author = Array.isArray(post.author) ? post.author[0] : post.author;
      return (
        (author as unknown as RecommendedPost['author']) || {
          id: '',
          username: '',
          display_name: '',
          avatar_url: null,
        }
      );
    })(),
    category: (() => {
      const category = Array.isArray(post.category) ? post.category[0] : post.category;
      return (
        (category as unknown as RecommendedPost['category']) || {
          id: '',
          name: '',
          slug: '',
          color: '',
        }
      );
    })(),
    tags: post.tags || [],
    score:
      calculateRecencyScore(new Date(post.published_at), 7) * 0.5 +
      calculatePopularityScore(post.view_count || 0, maxViews) * 0.5,
    reason: 'same_category' as RecommendationReason,
  }));

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Apply diversity to recommendations
 */
function applyDiversity(posts: RecommendedPost[], diversityFactor: number): RecommendedPost[] {
  if (diversityFactor === 0) return posts;

  const result: RecommendedPost[] = [];
  const authorCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  // Sort by score first
  const sorted = [...posts].sort((a, b) => b.score - a.score);

  for (const post of sorted) {
    const authorId = post.author?.id;
    const categoryId = post.category?.id;

    const authorCount = authorCounts.get(authorId) || 0;
    const categoryCount = categoryId ? categoryCounts.get(categoryId) || 0 : 0;

    // Apply penalty for repeated authors/categories
    const penalty = (authorCount + categoryCount) * diversityFactor * 0.2;
    const adjustedScore = post.score * (1 - penalty);

    if (adjustedScore > 0.1) {
      result.push({ ...post, score: adjustedScore });
      authorCounts.set(authorId, authorCount + 1);
      if (categoryId) {
        categoryCounts.set(categoryId, categoryCount + 1);
      }
    }
  }

  return result.sort((a, b) => b.score - a.score);
}

/**
 * Get mixed recommendations (combines multiple strategies)
 */
export async function getMixedRecommendations(
  context: RecommendationContext
): Promise<RecommendedPost[]> {
  const { postId, userId, limit = 10, excludeIds = [] } = context;

  const results: RecommendedPost[] = [];

  // Get recommendations from different sources
  const [similar, trending, editorial] = await Promise.all([
    postId ? getSimilarContent(postId, 5) : Promise.resolve([]),
    getTrendingContent(5),
    getEditorialPicks(3),
  ]);

  // Get personalized if user is logged in
  let personalized: RecommendedPost[] = [];
  if (userId) {
    personalized = await getPersonalizedRecommendations(userId, 5);
  }

  // Merge and deduplicate
  const allRecommendations = [...editorial, ...personalized, ...similar, ...trending];
  const seen = new Set(excludeIds);

  for (const rec of allRecommendations) {
    if (!seen.has(rec.id)) {
      seen.add(rec.id);
      results.push(rec);
    }
  }

  // Sort by score and return
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

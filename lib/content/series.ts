// @ts-nocheck
/**
 * Series/Collections System
 * Phase 32: Multi-part articles, series management, collections
 */

import { logger } from '@/lib/logger';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface Series {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  author_id: string;
  category_id: string | null;
  status: SeriesStatus;
  visibility: SeriesVisibility;
  total_parts: number;
  published_parts: number;
  total_reading_time: number;
  view_count: number;
  subscriber_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  completed_at: string | null;
  metadata: SeriesMetadata;
}

export type SeriesStatus = 'draft' | 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
export type SeriesVisibility = 'public' | 'unlisted' | 'private' | 'subscribers_only';

export interface SeriesMetadata {
  tags: string[];
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  estimated_total_time?: number;
  update_frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'irregular';
}

export interface SeriesPart {
  id: string;
  series_id: string;
  post_id: string;
  part_number: number;
  title: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export interface SeriesWithParts extends Series {
  parts: SeriesPart[];
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
    color: string;
  };
}

export interface SeriesSubscription {
  id: string;
  user_id: string;
  series_id: string;
  notify_new_parts: boolean;
  created_at: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  curator_id: string;
  is_public: boolean;
  is_featured: boolean;
  post_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionPost {
  id: string;
  collection_id: string;
  post_id: string;
  curator_note: string | null;
  display_order: number;
  added_at: string;
}

// ============================================================================
// SERIES CRUD
// ============================================================================

/**
 * Create a new series
 */
export async function createSeries(
  authorId: string,
  series: Omit<
    Series,
    | 'id'
    | 'author_id'
    | 'total_parts'
    | 'published_parts'
    | 'total_reading_time'
    | 'view_count'
    | 'subscriber_count'
    | 'created_at'
    | 'updated_at'
    | 'published_at'
    | 'completed_at'
  >
): Promise<Series> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('series')
    .insert({
      ...series,
      author_id: authorId,
      total_parts: 0,
      published_parts: 0,
      total_reading_time: 0,
      view_count: 0,
      subscriber_count: 0,
    })
    .select()
    .single();

  if (error) {
    logger.error('[Series] Failed to create series', error);
    throw error;
  }

  logger.info('[Series] Series created', {
    seriesId: data.id,
    title: series.title,
  });

  return data as Series;
}

/**
 * Get a series by ID or slug
 */
export async function getSeries(identifier: string): Promise<SeriesWithParts | null> {
  const supabase = await createClient();

  // Check if identifier is UUID or slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  const { data: series, error: seriesError } = await supabase
    .from('series')
    .select(
      `
      *,
      author:profiles!author_id(id, username, display_name, avatar_url),
      category:categories(id, name, slug, color)
    `
    )
    .eq(isUuid ? 'id' : 'slug', identifier)
    .single();

  if (seriesError || !series) return null;

  // Get parts
  const { data: parts } = await supabase
    .from('series_parts')
    .select('*')
    .eq('series_id', series.id)
    .order('part_number', { ascending: true });

  return {
    ...series,
    parts: parts || [],
  } as SeriesWithParts;
}

/**
 * Update a series
 */
export async function updateSeries(
  seriesId: string,
  authorId: string,
  updates: Partial<Omit<Series, 'id' | 'author_id' | 'created_at'>>
): Promise<Series> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('series')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', seriesId)
    .eq('author_id', authorId)
    .select()
    .single();

  if (error) {
    logger.error('[Series] Failed to update series', error);
    throw error;
  }

  return data as Series;
}

/**
 * Delete a series
 */
export async function deleteSeries(seriesId: string, authorId: string): Promise<void> {
  const supabase = await createClient();

  // Delete parts first
  await supabase.from('series_parts').delete().eq('series_id', seriesId);

  // Delete subscriptions
  await supabase.from('series_subscriptions').delete().eq('series_id', seriesId);

  // Delete series
  const { error } = await supabase
    .from('series')
    .delete()
    .eq('id', seriesId)
    .eq('author_id', authorId);

  if (error) {
    logger.error('[Series] Failed to delete series', error);
    throw error;
  }

  logger.info('[Series] Series deleted', { seriesId });
}

/**
 * List series
 */
export async function listSeries(options: {
  authorId?: string;
  categoryId?: string;
  status?: SeriesStatus;
  visibility?: SeriesVisibility;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ series: SeriesWithParts[]; total: number }> {
  const { authorId, categoryId, status, visibility, search, limit = 20, offset = 0 } = options;
  const supabase = await createClient();

  let query = supabase
    .from('series')
    .select(
      `
      *,
      author:profiles!author_id(id, username, display_name, avatar_url),
      category:categories(id, name, slug, color)
    `,
      { count: 'exact' }
    )
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (authorId) query = query.eq('author_id', authorId);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (status) query = query.eq('status', status);
  if (visibility) query = query.eq('visibility', visibility);
  if (search) query = query.ilike('title', `%${search}%`);

  const { data, count, error } = await query;

  if (error) {
    logger.error('[Series] Failed to list series', error);
    throw error;
  }

  // Get parts for each series
  const seriesIds = (data || []).map((s) => s.id);
  const { data: allParts } = await supabase
    .from('series_parts')
    .select('*')
    .in('series_id', seriesIds)
    .order('part_number', { ascending: true });

  const partsMap = new Map<string, SeriesPart[]>();
  (allParts || []).forEach((part) => {
    if (!partsMap.has(part.series_id)) {
      partsMap.set(part.series_id, []);
    }
    partsMap.get(part.series_id)!.push(part as SeriesPart);
  });

  const seriesWithParts = (data || []).map((s) => ({
    ...s,
    parts: partsMap.get(s.id) || [],
  })) as SeriesWithParts[];

  return {
    series: seriesWithParts,
    total: count || 0,
  };
}

// ============================================================================
// SERIES PARTS
// ============================================================================

/**
 * Add a post to a series
 */
export async function addPartToSeries(
  seriesId: string,
  postId: string,
  title: string
): Promise<SeriesPart> {
  const supabase = await createClient();

  // Get current max part number
  const { data: maxPart } = await supabase
    .from('series_parts')
    .select('part_number')
    .eq('series_id', seriesId)
    .order('part_number', { ascending: false })
    .limit(1)
    .single();

  const partNumber = (maxPart?.part_number || 0) + 1;

  const { data, error } = await supabase
    .from('series_parts')
    .insert({
      series_id: seriesId,
      post_id: postId,
      part_number: partNumber,
      title,
      is_published: false,
    })
    .select()
    .single();

  if (error) {
    logger.error('[Series] Failed to add part', error);
    throw error;
  }

  // Update series total_parts
  await supabase.rpc('increment_series_parts', { series_id: seriesId });

  logger.info('[Series] Part added', { seriesId, postId, partNumber });

  return data as SeriesPart;
}

/**
 * Remove a part from a series
 */
export async function removePartFromSeries(seriesId: string, postId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('series_parts')
    .delete()
    .eq('series_id', seriesId)
    .eq('post_id', postId);

  if (error) {
    logger.error('[Series] Failed to remove part', error);
    throw error;
  }

  // Renumber remaining parts
  await renumberSeriesParts(seriesId);

  logger.info('[Series] Part removed', { seriesId, postId });
}

/**
 * Reorder parts in a series
 */
export async function reorderSeriesParts(seriesId: string, partIds: string[]): Promise<void> {
  const supabase = await createClient();

  const updates = partIds.map((id, index) => ({
    id,
    part_number: index + 1,
  }));

  for (const update of updates) {
    await supabase
      .from('series_parts')
      .update({ part_number: update.part_number })
      .eq('id', update.id)
      .eq('series_id', seriesId);
  }

  logger.info('[Series] Parts reordered', { seriesId });
}

async function renumberSeriesParts(seriesId: string): Promise<void> {
  const supabase = await createServiceClient();

  const { data: parts } = await supabase
    .from('series_parts')
    .select('id')
    .eq('series_id', seriesId)
    .order('part_number', { ascending: true });

  if (!parts) return;

  for (let i = 0; i < parts.length; i++) {
    await supabase
      .from('series_parts')
      .update({ part_number: i + 1 })
      .eq('id', parts[i].id);
  }
}

// ============================================================================
// SERIES SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to a series
 */
export async function subscribeToSeries(
  userId: string,
  seriesId: string,
  notifyNewParts: boolean = true
): Promise<SeriesSubscription> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('series_subscriptions')
    .insert({
      user_id: userId,
      series_id: seriesId,
      notify_new_parts: notifyNewParts,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Already subscribed to this series');
    }
    throw error;
  }

  // Increment subscriber count
  await supabase.rpc('increment_series_subscribers', { series_id: seriesId });

  return data as SeriesSubscription;
}

/**
 * Unsubscribe from a series
 */
export async function unsubscribeFromSeries(userId: string, seriesId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('series_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('series_id', seriesId);

  if (error) throw error;

  // Decrement subscriber count
  await supabase.rpc('decrement_series_subscribers', { series_id: seriesId });
}

/**
 * Check if user is subscribed
 */
export async function isSubscribedToSeries(userId: string, seriesId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('series_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('series_id', seriesId)
    .single();

  return !!data;
}

/**
 * Get user's subscribed series
 */
export async function getUserSubscribedSeries(userId: string): Promise<Series[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('series_subscriptions')
    .select('series:series(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((s) => s.series) as Series[];
}

// ============================================================================
// COLLECTIONS
// ============================================================================

/**
 * Create a collection
 */
export async function createCollection(
  curatorId: string,
  collection: Omit<
    Collection,
    'id' | 'curator_id' | 'post_count' | 'view_count' | 'created_at' | 'updated_at'
  >
): Promise<Collection> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('collections')
    .insert({
      ...collection,
      curator_id: curatorId,
      post_count: 0,
      view_count: 0,
    })
    .select()
    .single();

  if (error) {
    logger.error('[Collections] Failed to create collection', error);
    throw error;
  }

  return data as Collection;
}

/**
 * Add post to collection
 */
export async function addPostToCollection(
  collectionId: string,
  postId: string,
  curatorNote?: string
): Promise<CollectionPost> {
  const supabase = await createClient();

  // Get max display order
  const { data: maxOrder } = await supabase
    .from('collection_posts')
    .select('display_order')
    .eq('collection_id', collectionId)
    .order('display_order', { ascending: false })
    .limit(1)
    .single();

  const displayOrder = (maxOrder?.display_order || 0) + 1;

  const { data, error } = await supabase
    .from('collection_posts')
    .insert({
      collection_id: collectionId,
      post_id: postId,
      curator_note: curatorNote || null,
      display_order: displayOrder,
    })
    .select()
    .single();

  if (error) {
    logger.error('[Collections] Failed to add post', error);
    throw error;
  }

  // Update post count
  await supabase.rpc('increment_collection_posts', {
    collection_id: collectionId,
  });

  return data as CollectionPost;
}

/**
 * Remove post from collection
 */
export async function removePostFromCollection(
  collectionId: string,
  postId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('collection_posts')
    .delete()
    .eq('collection_id', collectionId)
    .eq('post_id', postId);

  if (error) {
    logger.error('[Collections] Failed to remove post', error);
    throw error;
  }

  // Update post count
  await supabase.rpc('decrement_collection_posts', {
    collection_id: collectionId,
  });
}

/**
 * Get collection with posts
 */
export async function getCollection(
  identifier: string
): Promise<(Collection & { posts: CollectionPost[] }) | null> {
  const supabase = await createClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  const { data: collection, error } = await supabase
    .from('collections')
    .select('*')
    .eq(isUuid ? 'id' : 'slug', identifier)
    .single();

  if (error || !collection) return null;

  const { data: posts } = await supabase
    .from('collection_posts')
    .select('*')
    .eq('collection_id', collection.id)
    .order('display_order', { ascending: true });

  return {
    ...collection,
    posts: posts || [],
  } as Collection & { posts: CollectionPost[] };
}

export default {
  // Series
  createSeries,
  getSeries,
  updateSeries,
  deleteSeries,
  listSeries,
  addPartToSeries,
  removePartFromSeries,
  reorderSeriesParts,
  subscribeToSeries,
  unsubscribeFromSeries,
  isSubscribedToSeries,
  getUserSubscribedSeries,
  // Collections
  createCollection,
  addPostToCollection,
  removePostFromCollection,
  getCollection,
};

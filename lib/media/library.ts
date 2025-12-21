/**
 * Unified Media Library System
 * Phase 43: Media management with folders, search, and bulk operations
 */

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface MediaItem {
  id: string;
  user_id: string;
  folder_id: string | null;
  type: MediaType;
  filename: string;
  original_filename: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  url: string;
  thumbnail_url: string | null;
  blur_hash: string | null;
  alt_text: string | null;
  caption: string | null;
  tags: string[];
  metadata: MediaMetadata;
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'other';

export interface MediaMetadata {
  // Image metadata
  camera?: string;
  lens?: string;
  aperture?: string;
  shutter_speed?: string;
  iso?: number;
  focal_length?: string;
  taken_at?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };

  // Video/Audio metadata
  codec?: string;
  bitrate?: number;
  frame_rate?: number;
  sample_rate?: number;
  channels?: number;

  // Document metadata
  page_count?: number;
  author?: string;
  title?: string;

  // Processing
  processed?: boolean;
  variants?: MediaVariant[];
}

export interface MediaVariant {
  name: string;
  width: number;
  height: number;
  url: string;
  size: number;
}

export interface MediaFolder {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_system: boolean;
  item_count: number;
  path: string;
  created_at: string;
  updated_at: string;
}

export interface MediaFolderTree extends MediaFolder {
  children: MediaFolderTree[];
}

export interface MediaStats {
  total_items: number;
  total_size: number;
  by_type: Record<MediaType, { count: number; size: number }>;
  by_folder: { folder_id: string; folder_name: string; count: number; size: number }[];
  recent_uploads: number;
  storage_limit: number;
  storage_used_percent: number;
}

export interface MediaQuery {
  folder_id?: string | null;
  type?: MediaType | MediaType[];
  search?: string;
  tags?: string[];
  is_public?: boolean;
  date_from?: Date;
  date_to?: Date;
  min_size?: number;
  max_size?: number;
  sort_by?: 'created_at' | 'updated_at' | 'filename' | 'size' | 'usage_count';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface BulkOperation {
  operation: 'move' | 'copy' | 'delete' | 'tag' | 'untag' | 'make_public' | 'make_private';
  item_ids: string[];
  target_folder_id?: string;
  tags?: string[];
}

export interface BulkResult {
  success: number;
  failed: number;
  errors: { item_id: string; error: string }[];
}

// ============================================================================
// FOLDER OPERATIONS
// ============================================================================

/**
 * Create a new media folder
 */
export async function createFolder(
  name: string,
  options: {
    parent_id?: string;
    description?: string;
    color?: string;
    icon?: string;
  } = {}
): Promise<MediaFolder> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Generate slug
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Calculate path
  let path = `/${slug}`;
  if (options.parent_id) {
    const { data: parent } = await supabase
      .from('media_folders')
      .select('path')
      .eq('id', options.parent_id)
      .single();

    if (parent) {
      path = `${parent.path}/${slug}`;
    }
  }

  const { data, error } = await supabase
    .from('media_folders')
    .insert({
      user_id: user.id,
      parent_id: options.parent_id || null,
      name,
      slug,
      description: options.description || null,
      color: options.color || null,
      icon: options.icon || null,
      is_system: false,
      item_count: 0,
      path,
    })
    .select()
    .single();

  if (error) {
    logger.error('[MediaLibrary] Failed to create folder', error);
    throw error;
  }

  logger.info('[MediaLibrary] Folder created', { folder_id: data.id, name });
  return data as MediaFolder;
}

/**
 * Update a folder
 */
export async function updateFolder(
  folderId: string,
  updates: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
  }
): Promise<MediaFolder> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const updateData: Record<string, unknown> = { ...updates };

  // Recalculate slug if name changed
  if (updates.name) {
    updateData.slug = updates.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  const { data, error } = await supabase
    .from('media_folders')
    .update(updateData)
    .eq('id', folderId)
    .eq('user_id', user.id)
    .eq('is_system', false)
    .select()
    .single();

  if (error) {
    logger.error('[MediaLibrary] Failed to update folder', error);
    throw error;
  }

  return data as MediaFolder;
}

/**
 * Delete a folder
 */
export async function deleteFolder(
  folderId: string,
  options: { moveContentsTo?: string; deleteContents?: boolean } = {}
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get folder to ensure it exists and isn't a system folder
  const { data: folder } = await supabase
    .from('media_folders')
    .select('*')
    .eq('id', folderId)
    .eq('user_id', user.id)
    .single();

  if (!folder) {
    throw new Error('Folder not found');
  }

  if (folder.is_system) {
    throw new Error('Cannot delete system folder');
  }

  if (options.moveContentsTo) {
    // Move all items to target folder
    await supabase
      .from('media_items')
      .update({ folder_id: options.moveContentsTo })
      .eq('folder_id', folderId)
      .eq('user_id', user.id);

    // Move subfolders
    await supabase
      .from('media_folders')
      .update({ parent_id: options.moveContentsTo })
      .eq('parent_id', folderId)
      .eq('user_id', user.id);
  } else if (options.deleteContents) {
    // Delete all items in folder
    await supabase
      .from('media_items')
      .delete()
      .eq('folder_id', folderId)
      .eq('user_id', user.id);

    // Recursively delete subfolders
    const { data: subfolders } = await supabase
      .from('media_folders')
      .select('id')
      .eq('parent_id', folderId);

    for (const subfolder of subfolders || []) {
      await deleteFolder(subfolder.id, { deleteContents: true });
    }
  } else {
    // Check if folder has contents
    const { count } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .eq('folder_id', folderId);

    if (count && count > 0) {
      throw new Error('Folder is not empty. Move or delete contents first.');
    }
  }

  // Delete the folder
  await supabase
    .from('media_folders')
    .delete()
    .eq('id', folderId)
    .eq('user_id', user.id);

  logger.info('[MediaLibrary] Folder deleted', { folder_id: folderId });
}

/**
 * Get folder tree for user
 */
export async function getFolderTree(userId?: string): Promise<MediaFolderTree[]> {
  const supabase = userId ? await createServiceClient() : await createClient();

  let query = supabase.from('media_folders').select('*').order('name');

  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    query = query.eq('user_id', user.id);
  } else {
    query = query.eq('user_id', userId);
  }

  const { data: folders, error } = await query;

  if (error) {
    logger.error('[MediaLibrary] Failed to get folders', error);
    throw error;
  }

  // Build tree structure
  const folderMap = new Map<string, MediaFolderTree>();
  const roots: MediaFolderTree[] = [];

  // First pass: create all nodes
  for (const folder of folders || []) {
    folderMap.set(folder.id, { ...folder, children: [] } as MediaFolderTree);
  }

  // Second pass: build tree
  for (const folder of folders || []) {
    const node = folderMap.get(folder.id)!;
    if (folder.parent_id && folderMap.has(folder.parent_id)) {
      folderMap.get(folder.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ============================================================================
// MEDIA ITEM OPERATIONS
// ============================================================================

/**
 * Add a media item to the library
 */
export async function addMediaItem(
  item: Omit<MediaItem, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'usage_count'>
): Promise<MediaItem> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('media_items')
    .insert({
      ...item,
      user_id: user.id,
      usage_count: 0,
    })
    .select()
    .single();

  if (error) {
    logger.error('[MediaLibrary] Failed to add media item', error);
    throw error;
  }

  // Update folder item count
  if (item.folder_id) {
    await supabase.rpc('increment_folder_item_count', { folder_id: item.folder_id });
  }

  logger.info('[MediaLibrary] Media item added', { item_id: data.id, type: item.type });
  return data as MediaItem;
}

/**
 * Update a media item
 */
export async function updateMediaItem(
  itemId: string,
  updates: Partial<Pick<MediaItem, 'filename' | 'alt_text' | 'caption' | 'tags' | 'is_public' | 'folder_id'>>
): Promise<MediaItem> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get current item for folder change detection
  const { data: currentItem } = await supabase
    .from('media_items')
    .select('folder_id')
    .eq('id', itemId)
    .eq('user_id', user.id)
    .single();

  const { data, error } = await supabase
    .from('media_items')
    .update(updates)
    .eq('id', itemId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    logger.error('[MediaLibrary] Failed to update media item', error);
    throw error;
  }

  // Update folder counts if folder changed
  if (updates.folder_id !== undefined && currentItem?.folder_id !== updates.folder_id) {
    if (currentItem?.folder_id) {
      await supabase.rpc('decrement_folder_item_count', { folder_id: currentItem.folder_id });
    }
    if (updates.folder_id) {
      await supabase.rpc('increment_folder_item_count', { folder_id: updates.folder_id });
    }
  }

  return data as MediaItem;
}

/**
 * Delete a media item
 */
export async function deleteMediaItem(itemId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get item for folder count update
  const { data: item } = await supabase
    .from('media_items')
    .select('folder_id, url, thumbnail_url')
    .eq('id', itemId)
    .eq('user_id', user.id)
    .single();

  if (!item) {
    throw new Error('Media item not found');
  }

  // Delete from database
  const { error } = await supabase
    .from('media_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', user.id);

  if (error) {
    logger.error('[MediaLibrary] Failed to delete media item', error);
    throw error;
  }

  // Update folder count
  if (item.folder_id) {
    await supabase.rpc('decrement_folder_item_count', { folder_id: item.folder_id });
  }

  // TODO: Delete actual file from storage

  logger.info('[MediaLibrary] Media item deleted', { item_id: itemId });
}

/**
 * Query media items
 */
export async function queryMediaItems(
  query: MediaQuery
): Promise<{ items: MediaItem[]; total: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const {
    folder_id,
    type,
    search,
    tags,
    is_public,
    date_from,
    date_to,
    min_size,
    max_size,
    sort_by = 'created_at',
    sort_order = 'desc',
    limit = 50,
    offset = 0,
  } = query;

  let queryBuilder = supabase
    .from('media_items')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id);

  // Folder filter (null means root/no folder)
  if (folder_id !== undefined) {
    if (folder_id === null) {
      queryBuilder = queryBuilder.is('folder_id', null);
    } else {
      queryBuilder = queryBuilder.eq('folder_id', folder_id);
    }
  }

  // Type filter
  if (type) {
    if (Array.isArray(type)) {
      queryBuilder = queryBuilder.in('type', type);
    } else {
      queryBuilder = queryBuilder.eq('type', type);
    }
  }

  // Search filter
  if (search) {
    queryBuilder = queryBuilder.or(
      `filename.ilike.%${search}%,original_filename.ilike.%${search}%,alt_text.ilike.%${search}%,caption.ilike.%${search}%`
    );
  }

  // Tags filter
  if (tags && tags.length > 0) {
    queryBuilder = queryBuilder.contains('tags', tags);
  }

  // Public filter
  if (is_public !== undefined) {
    queryBuilder = queryBuilder.eq('is_public', is_public);
  }

  // Date filters
  if (date_from) {
    queryBuilder = queryBuilder.gte('created_at', date_from.toISOString());
  }
  if (date_to) {
    queryBuilder = queryBuilder.lte('created_at', date_to.toISOString());
  }

  // Size filters
  if (min_size !== undefined) {
    queryBuilder = queryBuilder.gte('size', min_size);
  }
  if (max_size !== undefined) {
    queryBuilder = queryBuilder.lte('size', max_size);
  }

  // Sorting
  queryBuilder = queryBuilder.order(sort_by, { ascending: sort_order === 'asc' });

  // Pagination
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  const { data, count, error } = await queryBuilder;

  if (error) {
    logger.error('[MediaLibrary] Failed to query media items', error);
    throw error;
  }

  return {
    items: (data || []) as MediaItem[],
    total: count || 0,
  };
}

/**
 * Get a single media item
 */
export async function getMediaItem(itemId: string): Promise<MediaItem | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .eq('id', itemId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error('[MediaLibrary] Failed to get media item', error);
    throw error;
  }

  return data as MediaItem;
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Perform bulk operations on media items
 */
export async function bulkOperation(operation: BulkOperation): Promise<BulkResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const result: BulkResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const itemId of operation.item_ids) {
    try {
      switch (operation.operation) {
        case 'move':
          await updateMediaItem(itemId, { folder_id: operation.target_folder_id || null });
          break;

        case 'delete':
          await deleteMediaItem(itemId);
          break;

        case 'tag':
          if (operation.tags) {
            const item = await getMediaItem(itemId);
            if (item) {
              const newTags = [...new Set([...item.tags, ...operation.tags])];
              await updateMediaItem(itemId, { tags: newTags });
            }
          }
          break;

        case 'untag':
          if (operation.tags) {
            const item = await getMediaItem(itemId);
            if (item) {
              const newTags = item.tags.filter((t) => !operation.tags?.includes(t));
              await updateMediaItem(itemId, { tags: newTags });
            }
          }
          break;

        case 'make_public':
          await updateMediaItem(itemId, { is_public: true });
          break;

        case 'make_private':
          await updateMediaItem(itemId, { is_public: false });
          break;

        case 'copy':
          const item = await getMediaItem(itemId);
          if (item) {
            const { id: _id, user_id: _userId, created_at: _createdAt, updated_at: _updatedAt, usage_count: _usageCount, ...copyData } = item;
            await addMediaItem({
              ...copyData,
              folder_id: operation.target_folder_id || item.folder_id,
              filename: `Copy of ${item.filename}`,
            });
          }
          break;
      }

      result.success++;
    } catch (err) {
      result.failed++;
      result.errors.push({
        item_id: itemId,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  logger.info('[MediaLibrary] Bulk operation completed', {
    operation: operation.operation,
    success: result.success,
    failed: result.failed,
  });

  return result;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get media library statistics
 */
export async function getMediaStats(userId?: string): Promise<MediaStats> {
  const supabase = userId ? await createServiceClient() : await createClient();

  let targetUserId = userId;

  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    targetUserId = user.id;
  }

  // Get total items and size
  const { data: items } = await supabase
    .from('media_items')
    .select('id, type, size, folder_id, created_at')
    .eq('user_id', targetUserId);

  const allItems = items || [];

  // Calculate stats
  const byType: Record<MediaType, { count: number; size: number }> = {
    image: { count: 0, size: 0 },
    video: { count: 0, size: 0 },
    audio: { count: 0, size: 0 },
    document: { count: 0, size: 0 },
    other: { count: 0, size: 0 },
  };

  const byFolderMap = new Map<string, { count: number; size: number }>();
  let totalSize = 0;
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  let recentUploads = 0;

  for (const item of allItems) {
    totalSize += item.size;
    byType[item.type as MediaType].count++;
    byType[item.type as MediaType].size += item.size;

    const folderId = item.folder_id || 'root';
    const folderStats = byFolderMap.get(folderId) || { count: 0, size: 0 };
    folderStats.count++;
    folderStats.size += item.size;
    byFolderMap.set(folderId, folderStats);

    if (new Date(item.created_at) > oneWeekAgo) {
      recentUploads++;
    }
  }

  // Get folder names
  const folderIds = [...byFolderMap.keys()].filter((id) => id !== 'root');
  const { data: folders } = await supabase
    .from('media_folders')
    .select('id, name')
    .in('id', folderIds);

  const folderNames = new Map((folders || []).map((f) => [f.id, f.name]));

  const byFolder = [...byFolderMap.entries()].map(([folder_id, stats]) => ({
    folder_id,
    folder_name: folder_id === 'root' ? 'Root' : folderNames.get(folder_id) || 'Unknown',
    count: stats.count,
    size: stats.size,
  }));

  // Storage limit (example: 5GB)
  const storageLimit = 5 * 1024 * 1024 * 1024;

  return {
    total_items: allItems.length,
    total_size: totalSize,
    by_type: byType,
    by_folder: byFolder,
    recent_uploads: recentUploads,
    storage_limit: storageLimit,
    storage_used_percent: (totalSize / storageLimit) * 100,
  };
}

// ============================================================================
// SEARCH & SUGGESTIONS
// ============================================================================

/**
 * Get popular tags in the library
 */
export async function getPopularTags(limit: number = 20): Promise<{ tag: string; count: number }[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: items } = await supabase
    .from('media_items')
    .select('tags')
    .eq('user_id', user.id);

  const tagCounts = new Map<string, number>();

  for (const item of items || []) {
    for (const tag of item.tags || []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  return [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get recently used media items
 */
export async function getRecentMedia(limit: number = 10): Promise<MediaItem[]> {
  const { items } = await queryMediaItems({
    sort_by: 'updated_at',
    sort_order: 'desc',
    limit,
  });

  return items;
}

/**
 * Get media items by usage
 */
export async function getMostUsedMedia(limit: number = 10): Promise<MediaItem[]> {
  const { items } = await queryMediaItems({
    sort_by: 'usage_count',
    sort_order: 'desc',
    limit,
  });

  return items;
}

/**
 * Record media usage
 */
export async function recordMediaUsage(itemId: string): Promise<void> {
  const supabase = await createServiceClient();

  await supabase.rpc('increment_media_usage', { item_id: itemId });
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

/**
 * Find potential duplicates
 */
export async function findDuplicates(): Promise<
  { original: MediaItem; duplicates: MediaItem[] }[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get all items
  const { data: items } = await supabase
    .from('media_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at');

  if (!items || items.length === 0) {
    return [];
  }

  // Group by size and type as a rough duplicate check
  const groups = new Map<string, MediaItem[]>();

  for (const item of items) {
    const key = `${item.size}-${item.type}-${item.width || 0}-${item.height || 0}`;
    const group = groups.get(key) || [];
    group.push(item as MediaItem);
    groups.set(key, group);
  }

  // Find groups with duplicates
  const duplicates: { original: MediaItem; duplicates: MediaItem[] }[] = [];

  for (const group of groups.values()) {
    if (group.length > 1) {
      duplicates.push({
        original: group[0],
        duplicates: group.slice(1),
      });
    }
  }

  return duplicates;
}

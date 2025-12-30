/**
 * Bookmarks Database Operations
 * Phase 3.4: Complete bookmarking system with folders
 */

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

// These types are manually defined as the tables may not be in the generated types yet
interface Bookmark {
  id: string;
  user_id: string;
  post_id: string;
  folder_id: string | null;
  created_at: string;
  notes: string | null;
}

interface BookmarkFolder {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookmarkWithPost extends Bookmark {
  post: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    featured_image_url: string | null;
    reading_time: number | null;
    published_at: string | null;
    author: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    } | null;
    category: {
      id: string;
      name: string;
      slug: string;
      color: string | null;
    } | null;
  };
}

export interface BookmarkFolderWithCount extends BookmarkFolder {
  bookmark_count: number;
}

// ============================================================================
// BOOKMARK FOLDERS
// ============================================================================

export async function getBookmarkFolders(userId: string): Promise<BookmarkFolderWithCount[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('bookmark_folders')
    .select(
      `
      *,
      bookmarks:bookmarks(count)
    `
    )
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return (data || []).map((folder) => ({
    ...folder,
    bookmark_count: folder.bookmarks?.[0]?.count || 0,
  }));
}

export async function createBookmarkFolder(
  userId: string,
  data: { name: string; color?: string; icon?: string }
): Promise<BookmarkFolder> {
  const supabase = await createClient();

  // Get max sort_order
  const { data: existing } = await supabase
    .from('bookmark_folders')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (existing?.sort_order || 0) + 1;

  const { data: folder, error } = await supabase
    .from('bookmark_folders')
    .insert({
      user_id: userId,
      name: data.name,
      color: data.color || '#6366f1',
      icon: data.icon || 'folder',
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return folder;
}

export async function updateBookmarkFolder(
  folderId: string,
  userId: string,
  data: { name?: string; color?: string; icon?: string }
): Promise<BookmarkFolder> {
  const supabase = await createClient();

  const { data: folder, error } = await supabase
    .from('bookmark_folders')
    .update(data)
    .eq('id', folderId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return folder;
}

export async function deleteBookmarkFolder(folderId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('bookmark_folders')
    .delete()
    .eq('id', folderId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function reorderBookmarkFolders(
  userId: string,
  folderOrders: { id: string; sort_order: number }[]
): Promise<void> {
  const supabase = await createClient();

  // Update each folder's sort_order
  for (const { id, sort_order } of folderOrders) {
    await supabase
      .from('bookmark_folders')
      .update({ sort_order })
      .eq('id', id)
      .eq('user_id', userId);
  }
}

// ============================================================================
// BOOKMARKS
// ============================================================================

export interface GetBookmarksOptions {
  folderId?: string | null;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface BookmarksResult {
  bookmarks: BookmarkWithPost[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export async function getBookmarks(
  userId: string,
  options: GetBookmarksOptions = {}
): Promise<BookmarksResult> {
  const {
    folderId,
    search,
    page = 1,
    limit = 20,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = options;

  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('bookmarks')
    .select(
      `
      *,
      post:posts!inner(
        id,
        title,
        slug,
        excerpt,
        featured_image_url,
        reading_time,
        published_at,
        author:profiles!posts_author_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        ),
        category:categories(
          id,
          name,
          slug,
          color
        )
      )
    `,
      { count: 'exact' }
    )
    .eq('user_id', userId);

  // Filter by folder
  if (folderId === 'unfiled') {
    query = query.is('folder_id', null);
  } else if (folderId) {
    query = query.eq('folder_id', folderId);
  }

  // Search in post title/excerpt
  if (search) {
    query = query.or(`post.title.ilike.%${search}%,post.excerpt.ilike.%${search}%`);
  }

  // Sorting
  if (sortBy === 'title') {
    query = query.order('post(title)', { ascending: sortOrder === 'asc' });
  } else {
    query = query.order('created_at', { ascending: sortOrder === 'asc' });
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    bookmarks: (data || []) as BookmarkWithPost[],
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  };
}

export async function createBookmark(
  userId: string,
  postId: string,
  data?: { folderId?: string; note?: string }
): Promise<Bookmark> {
  const supabase = await createClient();

  const { data: bookmark, error } = await supabase
    .from('bookmarks')
    .insert({
      user_id: userId,
      post_id: postId,
      folder_id: data?.folderId || null,
      note: data?.note || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Post already bookmarked');
    }
    throw error;
  }

  return bookmark;
}

export async function updateBookmark(
  bookmarkId: string,
  userId: string,
  data: { folderId?: string | null; note?: string | null }
): Promise<Bookmark> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if ('folderId' in data) updateData.folder_id = data.folderId;
  if ('note' in data) updateData.note = data.note;

  const { data: bookmark, error } = await supabase
    .from('bookmarks')
    .update(updateData)
    .eq('id', bookmarkId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return bookmark;
}

export async function deleteBookmark(bookmarkId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', bookmarkId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteBookmarkByPostId(postId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function toggleBookmark(
  userId: string,
  postId: string
): Promise<{ bookmarked: boolean; bookmark?: Bookmark }> {
  const supabase = await createClient();

  // Check if already bookmarked
  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .single();

  if (existing) {
    // Remove bookmark
    await deleteBookmark(existing.id, userId);
    return { bookmarked: false };
  } else {
    // Add bookmark
    const bookmark = await createBookmark(userId, postId);
    return { bookmarked: true, bookmark };
  }
}

export async function isPostBookmarked(userId: string, postId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .single();

  return !!data;
}

export async function bulkMoveBookmarks(
  userId: string,
  bookmarkIds: string[],
  folderId: string | null
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('bookmarks')
    .update({ folder_id: folderId })
    .in('id', bookmarkIds)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function bulkDeleteBookmarks(userId: string, bookmarkIds: string[]): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .in('id', bookmarkIds)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function exportBookmarks(userId: string): Promise<BookmarkWithPost[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('bookmarks')
    .select(
      `
      *,
      folder:bookmark_folders(id, name),
      post:posts(
        id,
        title,
        slug,
        excerpt,
        featured_image_url,
        reading_time,
        published_at,
        author:profiles!posts_author_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        ),
        category:categories(
          id,
          name,
          slug,
          color
        )
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as BookmarkWithPost[];
}

export async function getBookmarkCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('bookmarks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return count || 0;
}

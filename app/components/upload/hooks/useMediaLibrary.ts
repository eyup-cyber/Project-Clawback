'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface MediaItem {
  id: string;
  url: string;
  thumbnail_url: string | null;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  media_type: 'image' | 'video' | 'audio' | null;
  alt_text: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  created_at: string;
}

interface UseMediaLibraryOptions {
  mediaType?: 'image' | 'video' | 'audio' | null;
  folder?: string;
  limit?: number;
}

export function useMediaLibrary(options: UseMediaLibraryOptions = {}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const supabase = createClient();

  const { mediaType, folder, limit = 20 } = options;

  const fetchMedia = useCallback(async (pageNum: number = 0, reset: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      let query = supabase
        .from('media')
        .select('*')
        .eq('uploader_id', user.id)
        .order('created_at', { ascending: false })
        .range(pageNum * limit, (pageNum + 1) * limit - 1);

      if (mediaType) {
        query = query.eq('media_type', mediaType);
      }

      if (folder) {
        query = query.eq('folder', folder);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mediaItems = (data || []) as MediaItem[];

      if (reset) {
        setItems(mediaItems);
      } else {
        setItems(prev => [...prev, ...mediaItems]);
      }

      setHasMore(mediaItems.length === limit);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [supabase, mediaType, folder, limit]);

  // Initial fetch
  useEffect(() => {
    void fetchMedia(0, true);
  }, [fetchMedia]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      void fetchMedia(page + 1);
    }
  }, [loading, hasMore, page, fetchMedia]);

  const refresh = useCallback(() => {
    void fetchMedia(0, true);
  }, [fetchMedia]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('media')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete media');
      throw err;
    }
  }, [supabase]);

  const updateItem = useCallback(async (id: string, updates: Partial<Pick<MediaItem, 'alt_text' | 'caption'>>) => {
    try {
      const { error: updateError } = await supabase
        .from('media')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      setItems(prev => 
        prev.map(item => 
          item.id === id ? { ...item, ...updates } : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update media');
      throw err;
    }
  }, [supabase]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    deleteItem,
    updateItem,
  };
}

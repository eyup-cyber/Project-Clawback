import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export interface RealtimeSubscriptionOptions {
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  filter?: string;
}

export const subscribeToTable = (
  table: string,
  options: RealtimeSubscriptionOptions = {}
): RealtimeChannel => {
  const client = createClient(supabaseUrl, supabaseAnonKey);

  const channel = client
    .channel(`${table}-changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: options.filter,
      },
      (payload) => {
        if (payload.eventType === 'INSERT' && options.onInsert) {
          options.onInsert(payload);
        } else if (payload.eventType === 'UPDATE' && options.onUpdate) {
          options.onUpdate(payload);
        } else if (payload.eventType === 'DELETE' && options.onDelete) {
          options.onDelete(payload);
        }
      }
    )
    .subscribe();

  return channel;
};

// ============================================
// REALTIME HOOKS
// ============================================

export const useRealtimeReactions = (postId: string, onUpdate: (count: number) => void) => {
  const channel = subscribeToTable('reactions', {
    filter: `post_id=eq.${postId}`,
    onInsert: () => {
      // Optimistic update - increment count
      onUpdate(1);
    },
    onDelete: () => {
      // Optimistic update - decrement count
      onUpdate(-1);
    },
  });

  return () => {
    void channel.unsubscribe();
  };
};

export const useRealtimeComments = (postId: string, onNewComment: (comment: any) => void) => {
  const channel = subscribeToTable('comments', {
    filter: `post_id=eq.${postId}`,
    onInsert: (payload) => {
      onNewComment(payload.new);
    },
  });

  return () => {
    void channel.unsubscribe();
  };
};

export const useRealtimeViews = (postId: string, onUpdate: (count: number) => void) => {
  const channel = subscribeToTable('posts', {
    filter: `id=eq.${postId}`,
    onUpdate: (payload) => {
      if (payload.new.view_count !== payload.old.view_count) {
        onUpdate(payload.new.view_count);
      }
    },
  });

  return () => {
    void channel.unsubscribe();
  };
};

export const useRealtimeNotifications = (
  userId: string,
  onNewNotification: (notification: any) => void
) => {
  const channel = subscribeToTable('notifications', {
    filter: `user_id=eq.${userId}`,
    onInsert: (payload) => {
      onNewNotification(payload.new);
    },
  });

  return () => {
    void channel.unsubscribe();
  };
};

// ============================================
// OPTIMISTIC UI UPDATES
// ============================================

export const optimisticUpdate = <T>(
  currentValue: T,
  updateFn: (value: T) => T,
  rollbackFn?: () => void
): T => {
  try {
    return updateFn(currentValue);
  } catch (error) {
    if (rollbackFn) rollbackFn();
    throw error;
  }
};

export const optimisticIncrement = (current: number, amount: number = 1): number => {
  return optimisticUpdate(current, (val) => val + amount);
};

export const optimisticDecrement = (current: number, amount: number = 1): number => {
  return optimisticUpdate(current, (val) => Math.max(0, val - amount));
};

export const optimisticAppend = <T>(current: T[], item: T): T[] => {
  return optimisticUpdate(current, (arr) => [...arr, item]);
};

export const optimisticRemove = <T>(current: T[], predicate: (item: T) => boolean): T[] => {
  return optimisticUpdate(current, (arr) => arr.filter((item) => !predicate(item)));
};

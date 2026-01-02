export * from './database';

// Extended types for frontend use
export interface PostWithAuthor {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  content_type: 'written' | 'video' | 'audio' | 'visual';
  featured_image_url: string | null;
  media_url: string | null;
  media_duration: number | null;
  status: 'draft' | 'pending' | 'scheduled' | 'published' | 'archived' | 'rejected';
  published_at: string | null;
  view_count: number;
  reaction_count: number;
  comment_count: number;
  reading_time: number | null;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    kofi_username: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    color: string;
  } | null;
  tags: string[];
}

export interface CommentWithAuthor {
  id: string;
  post_id: string;
  parent_id: string | null;
  content: string;
  is_pinned: boolean;
  is_author_reply: boolean;
  status: 'visible' | 'hidden' | 'flagged' | 'deleted';
  reaction_count: number;
  reply_count: number;
  created_at: string;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  replies?: CommentWithAuthor[];
}

export interface UserReaction {
  post_id: string;
  reaction_type: 'star' | 'fire' | 'heart' | 'clap' | 'think';
}

export interface ReactionCounts {
  star: number;
  fire: number;
  heart: number;
  clap: number;
  think: number;
  total: number;
}

export interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content_type: 'written' | 'video' | 'audio' | 'visual';
  featured_image_url: string | null;
  published_at: string | null;
  author_name: string;
  category_name: string | null;
}

export interface DashboardStats {
  totalPosts: number;
  totalViews: number;
  totalReactions: number;
  totalComments: number;
  viewsTrend: number;
  reactionsTrend: number;
}

export interface AdminStats {
  totalUsers: number;
  totalContributors: number;
  pendingApplications: number;
  postsThisWeek: number;
  postsThisMonth: number;
  commentsThisWeek: number;
  flaggedComments: number;
}

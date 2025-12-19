-- ============================================================================
-- PERFORMANCE INDEXES
-- Optimized indexes for common query patterns
-- ============================================================================

-- ============================================================================
-- POSTS INDEXES
-- ============================================================================

-- Index for published posts (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_published 
  ON posts(published_at DESC) 
  WHERE status = 'published';

-- Index for author's posts by status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_status 
  ON posts(author_id, status, created_at DESC);

-- Index for category filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_category_published 
  ON posts(category_id, published_at DESC) 
  WHERE status = 'published';

-- Index for slug lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_slug 
  ON posts(slug) 
  WHERE status = 'published';

-- Index for featured posts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_featured 
  ON posts(published_at DESC) 
  WHERE featured = true AND status = 'published';

-- ============================================================================
-- COMMENTS INDEXES
-- ============================================================================

-- Index for post comments with ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_post_created 
  ON comments(post_id, created_at DESC);

-- Index for user comments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user 
  ON comments(user_id, created_at DESC);

-- Index for parent comments (threaded)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_parent 
  ON comments(parent_id) 
  WHERE parent_id IS NOT NULL;

-- ============================================================================
-- REACTIONS INDEXES
-- ============================================================================

-- Index for post reactions by type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reactions_post_type 
  ON post_reactions(post_id, reaction_type);

-- Index for user's reactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reactions_user 
  ON post_reactions(user_id, post_id);

-- ============================================================================
-- PROFILES INDEXES
-- ============================================================================

-- Index for username lookups (case-insensitive)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_username_lower 
  ON profiles(LOWER(username));

-- Index for contributor lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_contributors 
  ON profiles(created_at DESC) 
  WHERE role IN ('contributor', 'editor', 'admin', 'superadmin');

-- Index for public profiles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_public 
  ON profiles(display_name) 
  WHERE bio IS NOT NULL;

-- ============================================================================
-- MEDIA INDEXES
-- ============================================================================

-- Index for user's media files
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_user_created 
  ON media_files(user_id, created_at DESC);

-- Index for media by type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_type 
  ON media_files(file_type, created_at DESC);

-- ============================================================================
-- NOTIFICATIONS INDEXES
-- ============================================================================

-- Index for unread notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread 
  ON notifications(user_id, created_at DESC) 
  WHERE read = false;

-- Index for notification type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type 
  ON notifications(user_id, type, created_at DESC);

-- ============================================================================
-- ANALYTICS INDEXES
-- ============================================================================

-- Index for post views by date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_views_date 
  ON post_views(post_id, viewed_at DESC);

-- Index for unique viewer counts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_views_unique 
  ON post_views(post_id, viewer_id) 
  WHERE viewer_id IS NOT NULL;

-- ============================================================================
-- SEARCH INDEXES
-- ============================================================================

-- Full-text search index on posts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_search_gin 
  ON posts USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(excerpt, '')));

-- Trigram index for fuzzy search (if extension available)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_title_trgm 
--   ON posts USING GIN(title gin_trgm_ops);

-- ============================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- Daily post statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_post_stats AS
SELECT 
  DATE(pv.viewed_at) as date,
  pv.post_id,
  COUNT(*) as views,
  COUNT(DISTINCT pv.viewer_id) as unique_viewers,
  COUNT(DISTINCT pv.session_id) as sessions
FROM post_views pv
WHERE pv.viewed_at > NOW() - INTERVAL '90 days'
GROUP BY DATE(pv.viewed_at), pv.post_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_post_stats 
  ON mv_daily_post_stats(date, post_id);

-- Author statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_author_stats AS
SELECT 
  p.author_id,
  COUNT(*) as total_posts,
  COUNT(*) FILTER (WHERE p.status = 'published') as published_posts,
  SUM(pv.view_count) as total_views,
  MAX(p.published_at) as last_published
FROM posts p
LEFT JOIN (
  SELECT post_id, COUNT(*) as view_count 
  FROM post_views 
  GROUP BY post_id
) pv ON pv.post_id = p.id
GROUP BY p.author_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_author_stats 
  ON mv_author_stats(author_id);

-- ============================================================================
-- REFRESH FUNCTIONS
-- ============================================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_post_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_author_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- ============================================================================

-- Recent posts (last 30 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_recent 
  ON posts(published_at DESC) 
  WHERE status = 'published' 
  AND published_at > NOW() - INTERVAL '30 days';

-- Pending approval posts (for editors)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_pending 
  ON posts(created_at DESC) 
  WHERE status = 'pending';

-- ============================================================================
-- COMPOSITE INDEXES FOR JOINS
-- ============================================================================

-- Posts with author info
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_with_author 
  ON posts(status, published_at DESC, author_id);

-- Comments with user info
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_with_user 
  ON comments(post_id, created_at DESC, user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_posts_published IS 'Optimized index for fetching published posts';
COMMENT ON INDEX idx_posts_author_status IS 'Index for author dashboard queries';
COMMENT ON MATERIALIZED VIEW mv_daily_post_stats IS 'Pre-aggregated daily statistics for posts';
COMMENT ON MATERIALIZED VIEW mv_author_stats IS 'Pre-aggregated statistics per author';

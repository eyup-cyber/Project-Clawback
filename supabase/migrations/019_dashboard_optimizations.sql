-- ============================================================================
-- DASHBOARD OPTIMIZATIONS
-- Phase 2.1: Optimize dashboard API performance
-- ============================================================================

-- ============================================================================
-- ADDITIONAL INDEXES FOR DASHBOARD QUERIES
-- ============================================================================

-- Index for dashboard stats: user's posts by status with timestamps
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_updated 
  ON posts(author_id, updated_at DESC);

-- Index for reactions with timestamps (for period-based filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reactions_post_created 
  ON reactions(post_id, created_at DESC);

-- Index for post views with viewer and timestamp
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_views_post_viewer_date 
  ON post_views(post_id, viewer_id, created_at DESC);

-- Composite index for follows by type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follows_following_type 
  ON follows(following_id, following_type);

-- ============================================================================
-- DASHBOARD STATS FUNCTION
-- Optimized function to get all dashboard stats in a single query
-- ============================================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_user_id UUID,
  p_period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_posts BIGINT,
  published_posts BIGINT,
  draft_posts BIGINT,
  scheduled_posts BIGINT,
  total_views BIGINT,
  total_comments BIGINT,
  total_likes BIGINT,
  followers BIGINT,
  current_period_views BIGINT,
  previous_period_views BIGINT,
  current_period_comments BIGINT,
  previous_period_comments BIGINT,
  current_period_likes BIGINT,
  previous_period_likes BIGINT
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_previous_start TIMESTAMPTZ;
BEGIN
  v_start_date := NOW() - (p_period_days || ' days')::INTERVAL;
  v_previous_start := v_start_date - (p_period_days || ' days')::INTERVAL;
  
  RETURN QUERY
  WITH post_ids AS (
    SELECT id FROM posts WHERE author_id = p_user_id
  ),
  post_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'published') as published,
      COUNT(*) FILTER (WHERE status = 'draft') as draft,
      COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
      COALESCE(SUM(view_count), 0) as views
    FROM posts 
    WHERE author_id = p_user_id
  ),
  comment_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE created_at >= v_start_date) as current_period,
      COUNT(*) FILTER (WHERE created_at >= v_previous_start AND created_at < v_start_date) as previous_period
    FROM comments 
    WHERE post_id IN (SELECT id FROM post_ids)
  ),
  reaction_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE created_at >= v_start_date) as current_period,
      COUNT(*) FILTER (WHERE created_at >= v_previous_start AND created_at < v_start_date) as previous_period
    FROM reactions 
    WHERE post_id IN (SELECT id FROM post_ids)
  ),
  view_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE created_at >= v_start_date) as current_period,
      COUNT(*) FILTER (WHERE created_at >= v_previous_start AND created_at < v_start_date) as previous_period
    FROM post_views 
    WHERE post_id IN (SELECT id FROM post_ids)
  ),
  follower_stats AS (
    SELECT COUNT(*) as total
    FROM follows 
    WHERE following_id = p_user_id AND following_type = 'user'
  )
  SELECT 
    ps.total::BIGINT,
    ps.published::BIGINT,
    ps.draft::BIGINT,
    ps.scheduled::BIGINT,
    ps.views::BIGINT,
    cs.total::BIGINT,
    rs.total::BIGINT,
    fs.total::BIGINT,
    COALESCE(vs.current_period, 0)::BIGINT,
    COALESCE(vs.previous_period, 0)::BIGINT,
    COALESCE(cs.current_period, 0)::BIGINT,
    COALESCE(cs.previous_period, 0)::BIGINT,
    COALESCE(rs.current_period, 0)::BIGINT,
    COALESCE(rs.previous_period, 0)::BIGINT
  FROM post_stats ps
  CROSS JOIN comment_stats cs
  CROSS JOIN reaction_stats rs
  CROSS JOIN view_stats vs
  CROSS JOIN follower_stats fs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PERFORMANCE DATA FUNCTION
-- Get time-series performance data for charts
-- ============================================================================

CREATE OR REPLACE FUNCTION get_performance_data(
  p_user_id UUID,
  p_period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  views BIGINT,
  comments BIGINT,
  likes BIGINT
) AS $$
DECLARE
  v_start_date DATE;
BEGIN
  v_start_date := CURRENT_DATE - p_period_days;
  
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(v_start_date, CURRENT_DATE, '1 day'::INTERVAL)::DATE as date
  ),
  post_ids AS (
    SELECT id FROM posts WHERE author_id = p_user_id
  ),
  daily_views AS (
    SELECT 
      DATE(created_at) as view_date,
      COUNT(*) as count
    FROM post_views
    WHERE post_id IN (SELECT id FROM post_ids)
      AND created_at >= v_start_date
    GROUP BY DATE(created_at)
  ),
  daily_comments AS (
    SELECT 
      DATE(created_at) as comment_date,
      COUNT(*) as count
    FROM comments
    WHERE post_id IN (SELECT id FROM post_ids)
      AND created_at >= v_start_date
    GROUP BY DATE(created_at)
  ),
  daily_reactions AS (
    SELECT 
      DATE(created_at) as reaction_date,
      COUNT(*) as count
    FROM reactions
    WHERE post_id IN (SELECT id FROM post_ids)
      AND created_at >= v_start_date
    GROUP BY DATE(created_at)
  )
  SELECT 
    ds.date,
    COALESCE(dv.count, 0)::BIGINT as views,
    COALESCE(dc.count, 0)::BIGINT as comments,
    COALESCE(dr.count, 0)::BIGINT as likes
  FROM date_series ds
  LEFT JOIN daily_views dv ON ds.date = dv.view_date
  LEFT JOIN daily_comments dc ON ds.date = dc.comment_date
  LEFT JOIN daily_reactions dr ON ds.date = dr.reaction_date
  ORDER BY ds.date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RECENT POSTS WITH ENGAGEMENT FUNCTION
-- Get recent posts with comment counts in a single query
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recent_posts_with_engagement(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  status TEXT,
  views BIGINT,
  comments BIGINT,
  likes BIGINT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.slug,
    p.status,
    COALESCE(p.view_count, 0)::BIGINT as views,
    COALESCE(p.comment_count, 0)::BIGINT as comments,
    COALESCE(p.reaction_count, 0)::BIGINT as likes,
    p.published_at,
    p.created_at,
    p.updated_at
  FROM posts p
  WHERE p.author_id = p_user_id
  ORDER BY p.updated_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TOP PERFORMING POSTS FUNCTION
-- Get top performing posts by engagement
-- ============================================================================

CREATE OR REPLACE FUNCTION get_top_performing_posts(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5,
  p_sort_by TEXT DEFAULT 'views' -- 'views', 'comments', 'reactions', 'engagement'
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  views BIGINT,
  comments BIGINT,
  likes BIGINT,
  engagement_score BIGINT,
  published_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.slug,
    COALESCE(p.view_count, 0)::BIGINT as views,
    COALESCE(p.comment_count, 0)::BIGINT as comments,
    COALESCE(p.reaction_count, 0)::BIGINT as likes,
    (COALESCE(p.view_count, 0) + COALESCE(p.comment_count, 0) * 10 + COALESCE(p.reaction_count, 0) * 5)::BIGINT as engagement_score,
    p.published_at
  FROM posts p
  WHERE p.author_id = p_user_id
    AND p.status = 'published'
  ORDER BY 
    CASE p_sort_by
      WHEN 'views' THEN p.view_count
      WHEN 'comments' THEN p.comment_count
      WHEN 'reactions' THEN p.reaction_count
      WHEN 'engagement' THEN (COALESCE(p.view_count, 0) + COALESCE(p.comment_count, 0) * 10 + COALESCE(p.reaction_count, 0) * 5)
      ELSE p.view_count
    END DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_dashboard_stats IS 'Optimized function to get all dashboard statistics in a single database call';
COMMENT ON FUNCTION get_performance_data IS 'Get time-series performance data for dashboard charts';
COMMENT ON FUNCTION get_recent_posts_with_engagement IS 'Get recent posts with engagement metrics efficiently';
COMMENT ON FUNCTION get_top_performing_posts IS 'Get top performing posts sorted by engagement metrics';

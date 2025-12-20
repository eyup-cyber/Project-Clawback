-- ============================================================================
-- BOOKMARKS AND READING HISTORY
-- Phase 1.3.4-1.3.6: Complete bookmarking and reading progress system
-- ============================================================================

-- ============================================================================
-- BOOKMARK FOLDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS bookmark_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  is_private BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_bookmark_folders_user ON bookmark_folders(user_id, sort_order);

-- RLS
ALTER TABLE bookmark_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmark folders"
  ON bookmark_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own bookmark folders"
  ON bookmark_folders FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- BOOKMARKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES bookmark_folders(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_folder ON bookmarks(user_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post ON bookmarks(post_id);

-- RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own bookmarks"
  ON bookmarks FOR ALL
  USING (auth.uid() = user_id);

-- Update post bookmark count trigger
CREATE OR REPLACE FUNCTION update_post_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET bookmark_count = COALESCE(bookmark_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET bookmark_count = GREATEST(0, COALESCE(bookmark_count, 0) - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookmarks_update_counts ON bookmarks;
CREATE TRIGGER bookmarks_update_counts
  AFTER INSERT OR DELETE ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_post_bookmark_count();

-- Add bookmark_count to posts if not exists
ALTER TABLE posts ADD COLUMN IF NOT EXISTS bookmark_count INTEGER DEFAULT 0;

-- ============================================================================
-- READING HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS reading_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  progress DECIMAL(5,4) DEFAULT 0,
  scroll_position INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  first_read_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_reading_history_user ON reading_history(user_id, last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_history_user_incomplete ON reading_history(user_id, last_read_at DESC) 
  WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reading_history_post ON reading_history(post_id);

-- RLS
ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reading history"
  ON reading_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own reading history"
  ON reading_history FOR ALL
  USING (auth.uid() = user_id);

-- Function to upsert reading progress
CREATE OR REPLACE FUNCTION upsert_reading_progress(
  p_user_id UUID,
  p_post_id UUID,
  p_progress DECIMAL,
  p_scroll_position INTEGER,
  p_time_spent INTEGER
)
RETURNS reading_history AS $$
DECLARE
  result reading_history;
BEGIN
  INSERT INTO reading_history (user_id, post_id, progress, scroll_position, time_spent_seconds)
  VALUES (p_user_id, p_post_id, p_progress, p_scroll_position, p_time_spent)
  ON CONFLICT (user_id, post_id) DO UPDATE SET
    progress = GREATEST(reading_history.progress, EXCLUDED.progress),
    scroll_position = EXCLUDED.scroll_position,
    time_spent_seconds = reading_history.time_spent_seconds + EXCLUDED.time_spent_seconds,
    last_read_at = NOW(),
    completed_at = CASE 
      WHEN GREATEST(reading_history.progress, EXCLUDED.progress) >= 0.9 
        AND reading_history.completed_at IS NULL 
      THEN NOW() 
      ELSE reading_history.completed_at 
    END
  RETURNING * INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get continue reading list
CREATE OR REPLACE FUNCTION get_continue_reading(p_user_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  post_id UUID,
  progress DECIMAL,
  last_read_at TIMESTAMPTZ,
  time_spent_seconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT rh.post_id, rh.progress, rh.last_read_at, rh.time_spent_seconds
  FROM reading_history rh
  JOIN posts p ON rh.post_id = p.id
  WHERE rh.user_id = p_user_id
    AND rh.completed_at IS NULL
    AND rh.progress < 0.9
    AND p.status = 'published'
  ORDER BY rh.last_read_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get reading stats
CREATE OR REPLACE FUNCTION get_reading_stats(p_user_id UUID)
RETURNS TABLE (
  total_articles INTEGER,
  completed_articles INTEGER,
  total_time_seconds BIGINT,
  current_streak INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*)::INTEGER as total,
      COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::INTEGER as completed,
      COALESCE(SUM(time_spent_seconds), 0)::BIGINT as total_time
    FROM reading_history
    WHERE user_id = p_user_id
  ),
  streak AS (
    SELECT COUNT(DISTINCT DATE(last_read_at))::INTEGER as days
    FROM reading_history
    WHERE user_id = p_user_id
      AND last_read_at >= CURRENT_DATE - INTERVAL '30 days'
  )
  SELECT s.total, s.completed, s.total_time, st.days
  FROM stats s, streak st;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FOLLOWS TABLE
-- Phase 1.3.7: Following users, categories, and tags
-- ============================================================================

CREATE TYPE IF NOT EXISTS follow_type AS ENUM ('user', 'category', 'tag');

CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_type follow_type NOT NULL,
  following_id UUID NOT NULL,
  notify_new_posts BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_type, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id, following_type);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_type, following_id);

-- RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own follows"
  ON follows FOR SELECT
  USING (auth.uid() = follower_id);

CREATE POLICY "Users can view who follows them"
  ON follows FOR SELECT
  USING (
    following_type = 'user' 
    AND following_id = auth.uid()
  );

CREATE POLICY "Users can manage own follows"
  ON follows FOR ALL
  USING (auth.uid() = follower_id);

-- Update follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update follower's following_count
    UPDATE profiles SET following_count = COALESCE(following_count, 0) + 1 
    WHERE id = NEW.follower_id;
    
    -- Update followed user's follower_count (if following a user)
    IF NEW.following_type = 'user' THEN
      UPDATE profiles SET follower_count = COALESCE(follower_count, 0) + 1 
      WHERE id = NEW.following_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update follower's following_count
    UPDATE profiles SET following_count = GREATEST(0, COALESCE(following_count, 0) - 1) 
    WHERE id = OLD.follower_id;
    
    -- Update followed user's follower_count (if following a user)
    IF OLD.following_type = 'user' THEN
      UPDATE profiles SET follower_count = GREATEST(0, COALESCE(follower_count, 0) - 1) 
      WHERE id = OLD.following_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS follows_update_counts ON follows;
CREATE TRIGGER follows_update_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Function to get suggested follows
CREATE OR REPLACE FUNCTION get_suggested_follows(
  p_user_id UUID, 
  p_type follow_type, 
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  follower_count INTEGER
) AS $$
BEGIN
  IF p_type = 'user' THEN
    RETURN QUERY
    SELECT p.id, p.display_name as name, COALESCE(p.follower_count, 0)::INTEGER
    FROM profiles p
    WHERE p.id != p_user_id
      AND p.role IN ('contributor', 'editor', 'admin')
      AND p.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM follows f 
        WHERE f.follower_id = p_user_id 
          AND f.following_type = 'user' 
          AND f.following_id = p.id
      )
    ORDER BY p.follower_count DESC, p.article_count DESC
    LIMIT p_limit;
  ELSIF p_type = 'category' THEN
    RETURN QUERY
    SELECT c.id, c.name, c.post_count::INTEGER as follower_count
    FROM categories c
    WHERE NOT EXISTS (
      SELECT 1 FROM follows f 
      WHERE f.follower_id = p_user_id 
        AND f.following_type = 'category' 
        AND f.following_id = c.id
    )
    ORDER BY c.post_count DESC
    LIMIT p_limit;
  ELSIF p_type = 'tag' THEN
    RETURN QUERY
    SELECT t.id, t.name, t.post_count::INTEGER as follower_count
    FROM tags t
    WHERE NOT EXISTS (
      SELECT 1 FROM follows f 
      WHERE f.follower_id = p_user_id 
        AND f.following_type = 'tag' 
        AND f.following_id = t.id
    )
    ORDER BY t.post_count DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updated_at
CREATE TRIGGER update_bookmark_folders_updated_at
  BEFORE UPDATE ON bookmark_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE bookmark_folders IS 'User-created folders for organizing bookmarks';
COMMENT ON TABLE bookmarks IS 'User bookmarks for posts with optional notes';
COMMENT ON TABLE reading_history IS 'Tracks user reading progress and history';
COMMENT ON TABLE follows IS 'User follows for users, categories, and tags';

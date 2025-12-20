-- ============================================
-- Migration: 012_content_versioning
-- Content versioning and history tracking
-- ============================================

-- Post versions table for storing historical content
CREATE TABLE IF NOT EXISTS post_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image_url TEXT,
  content_type TEXT NOT NULL DEFAULT 'written',
  metadata JSONB DEFAULT '{}',
  
  -- Version metadata
  change_summary TEXT,
  change_type TEXT NOT NULL DEFAULT 'edit', -- 'create', 'edit', 'publish', 'revert', 'autosave'
  
  -- Author information
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Word/character counts for diff display
  word_count INTEGER,
  character_count INTEGER,
  
  -- Constraints
  CONSTRAINT unique_post_version UNIQUE(post_id, version_number)
);

-- Index for fast version lookups
CREATE INDEX IF NOT EXISTS idx_post_versions_post_id ON post_versions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_versions_created_at ON post_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_versions_created_by ON post_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_post_versions_type ON post_versions(change_type);

-- Add current_version tracking to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES profiles(id);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

-- Function to create a version snapshot
CREATE OR REPLACE FUNCTION create_post_version(
  p_post_id UUID,
  p_created_by UUID,
  p_change_type TEXT DEFAULT 'edit',
  p_change_summary TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_version_number INTEGER;
  v_version_id UUID;
  v_post RECORD;
BEGIN
  -- Get current version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
  FROM post_versions
  WHERE post_id = p_post_id;

  -- Get current post data
  SELECT * INTO v_post FROM posts WHERE id = p_post_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found: %', p_post_id;
  END IF;

  -- Create version snapshot
  INSERT INTO post_versions (
    post_id,
    version_number,
    title,
    content,
    excerpt,
    featured_image_url,
    content_type,
    metadata,
    change_summary,
    change_type,
    created_by,
    word_count,
    character_count
  )
  VALUES (
    p_post_id,
    v_version_number,
    v_post.title,
    v_post.content,
    v_post.excerpt,
    v_post.featured_image_url,
    v_post.content_type,
    COALESCE(v_post.metadata, '{}'),
    p_change_summary,
    p_change_type,
    p_created_by,
    array_length(regexp_split_to_array(v_post.content, '\s+'), 1),
    length(v_post.content)
  )
  RETURNING id INTO v_version_id;

  -- Update post current version
  UPDATE posts
  SET current_version = v_version_number,
      last_edited_by = p_created_by,
      last_edited_at = NOW()
  WHERE id = p_post_id;

  RETURN v_version_id;
END;
$$;

-- Function to restore a post from a version
CREATE OR REPLACE FUNCTION restore_post_version(
  p_post_id UUID,
  p_version_number INTEGER,
  p_restored_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_version RECORD;
  v_new_version_id UUID;
BEGIN
  -- Get the version to restore
  SELECT * INTO v_version
  FROM post_versions
  WHERE post_id = p_post_id AND version_number = p_version_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version % not found for post %', p_version_number, p_post_id;
  END IF;

  -- First create a snapshot of current state
  SELECT create_post_version(p_post_id, p_restored_by, 'revert', 'Before reverting to version ' || p_version_number)
  INTO v_new_version_id;

  -- Restore the post content
  UPDATE posts
  SET title = v_version.title,
      content = v_version.content,
      excerpt = v_version.excerpt,
      featured_image_url = v_version.featured_image_url,
      content_type = v_version.content_type,
      metadata = v_version.metadata,
      updated_at = NOW()
  WHERE id = p_post_id;

  -- Create a new version for the restored state
  SELECT create_post_version(p_post_id, p_restored_by, 'revert', 'Restored to version ' || p_version_number)
  INTO v_new_version_id;

  RETURN v_new_version_id;
END;
$$;

-- Function to compare two versions
CREATE OR REPLACE FUNCTION compare_post_versions(
  p_post_id UUID,
  p_version_a INTEGER,
  p_version_b INTEGER
)
RETURNS TABLE (
  field_name TEXT,
  version_a_value TEXT,
  version_b_value TEXT,
  has_changed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_a RECORD;
  v_b RECORD;
BEGIN
  SELECT * INTO v_a FROM post_versions WHERE post_id = p_post_id AND version_number = p_version_a;
  SELECT * INTO v_b FROM post_versions WHERE post_id = p_post_id AND version_number = p_version_b;

  IF v_a.id IS NULL OR v_b.id IS NULL THEN
    RAISE EXCEPTION 'One or both versions not found';
  END IF;

  RETURN QUERY
  SELECT 'title'::TEXT, v_a.title::TEXT, v_b.title::TEXT, v_a.title IS DISTINCT FROM v_b.title
  UNION ALL
  SELECT 'excerpt'::TEXT, v_a.excerpt::TEXT, v_b.excerpt::TEXT, v_a.excerpt IS DISTINCT FROM v_b.excerpt
  UNION ALL
  SELECT 'content'::TEXT, v_a.content::TEXT, v_b.content::TEXT, v_a.content IS DISTINCT FROM v_b.content
  UNION ALL
  SELECT 'featured_image_url'::TEXT, v_a.featured_image_url::TEXT, v_b.featured_image_url::TEXT, v_a.featured_image_url IS DISTINCT FROM v_b.featured_image_url;
END;
$$;

-- Trigger to auto-create version on significant changes
CREATE OR REPLACE FUNCTION auto_version_post()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create version if content actually changed
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
    -- Create version if more than 5 minutes since last version
    IF NOT EXISTS (
      SELECT 1 FROM post_versions
      WHERE post_id = NEW.id
      AND created_at > NOW() - INTERVAL '5 minutes'
    ) THEN
      PERFORM create_post_version(NEW.id, COALESCE(NEW.last_edited_by, NEW.author_id), 'edit', 'Auto-saved');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Enable trigger
DROP TRIGGER IF EXISTS trigger_auto_version_post ON posts;
CREATE TRIGGER trigger_auto_version_post
  AFTER UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION auto_version_post();

-- RLS Policies
ALTER TABLE post_versions ENABLE ROW LEVEL SECURITY;

-- Authors and editors can view versions of their own posts
CREATE POLICY "Authors can view own post versions"
  ON post_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_versions.post_id
      AND posts.author_id = auth.uid()
    )
  );

-- Editors and admins can view all versions
CREATE POLICY "Editors can view all versions"
  ON post_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('editor', 'admin')
    )
  );

-- No direct insert/update/delete - use functions instead
CREATE POLICY "No direct inserts"
  ON post_versions
  FOR INSERT
  WITH CHECK (FALSE);

-- Grant function execution to authenticated users
GRANT EXECUTE ON FUNCTION create_post_version TO authenticated;
GRANT EXECUTE ON FUNCTION restore_post_version TO authenticated;
GRANT EXECUTE ON FUNCTION compare_post_versions TO authenticated;

-- ============================================
-- Autosave support
-- ============================================

-- Autosave drafts table (separate from versions for performance)
CREATE TABLE IF NOT EXISTS post_autosaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  excerpt TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One autosave per user per post
  CONSTRAINT unique_user_autosave UNIQUE(post_id, user_id)
);

-- Index for autosave lookups
CREATE INDEX IF NOT EXISTS idx_post_autosaves_user ON post_autosaves(user_id);
CREATE INDEX IF NOT EXISTS idx_post_autosaves_post ON post_autosaves(post_id);

-- RLS for autosaves
ALTER TABLE post_autosaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own autosaves"
  ON post_autosaves
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to save autosave
CREATE OR REPLACE FUNCTION save_post_autosave(
  p_post_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_excerpt TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_autosave_id UUID;
BEGIN
  INSERT INTO post_autosaves (post_id, user_id, title, content, excerpt, metadata)
  VALUES (p_post_id, auth.uid(), p_title, p_content, p_excerpt, p_metadata)
  ON CONFLICT (post_id, user_id)
  DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    excerpt = EXCLUDED.excerpt,
    metadata = EXCLUDED.metadata,
    created_at = NOW()
  RETURNING id INTO v_autosave_id;

  RETURN v_autosave_id;
END;
$$;

-- Grant autosave function
GRANT EXECUTE ON FUNCTION save_post_autosave TO authenticated;

-- ============================================
-- Cleanup old versions (optional retention policy)
-- ============================================

-- Function to clean up old versions keeping last N
CREATE OR REPLACE FUNCTION cleanup_old_versions(
  p_keep_count INTEGER DEFAULT 50
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  WITH versions_to_delete AS (
    SELECT id
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY post_id ORDER BY version_number DESC) as rn
      FROM post_versions
    ) ranked
    WHERE rn > p_keep_count
  )
  DELETE FROM post_versions
  WHERE id IN (SELECT id FROM versions_to_delete);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE post_versions IS 'Stores historical versions of posts for revision tracking';
COMMENT ON TABLE post_autosaves IS 'Temporary autosave storage for draft recovery';
COMMENT ON FUNCTION create_post_version IS 'Creates a new version snapshot of a post';
COMMENT ON FUNCTION restore_post_version IS 'Restores a post to a previous version';
COMMENT ON FUNCTION compare_post_versions IS 'Compares two versions of a post';

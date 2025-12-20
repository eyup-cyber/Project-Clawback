-- ============================================================================
-- POST VERSIONS
-- Phase 1.2.4: Version history for posts with diff and restore
-- ============================================================================

CREATE TABLE IF NOT EXISTS post_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content JSONB,
  content_html TEXT,
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_post_versions_post ON post_versions(post_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_post_versions_author ON post_versions(author_id);

-- RLS
ALTER TABLE post_versions ENABLE ROW LEVEL SECURITY;

-- Authors and editors can view versions of posts
CREATE POLICY "Authors can view own post versions"
  ON post_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_versions.post_id
      AND (
        p.author_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles pr
          WHERE pr.id = auth.uid()
          AND pr.role IN ('editor', 'admin', 'superadmin')
        )
      )
    )
  );

CREATE POLICY "Service role can manage versions"
  ON post_versions FOR ALL
  USING (auth.role() = 'service_role');

-- Function to auto-increment version number
CREATE OR REPLACE FUNCTION next_post_version_number()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO NEW.version_number
  FROM post_versions
  WHERE post_id = NEW.post_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS post_versions_auto_number ON post_versions;
CREATE TRIGGER post_versions_auto_number
  BEFORE INSERT ON post_versions
  FOR EACH ROW EXECUTE FUNCTION next_post_version_number();

-- Function to create a new version from current post state
CREATE OR REPLACE FUNCTION create_post_version(
  p_post_id UUID,
  p_author_id UUID,
  p_change_summary TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_version_id UUID;
BEGIN
  INSERT INTO post_versions (post_id, author_id, title, content, content_html, change_summary)
  SELECT 
    p.id, 
    p_author_id, 
    p.title, 
    p.content, 
    p.content_html, 
    p_change_summary
  FROM posts p
  WHERE p.id = p_post_id
  RETURNING id INTO new_version_id;
  
  RETURN new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a post to a specific version
CREATE OR REPLACE FUNCTION restore_post_version(p_version_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v post_versions;
BEGIN
  SELECT * INTO v FROM post_versions WHERE id = p_version_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Create a version of the current state before restoring
  PERFORM create_post_version(v.post_id, auth.uid(), 'Before restore to version ' || v.version_number);
  
  -- Restore the post
  UPDATE posts
  SET 
    title = v.title,
    content = v.content,
    content_html = v.content_html,
    updated_at = NOW()
  WHERE id = v.post_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get version diff (simplified - returns both versions for client-side diff)
CREATE OR REPLACE FUNCTION get_post_version_comparison(
  p_version_a_id UUID,
  p_version_b_id UUID
)
RETURNS TABLE (
  version_a JSONB,
  version_b JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT to_jsonb(v1) FROM post_versions v1 WHERE id = p_version_a_id) as version_a,
    (SELECT to_jsonb(v2) FROM post_versions v2 WHERE id = p_version_b_id) as version_b;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create version on significant post updates
CREATE OR REPLACE FUNCTION auto_create_post_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if title or content changed
  IF OLD.title IS DISTINCT FROM NEW.title 
     OR OLD.content IS DISTINCT FROM NEW.content 
     OR OLD.content_html IS DISTINCT FROM NEW.content_html THEN
    
    -- Only if a version wasn't just created (within last 5 minutes)
    IF NOT EXISTS (
      SELECT 1 FROM post_versions
      WHERE post_id = OLD.id
      AND created_at > NOW() - INTERVAL '5 minutes'
    ) THEN
      INSERT INTO post_versions (post_id, author_id, title, content, content_html, change_summary)
      VALUES (OLD.id, auth.uid(), OLD.title, OLD.content, OLD.content_html, 'Auto-saved');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Enable this trigger if you want auto-versioning
-- DROP TRIGGER IF EXISTS posts_auto_version ON posts;
-- CREATE TRIGGER posts_auto_version
--   BEFORE UPDATE ON posts
--   FOR EACH ROW EXECUTE FUNCTION auto_create_post_version();

COMMENT ON TABLE post_versions IS 'Version history for posts, enables restore and diff';

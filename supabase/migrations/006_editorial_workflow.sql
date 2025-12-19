-- Migration: 006_editorial_workflow.sql
-- Description: Add editorial assignments and post revision history tables

-- Editorial assignments table
-- Tracks which editor is reviewing a specific post
CREATE TABLE IF NOT EXISTS public.editorial_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  editor_id UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE (post_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_editorial_assignments_editor 
  ON public.editorial_assignments(editor_id);
CREATE INDEX IF NOT EXISTS idx_editorial_assignments_post 
  ON public.editorial_assignments(post_id);

-- RLS policies for editorial_assignments
ALTER TABLE public.editorial_assignments ENABLE ROW LEVEL SECURITY;

-- Editors can see all assignments
CREATE POLICY "Editors can view all assignments" 
  ON public.editorial_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('editor', 'admin', 'superadmin')
    )
  );

-- Editors can create assignments
CREATE POLICY "Editors can create assignments" 
  ON public.editorial_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('editor', 'admin', 'superadmin')
    )
  );

-- Editors can update their own assignments
CREATE POLICY "Editors can update their assignments" 
  ON public.editorial_assignments
  FOR UPDATE
  USING (
    editor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Admins can delete assignments
CREATE POLICY "Admins can delete assignments" 
  ON public.editorial_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Post revision history table
-- Stores previous versions of posts for auditing and rollback
CREATE TABLE IF NOT EXISTS public.post_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content JSONB,
  content_html TEXT,
  title TEXT,
  subtitle TEXT,
  revision_note TEXT,
  revision_type TEXT DEFAULT 'manual' CHECK (revision_type IN ('manual', 'autosave', 'editorial', 'publish')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_post_revisions_post 
  ON public.post_revisions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_revisions_created_at 
  ON public.post_revisions(created_at DESC);

-- RLS policies for post_revisions
ALTER TABLE public.post_revisions ENABLE ROW LEVEL SECURITY;

-- Authors can see revisions of their own posts
CREATE POLICY "Authors can view their post revisions" 
  ON public.post_revisions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_revisions.post_id 
      AND posts.author_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('editor', 'admin', 'superadmin')
    )
  );

-- Authors can create revisions for their own posts
CREATE POLICY "Authors can create revisions for their posts" 
  ON public.post_revisions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_revisions.post_id 
      AND posts.author_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('editor', 'admin', 'superadmin')
    )
  );

-- Function to automatically save revision when post is updated
CREATE OR REPLACE FUNCTION save_post_revision()
RETURNS TRIGGER AS $$
BEGIN
  -- Only save revision if content or title changed
  IF OLD.content IS DISTINCT FROM NEW.content 
     OR OLD.content_html IS DISTINCT FROM NEW.content_html
     OR OLD.title IS DISTINCT FROM NEW.title
     OR OLD.subtitle IS DISTINCT FROM NEW.subtitle THEN
    INSERT INTO post_revisions (
      post_id, 
      content, 
      content_html, 
      title, 
      subtitle, 
      revision_type,
      created_by
    ) VALUES (
      OLD.id, 
      OLD.content, 
      OLD.content_html, 
      OLD.title, 
      OLD.subtitle,
      CASE 
        WHEN OLD.status != NEW.status AND NEW.status = 'published' THEN 'publish'
        WHEN OLD.status = 'pending' AND NEW.status IN ('draft', 'rejected') THEN 'editorial'
        ELSE 'manual'
      END,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic revision saving
DROP TRIGGER IF EXISTS save_post_revision_trigger ON posts;
CREATE TRIGGER save_post_revision_trigger
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION save_post_revision();

-- Notifications table enhancement - add new notification types if not exists
DO $$ 
BEGIN
  -- Add post_changes_requested type to notifications if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    -- The notifications table should already exist from migration 002
    -- This is just a safety check
    NULL;
  END IF;
END $$;

-- Create view for editorial dashboard statistics
CREATE OR REPLACE VIEW editorial_stats AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'published') as published_today_count,
  COUNT(*) FILTER (WHERE status = 'rejected' AND updated_at > NOW() - INTERVAL '7 days') as rejected_week_count,
  (SELECT COUNT(*) FROM editorial_assignments WHERE completed_at IS NULL) as active_assignments
FROM posts
WHERE updated_at > NOW() - INTERVAL '24 hours' OR status = 'pending';

-- Grant access to the view
GRANT SELECT ON editorial_stats TO authenticated;

COMMENT ON TABLE editorial_assignments IS 'Tracks which editor is reviewing a specific post';
COMMENT ON TABLE post_revisions IS 'Stores historical versions of posts for auditing and rollback';
COMMENT ON VIEW editorial_stats IS 'Dashboard statistics for editorial team';

-- ============================================
-- Migration: 013_content_templates
-- Post templates and content scheduling
-- ============================================

-- ============================================
-- Content Scheduling
-- ============================================

-- Add scheduled publishing to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS schedule_status TEXT DEFAULT NULL; -- 'pending', 'published', 'failed'

-- Index for scheduled posts
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(scheduled_at)
  WHERE scheduled_at IS NOT NULL AND status = 'draft';

-- Function to publish scheduled posts
CREATE OR REPLACE FUNCTION publish_scheduled_posts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE posts
  SET status = 'published',
      published_at = NOW(),
      schedule_status = 'published'
  WHERE scheduled_at <= NOW()
    AND scheduled_at IS NOT NULL
    AND status = 'draft'
    AND schedule_status = 'pending';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to schedule a post
CREATE OR REPLACE FUNCTION schedule_post(
  p_post_id UUID,
  p_scheduled_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_scheduled_at <= NOW() THEN
    RAISE EXCEPTION 'Scheduled time must be in the future';
  END IF;

  UPDATE posts
  SET scheduled_at = p_scheduled_at,
      schedule_status = 'pending',
      status = 'draft'
  WHERE id = p_post_id;

  RETURN FOUND;
END;
$$;

-- Grant functions
GRANT EXECUTE ON FUNCTION publish_scheduled_posts TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_post TO authenticated;

-- ============================================
-- Content Templates
-- ============================================

-- Post templates table
CREATE TABLE IF NOT EXISTS post_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'written',
  
  -- Template content
  title_template TEXT,
  content_template TEXT NOT NULL,
  excerpt_template TEXT,
  
  -- Template metadata
  default_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  default_tags TEXT[],
  metadata JSONB DEFAULT '{}',
  
  -- Structure hints for the editor
  structure JSONB DEFAULT '{}', -- Defines expected sections, fields, etc.
  
  -- Access control
  visibility TEXT NOT NULL DEFAULT 'private', -- 'private', 'team', 'public'
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Usage tracking
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON post_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_visibility ON post_templates(visibility);
CREATE INDEX IF NOT EXISTS idx_templates_content_type ON post_templates(content_type);
CREATE INDEX IF NOT EXISTS idx_templates_use_count ON post_templates(use_count DESC);

-- RLS
ALTER TABLE post_templates ENABLE ROW LEVEL SECURITY;

-- Users can view public templates
CREATE POLICY "Anyone can view public templates"
  ON post_templates
  FOR SELECT
  USING (visibility = 'public');

-- Users can view their own templates
CREATE POLICY "Users can view own templates"
  ON post_templates
  FOR SELECT
  USING (created_by = auth.uid());

-- Team members can view team templates
CREATE POLICY "Team can view team templates"
  ON post_templates
  FOR SELECT
  USING (
    visibility = 'team'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('contributor', 'editor', 'admin')
    )
  );

-- Users can create templates
CREATE POLICY "Users can create templates"
  ON post_templates
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Users can update own templates
CREATE POLICY "Users can update own templates"
  ON post_templates
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete own templates
CREATE POLICY "Users can delete own templates"
  ON post_templates
  FOR DELETE
  USING (created_by = auth.uid());

-- Admins can manage all templates
CREATE POLICY "Admins can manage all templates"
  ON post_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to create post from template
CREATE OR REPLACE FUNCTION create_post_from_template(
  p_template_id UUID,
  p_title TEXT DEFAULT NULL,
  p_variables JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template RECORD;
  v_post_id UUID;
  v_content TEXT;
  v_title TEXT;
  v_excerpt TEXT;
  v_key TEXT;
  v_value TEXT;
BEGIN
  -- Get template
  SELECT * INTO v_template FROM post_templates WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Apply variables to templates
  v_title := COALESCE(p_title, v_template.title_template, 'Untitled');
  v_content := v_template.content_template;
  v_excerpt := v_template.excerpt_template;

  -- Replace {{variable}} placeholders
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_title := replace(v_title, '{{' || v_key || '}}', v_value);
    v_content := replace(v_content, '{{' || v_key || '}}', v_value);
    IF v_excerpt IS NOT NULL THEN
      v_excerpt := replace(v_excerpt, '{{' || v_key || '}}', v_value);
    END IF;
  END LOOP;

  -- Create post
  INSERT INTO posts (
    title,
    content,
    excerpt,
    content_type,
    category_id,
    tags,
    author_id,
    status,
    metadata
  )
  VALUES (
    v_title,
    v_content,
    v_excerpt,
    v_template.content_type,
    v_template.default_category_id,
    v_template.default_tags,
    auth.uid(),
    'draft',
    v_template.metadata
  )
  RETURNING id INTO v_post_id;

  -- Update template usage stats
  UPDATE post_templates
  SET use_count = use_count + 1,
      last_used_at = NOW()
  WHERE id = p_template_id;

  RETURN v_post_id;
END;
$$;

-- Grant function
GRANT EXECUTE ON FUNCTION create_post_from_template TO authenticated;

-- ============================================
-- Default templates (seed data)
-- ============================================

-- Note: These would typically be inserted via a seed script
-- Here's the structure for reference:

COMMENT ON TABLE post_templates IS 'Reusable templates for creating new posts';

-- ============================================
-- Template variables table (optional, for complex templates)
-- ============================================

CREATE TABLE IF NOT EXISTS template_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES post_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  variable_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'textarea', 'number', 'date', 'select', 'multiselect'
  options JSONB, -- For select/multiselect types
  default_value TEXT,
  required BOOLEAN DEFAULT FALSE,
  validation_pattern TEXT,
  sort_order INTEGER DEFAULT 0,
  
  CONSTRAINT unique_template_variable UNIQUE(template_id, name)
);

CREATE INDEX IF NOT EXISTS idx_template_variables_template ON template_variables(template_id);

-- RLS for template variables
ALTER TABLE template_variables ENABLE ROW LEVEL SECURITY;

-- Variables inherit template visibility
CREATE POLICY "Variables follow template access"
  ON template_variables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM post_templates
      WHERE id = template_variables.template_id
      AND (
        visibility = 'public'
        OR created_by = auth.uid()
        OR (visibility = 'team' AND EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('contributor', 'editor', 'admin')
        ))
      )
    )
  );

-- Template owners can manage variables
CREATE POLICY "Template owners can manage variables"
  ON template_variables
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM post_templates
      WHERE id = template_variables.template_id
      AND created_by = auth.uid()
    )
  );

-- Updated at trigger for templates
CREATE OR REPLACE FUNCTION update_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_template_timestamp ON post_templates;
CREATE TRIGGER trigger_update_template_timestamp
  BEFORE UPDATE ON post_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_timestamp();

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE post_templates IS 'Reusable templates for creating new posts';
COMMENT ON TABLE template_variables IS 'Variable definitions for template placeholders';
COMMENT ON FUNCTION create_post_from_template IS 'Creates a new post from a template with variable substitution';
COMMENT ON FUNCTION publish_scheduled_posts IS 'Publishes all posts that are scheduled for the current time or earlier';
COMMENT ON FUNCTION schedule_post IS 'Schedules a post for future publication';

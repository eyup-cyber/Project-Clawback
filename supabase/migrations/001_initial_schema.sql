-- Scroungers Multimedia Database Schema
-- Run this in Supabase SQL Editor

-- =============================================================================
-- PROFILES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  website_url TEXT,
  twitter_handle TEXT,
  kofi_username TEXT,
  role TEXT DEFAULT 'reader' CHECK (role IN ('reader', 'contributor', 'editor', 'admin', 'superadmin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  email_verified BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  article_count INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_reactions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- =============================================================================
-- CONTRIBUTOR APPLICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contributor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  location TEXT,
  portfolio_url TEXT,
  content_types TEXT[] NOT NULL,
  topics TEXT[] NOT NULL,
  first_piece_pitch TEXT NOT NULL,
  why_scroungers TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'waitlisted')),
  reviewer_id UUID REFERENCES profiles(id),
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON contributor_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON contributor_applications(created_at DESC);

-- =============================================================================
-- CATEGORIES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#32CD32',
  icon TEXT,
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, slug, color, icon, is_featured, sort_order) VALUES
  ('Housing', 'housing', '#32CD32', '🏠', true, 1),
  ('Economics', 'economics', '#FFD700', '💰', true, 2),
  ('Health', 'health', '#FF00FF', '🏥', true, 3),
  ('Benefits', 'benefits', '#32CD32', '📋', true, 4),
  ('Culture', 'culture', '#FFD700', '🎭', true, 5),
  ('Work', 'work', '#32CD32', '⚒️', true, 6),
  ('Environment', 'environment', '#32CD32', '🌍', true, 7),
  ('International', 'international', '#FFD700', '🌐', true, 8)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- TAGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- POSTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Content
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subtitle TEXT,
  excerpt TEXT,
  content JSONB,
  content_html TEXT,
  
  -- Media
  content_type TEXT NOT NULL CHECK (content_type IN ('written', 'video', 'audio', 'visual')),
  featured_image_url TEXT,
  featured_image_alt TEXT,
  media_url TEXT,
  media_duration INTEGER,
  media_thumbnail_url TEXT,
  gallery_urls TEXT[],
  
  -- Categorization
  category_id UUID REFERENCES categories(id),
  is_breaking BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_editors_pick BOOLEAN DEFAULT FALSE,
  
  -- Publishing
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'scheduled', 'published', 'archived', 'rejected')),
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  canonical_url TEXT,
  no_index BOOLEAN DEFAULT FALSE,
  
  -- Stats
  view_count INTEGER DEFAULT 0,
  unique_view_count INTEGER DEFAULT 0,
  reaction_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  reading_time INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_content_type ON posts(content_type);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_breaking ON posts(is_breaking) WHERE is_breaking = TRUE;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING GIN (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content_html, ''))
);

-- =============================================================================
-- POST TAGS JUNCTION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id);

-- =============================================================================
-- REACTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('star', 'fire', 'heart', 'clap', 'think')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, post_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);

-- =============================================================================
-- COMMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_author_reply BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'flagged', 'deleted')),
  reaction_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- =============================================================================
-- COMMENT REACTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON comment_reactions(comment_id);

-- =============================================================================
-- POST VIEWS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id),
  session_id TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  referrer TEXT,
  country_code TEXT,
  read_percentage INTEGER DEFAULT 0,
  time_on_page INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_views_post ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_views_created_at ON post_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_views_session ON post_views(session_id);

-- =============================================================================
-- MEDIA TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  url TEXT NOT NULL,
  storage_key TEXT,
  media_type TEXT CHECK (media_type IN ('video', 'audio', 'image')),
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  duration INTEGER,
  folder TEXT DEFAULT 'uploads',
  alt_text TEXT,
  caption TEXT,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'ready', 'failed', 'uploading')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_uploader ON media(uploader_id);
CREATE INDEX IF NOT EXISTS idx_media_mime_type ON media(mime_type);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);

-- =============================================================================
-- NEWSLETTER SUBSCRIBERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  source TEXT DEFAULT 'website',
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers(status);

-- =============================================================================
-- CONTACT SUBMISSIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SITE SETTINGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Insert default settings
INSERT INTO site_settings (key, value) VALUES
  ('site_name', '"Scroungers Multimedia"'),
  ('site_description', '"Political journalism from the people who live it"'),
  ('maintenance_mode', 'false'),
  ('registration_enabled', 'true'),
  ('applications_open', 'true'),
  ('featured_posts', '[]'),
  ('breaking_alert', 'null'),
  ('social_links', '{"twitter": "scroungers", "kofi": "scroungers"}')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins have full access to profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- CATEGORIES POLICIES (public read)
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- TAGS POLICIES (public read)
CREATE POLICY "Tags are viewable by everyone"
  ON tags FOR SELECT
  USING (true);

CREATE POLICY "Contributors can create tags"
  ON tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('contributor', 'editor', 'admin', 'superadmin')
    )
  );

-- POSTS POLICIES
CREATE POLICY "Published posts are viewable by everyone"
  ON posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authors can view own posts"
  ON posts FOR SELECT
  USING (auth.uid() = author_id);

CREATE POLICY "Contributors can create posts"
  ON posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('contributor', 'editor', 'admin', 'superadmin')
    )
  );

CREATE POLICY "Authors can update own unpublished posts"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id AND status IN ('draft', 'pending', 'rejected'));

CREATE POLICY "Editors can update any post"
  ON posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('editor', 'admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can delete posts"
  ON posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- POST TAGS POLICIES
CREATE POLICY "Post tags are viewable by everyone"
  ON post_tags FOR SELECT
  USING (true);

CREATE POLICY "Contributors can manage post tags"
  ON post_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('contributor', 'editor', 'admin', 'superadmin')
    )
  );

-- REACTIONS POLICIES
CREATE POLICY "Reactions are viewable by everyone"
  ON reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add reactions"
  ON reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
  ON reactions FOR DELETE
  USING (auth.uid() = user_id);

-- COMMENTS POLICIES
CREATE POLICY "Visible comments on published posts are public"
  ON comments FOR SELECT
  USING (
    status = 'visible'
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = comments.post_id
      AND posts.status = 'published'
    )
  );

CREATE POLICY "Authenticated users can comment"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors and admins can delete comments"
  ON comments FOR DELETE
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- COMMENT REACTIONS POLICIES
CREATE POLICY "Comment reactions are viewable by everyone"
  ON comment_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can react to comments"
  ON comment_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own comment reactions"
  ON comment_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- POST VIEWS POLICIES
CREATE POLICY "Anyone can record views"
  ON post_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authors can view their post analytics"
  ON post_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_views.post_id
      AND posts.author_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all analytics"
  ON post_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- MEDIA POLICIES
CREATE POLICY "Media is viewable by everyone"
  ON media FOR SELECT
  USING (true);

CREATE POLICY "Contributors can upload media"
  ON media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('contributor', 'editor', 'admin', 'superadmin')
    )
  );

CREATE POLICY "Users can update own media"
  ON media FOR UPDATE
  USING (auth.uid() = uploader_id);

CREATE POLICY "Users can delete own media"
  ON media FOR DELETE
  USING (auth.uid() = uploader_id);

-- CONTRIBUTOR APPLICATIONS POLICIES
CREATE POLICY "Anyone can submit applications"
  ON contributor_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own applications"
  ON contributor_applications FOR SELECT
  USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage applications"
  ON contributor_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- NEWSLETTER POLICIES
CREATE POLICY "Anyone can subscribe"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can manage own subscription"
  ON newsletter_subscribers FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view subscribers"
  ON newsletter_subscribers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- CONTACT SUBMISSIONS POLICIES
CREATE POLICY "Anyone can submit contact form"
  ON contact_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view contact submissions"
  ON contact_submissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- SITE SETTINGS POLICIES
CREATE POLICY "Anyone can read site settings"
  ON site_settings FOR SELECT
  USING (true);

CREATE POLICY "Superadmins can modify site settings"
  ON site_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'superadmin'
    )
  );

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON contributor_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_base TEXT;
  username_final TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate username from email or full_name
  username_base := LOWER(REGEXP_REPLACE(
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    '[^a-zA-Z0-9]', '', 'g'
  ));
  
  -- Ensure username is unique
  username_final := username_base;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = username_final) LOOP
    counter := counter + 1;
    username_final := username_base || counter::TEXT;
  END LOOP;
  
  INSERT INTO public.profiles (id, username, display_name, email)
  VALUES (
    NEW.id,
    username_final,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update category post count
CREATE OR REPLACE FUNCTION update_category_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'published' AND NEW.category_id IS NOT NULL THEN
    UPDATE categories SET post_count = post_count + 1 WHERE id = NEW.category_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'published' AND OLD.category_id IS NOT NULL THEN
    UPDATE categories SET post_count = GREATEST(0, post_count - 1) WHERE id = OLD.category_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF NEW.status = 'published' AND OLD.status != 'published' AND NEW.category_id IS NOT NULL THEN
      UPDATE categories SET post_count = post_count + 1 WHERE id = NEW.category_id;
    ELSIF NEW.status != 'published' AND OLD.status = 'published' AND OLD.category_id IS NOT NULL THEN
      UPDATE categories SET post_count = GREATEST(0, post_count - 1) WHERE id = OLD.category_id;
    END IF;
    -- Handle category changes while published
    IF NEW.status = 'published' AND OLD.status = 'published' AND NEW.category_id != OLD.category_id THEN
      IF OLD.category_id IS NOT NULL THEN
        UPDATE categories SET post_count = GREATEST(0, post_count - 1) WHERE id = OLD.category_id;
      END IF;
      IF NEW.category_id IS NOT NULL THEN
        UPDATE categories SET post_count = post_count + 1 WHERE id = NEW.category_id;
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_category_count
  AFTER INSERT OR UPDATE OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_category_post_count();

-- Update author article count
CREATE OR REPLACE FUNCTION update_author_article_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'published' THEN
    UPDATE profiles SET article_count = article_count + 1 WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'published' THEN
    UPDATE profiles SET article_count = GREATEST(0, article_count - 1) WHERE id = OLD.author_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'published' AND OLD.status != 'published' THEN
      UPDATE profiles SET article_count = article_count + 1 WHERE id = NEW.author_id;
    ELSIF NEW.status != 'published' AND OLD.status = 'published' THEN
      UPDATE profiles SET article_count = GREATEST(0, article_count - 1) WHERE id = OLD.author_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_author_count
  AFTER INSERT OR UPDATE OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_author_article_count();

-- Calculate reading time on post save
CREATE OR REPLACE FUNCTION calculate_reading_time()
RETURNS TRIGGER AS $$
DECLARE
  word_count INTEGER;
  words_per_minute INTEGER := 200;
BEGIN
  IF NEW.content_html IS NOT NULL THEN
    word_count := array_length(regexp_split_to_array(
      regexp_replace(NEW.content_html, '<[^>]*>', '', 'g'),
      '\s+'
    ), 1);
    NEW.reading_time := GREATEST(1, CEIL(COALESCE(word_count, 0)::FLOAT / words_per_minute));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_calculate_reading_time
  BEFORE INSERT OR UPDATE OF content_html ON posts
  FOR EACH ROW EXECUTE FUNCTION calculate_reading_time();

-- Update reaction counts
CREATE OR REPLACE FUNCTION update_post_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
    UPDATE profiles SET total_reactions = total_reactions + 1 
    WHERE id = (SELECT author_id FROM posts WHERE id = NEW.post_id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET reaction_count = GREATEST(0, reaction_count - 1) WHERE id = OLD.post_id;
    UPDATE profiles SET total_reactions = GREATEST(0, total_reactions - 1)
    WHERE id = (SELECT author_id FROM posts WHERE id = OLD.post_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reactions_update_counts
  AFTER INSERT OR DELETE ON reactions
  FOR EACH ROW EXECUTE FUNCTION update_post_reaction_count();

-- Update comment counts
CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE comments SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.parent_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_update_counts
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_counts();

-- Update post view count
CREATE OR REPLACE FUNCTION update_post_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET view_count = view_count + 1 WHERE id = NEW.post_id;
  UPDATE profiles SET total_views = total_views + 1 
  WHERE id = (SELECT author_id FROM posts WHERE id = NEW.post_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_views_update_counts
  AFTER INSERT ON post_views
  FOR EACH ROW EXECUTE FUNCTION update_post_view_count();

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Posts with author and category details
CREATE OR REPLACE VIEW posts_with_details AS
SELECT 
  p.*,
  json_build_object(
    'id', pr.id,
    'username', pr.username,
    'display_name', pr.display_name,
    'avatar_url', pr.avatar_url,
    'kofi_username', pr.kofi_username
  ) AS author,
  CASE WHEN c.id IS NOT NULL THEN
    json_build_object(
      'id', c.id,
      'name', c.name,
      'slug', c.slug,
      'color', c.color
    )
  ELSE NULL END AS category,
  COALESCE(
    ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
    ARRAY[]::TEXT[]
  ) AS tag_names
FROM posts p
LEFT JOIN profiles pr ON p.author_id = pr.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN post_tags pt ON p.id = pt.post_id
LEFT JOIN tags t ON pt.tag_id = t.id
GROUP BY p.id, pr.id, c.id;

-- Trending posts (last 7 days)
CREATE OR REPLACE VIEW trending_posts AS
SELECT 
  p.id,
  p.title,
  p.slug,
  p.excerpt,
  p.featured_image_url,
  p.content_type,
  p.published_at,
  pr.display_name AS author_name,
  pr.username AS author_username,
  pr.avatar_url AS author_avatar,
  pr.kofi_username AS author_kofi,
  c.name AS category_name,
  c.slug AS category_slug,
  c.color AS category_color,
  p.view_count,
  p.reaction_count,
  p.comment_count,
  p.reading_time,
  (p.view_count * 1 + p.reaction_count * 5 + p.comment_count * 10) AS trending_score
FROM posts p
JOIN profiles pr ON p.author_id = pr.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.status = 'published'
  AND p.published_at > NOW() - INTERVAL '7 days'
ORDER BY trending_score DESC;

-- Featured contributors
CREATE OR REPLACE VIEW featured_contributors AS
SELECT 
  id,
  username,
  display_name,
  avatar_url,
  bio,
  kofi_username,
  article_count,
  total_views,
  total_reactions,
  is_featured,
  created_at
FROM profiles
WHERE role IN ('contributor', 'editor', 'admin')
  AND status = 'active'
  AND article_count > 0
ORDER BY 
  is_featured DESC,
  total_reactions DESC,
  article_count DESC;

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

-- Note: Run these in Supabase Dashboard -> Storage

-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('featured-images', 'featured-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('media-thumbnails', 'media-thumbnails', true);







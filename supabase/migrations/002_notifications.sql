-- ============================================================================
-- NOTIFICATIONS SYSTEM
-- Version: 002
-- Description: Adds notifications table and related triggers
-- ============================================================================

-- ============================================================================
-- NOTIFICATION TYPE ENUM
-- ============================================================================
CREATE TYPE notification_type AS ENUM (
  'comment',           -- Someone commented on your post
  'reaction',          -- Someone reacted to your post
  'reply',             -- Someone replied to your comment
  'mention',           -- Someone mentioned you
  'follow',            -- Someone followed you (future feature)
  'post_published',    -- Your post was published
  'post_rejected',     -- Your post was rejected
  'application_approved', -- Your contributor application was approved
  'application_rejected', -- Your contributor application was rejected
  'system'             -- System announcement
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  
  -- Related entities (polymorphic references)
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Who triggered the notification
  
  -- State
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Metadata for additional context
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate notifications
  CONSTRAINT unique_notification UNIQUE (user_id, type, post_id, comment_id, actor_id, created_at)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup for user's unread notifications
CREATE INDEX idx_notifications_user_unread 
  ON notifications(user_id, is_read, created_at DESC) 
  WHERE is_read = FALSE;

-- Fast lookup for user's all notifications
CREATE INDEX idx_notifications_user_all 
  ON notifications(user_id, created_at DESC);

-- Related entity lookups
CREATE INDEX idx_notifications_post ON notifications(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_notifications_actor ON notifications(actor_id) WHERE actor_id IS NOT NULL;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only the system can insert notifications (via service role or triggers)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (TRUE);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTION: Create Notification
-- ============================================================================
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_post_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Don't notify if actor is the same as user (no self-notifications)
  IF p_actor_id = p_user_id THEN
    RETURN NULL;
  END IF;

  INSERT INTO notifications (
    user_id, type, title, message, post_id, comment_id, actor_id, metadata
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_post_id, p_comment_id, p_actor_id, p_metadata
  )
  ON CONFLICT (user_id, type, post_id, comment_id, actor_id, created_at) DO NOTHING
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Notify on new comment
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_on_comment() RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id UUID;
  v_post_title TEXT;
  v_commenter_name TEXT;
  v_parent_author_id UUID;
BEGIN
  -- Get post info
  SELECT author_id, title INTO v_post_author_id, v_post_title
  FROM posts WHERE id = NEW.post_id;

  -- Get commenter name
  SELECT COALESCE(display_name, username, 'Someone') INTO v_commenter_name
  FROM profiles WHERE id = NEW.author_id;

  -- Notify post author (if not the commenter)
  IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.author_id THEN
    PERFORM create_notification(
      v_post_author_id,
      'comment',
      v_commenter_name || ' commented on your post',
      LEFT(NEW.content, 100),
      NEW.post_id,
      NEW.id,
      NEW.author_id
    );
  END IF;

  -- If this is a reply, notify the parent comment author
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO v_parent_author_id
    FROM comments WHERE id = NEW.parent_id;

    IF v_parent_author_id IS NOT NULL AND v_parent_author_id != NEW.author_id THEN
      PERFORM create_notification(
        v_parent_author_id,
        'reply',
        v_commenter_name || ' replied to your comment',
        LEFT(NEW.content, 100),
        NEW.post_id,
        NEW.id,
        NEW.author_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_on_comment
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_comment();

-- ============================================================================
-- TRIGGER: Notify on reaction
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_on_reaction() RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id UUID;
  v_post_title TEXT;
  v_reactor_name TEXT;
BEGIN
  -- Get post info
  SELECT author_id, title INTO v_post_author_id, v_post_title
  FROM posts WHERE id = NEW.post_id;

  -- Get reactor name
  SELECT COALESCE(display_name, username, 'Someone') INTO v_reactor_name
  FROM profiles WHERE id = NEW.user_id;

  -- Notify post author (if not the reactor)
  IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.user_id THEN
    PERFORM create_notification(
      v_post_author_id,
      'reaction',
      v_reactor_name || ' reacted to your post',
      'They added a ' || NEW.type || ' reaction',
      NEW.post_id,
      NULL,
      NEW.user_id,
      jsonb_build_object('reaction_type', NEW.type)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_on_reaction
  AFTER INSERT ON reactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_reaction();

-- ============================================================================
-- TRIGGER: Notify on post status change
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_on_post_status_change() RETURNS TRIGGER AS $$
BEGIN
  -- Only notify on specific status changes
  IF OLD.status != NEW.status THEN
    IF NEW.status = 'published' AND OLD.status = 'pending' THEN
      -- Post was approved
      PERFORM create_notification(
        NEW.author_id,
        'post_published',
        'Your post has been published!',
        '"' || NEW.title || '" is now live.',
        NEW.id,
        NULL,
        NULL
      );
    ELSIF NEW.status = 'rejected' THEN
      -- Post was rejected
      PERFORM create_notification(
        NEW.author_id,
        'post_rejected',
        'Your post needs revision',
        '"' || NEW.title || '" was not approved.',
        NEW.id,
        NULL,
        NULL
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_on_post_status_change
  AFTER UPDATE ON posts
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_on_post_status_change();

-- ============================================================================
-- TRIGGER: Notify on application status change
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_on_application_status_change() RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if user_id exists and status changed
  IF NEW.user_id IS NOT NULL AND OLD.status != NEW.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM create_notification(
        NEW.user_id,
        'application_approved',
        'Welcome to Scroungers!',
        'Your contributor application has been approved. You can now create content!',
        NULL,
        NULL,
        NEW.reviewer_id
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM create_notification(
        NEW.user_id,
        'application_rejected',
        'Application Update',
        'Unfortunately, your application was not approved at this time.',
        NULL,
        NULL,
        NEW.reviewer_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_on_application_status_change
  AFTER UPDATE ON contributor_applications
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_on_application_status_change();

-- ============================================================================
-- VIEW: Notifications with actor info
-- ============================================================================
CREATE OR REPLACE VIEW notifications_with_details AS
SELECT 
  n.*,
  p.title AS post_title,
  p.slug AS post_slug,
  actor.username AS actor_username,
  actor.display_name AS actor_display_name,
  actor.avatar_url AS actor_avatar_url
FROM notifications n
LEFT JOIN posts p ON n.post_id = p.id
LEFT JOIN profiles actor ON n.actor_id = actor.id
ORDER BY n.created_at DESC;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT ON notifications_with_details TO authenticated;







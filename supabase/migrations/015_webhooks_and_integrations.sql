-- ============================================================================
-- WEBHOOKS AND INTEGRATIONS
-- Phase 1.7.6-1.7.7: Webhook system with delivery tracking
-- ============================================================================

-- ============================================================================
-- WEBHOOKS TABLE (Enhanced)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  failure_count INTEGER DEFAULT 0,
  max_failures INTEGER DEFAULT 10,
  headers JSONB DEFAULT '{}',
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN(events);

-- ============================================================================
-- WEBHOOK DELIVERIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  request_headers JSONB,
  response_status INTEGER,
  response_body TEXT,
  response_headers JSONB,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  attempt_number INTEGER DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event ON webhook_deliveries(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) 
  WHERE success = FALSE AND next_retry_at IS NOT NULL;

-- RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Users can manage their own webhooks
CREATE POLICY "Users can view own webhooks"
  ON webhooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own webhooks"
  ON webhooks FOR ALL
  USING (auth.uid() = user_id);

-- Admins can view all webhooks
CREATE POLICY "Admins can view all webhooks"
  ON webhooks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Users can view deliveries for their webhooks
CREATE POLICY "Users can view own webhook deliveries"
  ON webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM webhooks w
      WHERE w.id = webhook_deliveries.webhook_id
      AND w.user_id = auth.uid()
    )
  );

-- Service role manages deliveries
CREATE POLICY "Service role manages deliveries"
  ON webhook_deliveries FOR ALL
  USING (auth.role() = 'service_role');

-- Function to log webhook delivery
CREATE OR REPLACE FUNCTION log_webhook_delivery(
  p_webhook_id UUID,
  p_event TEXT,
  p_payload JSONB,
  p_response_status INTEGER,
  p_response_body TEXT,
  p_duration_ms INTEGER,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  delivery_id UUID;
BEGIN
  INSERT INTO webhook_deliveries (
    webhook_id, event, payload, response_status, 
    response_body, duration_ms, success, error_message
  )
  VALUES (
    p_webhook_id, p_event, p_payload, p_response_status,
    p_response_body, p_duration_ms, p_success, p_error_message
  )
  RETURNING id INTO delivery_id;
  
  -- Update webhook stats
  IF p_success THEN
    UPDATE webhooks
    SET 
      last_triggered_at = NOW(),
      last_success_at = NOW(),
      failure_count = 0
    WHERE id = p_webhook_id;
  ELSE
    UPDATE webhooks
    SET 
      last_triggered_at = NOW(),
      last_failure_at = NOW(),
      failure_count = failure_count + 1,
      is_active = CASE 
        WHEN failure_count + 1 >= max_failures THEN FALSE 
        ELSE is_active 
      END
    WHERE id = p_webhook_id;
  END IF;
  
  RETURN delivery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get webhooks for an event
CREATE OR REPLACE FUNCTION get_webhooks_for_event(p_event TEXT)
RETURNS TABLE (
  id UUID,
  url TEXT,
  secret TEXT,
  headers JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.url, w.secret, w.headers
  FROM webhooks w
  WHERE w.is_active = TRUE
    AND p_event = ANY(w.events);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FEATURE FLAGS TABLE (Enhanced)
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  targeting_rules JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled) WHERE enabled = TRUE;

-- Insert default feature flags
INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage) VALUES
('dark_mode', 'Dark Mode', 'Enable dark mode theme toggle', true, 100),
('advanced_editor', 'Advanced Editor', 'Enable TipTap advanced editor features', true, 100),
('comments', 'Comments System', 'Enable commenting on articles', true, 100),
('reactions', 'Reactions', 'Enable reactions on articles', true, 100),
('bookmarks', 'Bookmarks', 'Enable bookmarking articles', true, 100),
('reading_history', 'Reading History', 'Track reading history', true, 100),
('following', 'Following System', 'Enable following users/categories', true, 100),
('notifications', 'Notifications', 'Enable in-app notifications', true, 100),
('email_notifications', 'Email Notifications', 'Enable email notifications', true, 100),
('two_factor_auth', '2FA', 'Enable two-factor authentication', true, 100),
('magic_links', 'Magic Links', 'Enable passwordless login', true, 100),
('social_login', 'Social Login', 'Enable OAuth social login', true, 100),
('contributor_applications', 'Contributor Applications', 'Accept contributor applications', true, 100),
('scheduled_posts', 'Scheduled Publishing', 'Enable scheduled post publishing', true, 100),
('post_versions', 'Post Versions', 'Enable post version history', true, 100),
('media_library', 'Media Library', 'Enable media library for contributors', true, 100),
('analytics', 'Analytics', 'Enable analytics dashboard', true, 100),
('api_access', 'API Access', 'Enable API key generation', false, 0),
('webhooks', 'Webhooks', 'Enable webhook integrations', false, 0),
('beta_features', 'Beta Features', 'Enable experimental features', false, 10)
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Everyone can read feature flags
CREATE POLICY "Everyone can read feature flags"
  ON feature_flags FOR SELECT
  USING (true);

-- Only superadmins can manage feature flags
CREATE POLICY "Superadmins can manage feature flags"
  ON feature_flags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'superadmin'
    )
  );

-- Function to check if a feature is enabled for a user
CREATE OR REPLACE FUNCTION is_feature_enabled(p_key TEXT, p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  flag feature_flags;
  user_hash INTEGER;
BEGIN
  SELECT * INTO flag FROM feature_flags WHERE key = p_key;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  IF NOT flag.enabled THEN
    RETURN FALSE;
  END IF;
  
  -- If 100% rollout, always enabled
  IF flag.rollout_percentage = 100 THEN
    RETURN TRUE;
  END IF;
  
  -- If 0% rollout, always disabled
  IF flag.rollout_percentage = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- For partial rollout, use user_id hash
  IF p_user_id IS NOT NULL THEN
    user_hash := ABS(hashtext(p_user_id::TEXT)) % 100;
    RETURN user_hash < flag.rollout_percentage;
  END IF;
  
  -- No user_id provided, use random for anonymous users
  RETURN random() * 100 < flag.rollout_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all feature flags for a user
CREATE OR REPLACE FUNCTION get_feature_flags_for_user(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  key TEXT,
  enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT f.key, is_feature_enabled(f.key, p_user_id) as enabled
  FROM feature_flags f;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updated_at
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE webhooks IS 'User-defined webhooks for event notifications';
COMMENT ON TABLE webhook_deliveries IS 'Log of all webhook delivery attempts';
COMMENT ON TABLE feature_flags IS 'Feature flags for gradual rollouts and A/B testing';

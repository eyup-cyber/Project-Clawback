-- ============================================
-- Migration: 014_feature_flags
-- Feature flags and gradual rollouts
-- ============================================

-- Feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Flag state
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Rollout configuration
  rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  
  -- User targeting
  target_user_ids UUID[],
  target_roles TEXT[],
  target_attributes JSONB DEFAULT '{}', -- Custom attribute matching
  
  -- Environment targeting
  environments TEXT[] DEFAULT ARRAY['production'], -- 'development', 'staging', 'production'
  
  -- Scheduling
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[],
  
  -- Audit
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flags_tags ON feature_flags USING GIN(tags);

-- Feature flag history for audit
CREATE TABLE IF NOT EXISTS feature_flag_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'enabled', 'disabled', 'updated', 'rollout_changed'
  previous_state JSONB,
  new_state JSONB,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_flag_history_flag ON feature_flag_history(flag_id);
CREATE INDEX IF NOT EXISTS idx_flag_history_changed_at ON feature_flag_history(changed_at DESC);

-- Feature flag overrides for specific users
CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_flag_user_override UNIQUE(flag_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_flag_overrides_user ON feature_flag_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_flag_overrides_flag ON feature_flag_overrides(flag_id);

-- RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_overrides ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read flags (needed for client-side checks)
CREATE POLICY "Authenticated can read flags"
  ON feature_flags
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can modify flags
CREATE POLICY "Admins can manage flags"
  ON feature_flags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Admins can view history
CREATE POLICY "Admins can view flag history"
  ON feature_flag_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Users can view their own overrides
CREATE POLICY "Users can view own overrides"
  ON feature_flag_overrides
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can manage overrides
CREATE POLICY "Admins can manage overrides"
  ON feature_flag_overrides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to check if flag is enabled for user
CREATE OR REPLACE FUNCTION is_feature_enabled(
  p_flag_key TEXT,
  p_user_id UUID DEFAULT NULL,
  p_environment TEXT DEFAULT 'production'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_flag RECORD;
  v_override RECORD;
  v_user_role TEXT;
  v_hash INTEGER;
BEGIN
  -- Get flag
  SELECT * INTO v_flag FROM feature_flags WHERE key = p_flag_key;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if globally disabled
  IF NOT v_flag.enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Check environment
  IF v_flag.environments IS NOT NULL AND NOT (p_environment = ANY(v_flag.environments)) THEN
    RETURN FALSE;
  END IF;
  
  -- Check date range
  IF v_flag.start_date IS NOT NULL AND NOW() < v_flag.start_date THEN
    RETURN FALSE;
  END IF;
  
  IF v_flag.end_date IS NOT NULL AND NOW() > v_flag.end_date THEN
    RETURN FALSE;
  END IF;
  
  -- If no user, use rollout percentage with random
  IF p_user_id IS NULL THEN
    RETURN v_flag.rollout_percentage >= (random() * 100)::INTEGER;
  END IF;
  
  -- Check user override first
  SELECT * INTO v_override 
  FROM feature_flag_overrides 
  WHERE flag_id = v_flag.id AND user_id = p_user_id
  AND (expires_at IS NULL OR expires_at > NOW());
  
  IF FOUND THEN
    RETURN v_override.enabled;
  END IF;
  
  -- Check if user is explicitly targeted
  IF v_flag.target_user_ids IS NOT NULL AND p_user_id = ANY(v_flag.target_user_ids) THEN
    RETURN TRUE;
  END IF;
  
  -- Check role targeting
  IF v_flag.target_roles IS NOT NULL AND array_length(v_flag.target_roles, 1) > 0 THEN
    SELECT role INTO v_user_role FROM profiles WHERE id = p_user_id;
    IF v_user_role = ANY(v_flag.target_roles) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Apply percentage rollout (deterministic based on user_id + flag_key)
  IF v_flag.rollout_percentage < 100 THEN
    -- Create a deterministic hash from user_id and flag_key
    v_hash := abs(hashtext(p_user_id::TEXT || p_flag_key)) % 100;
    RETURN v_hash < v_flag.rollout_percentage;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to get all enabled flags for a user
CREATE OR REPLACE FUNCTION get_user_feature_flags(
  p_user_id UUID DEFAULT NULL,
  p_environment TEXT DEFAULT 'production'
)
RETURNS TABLE(key TEXT, enabled BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ff.key,
    is_feature_enabled(ff.key, p_user_id, p_environment) as enabled
  FROM feature_flags ff
  WHERE ff.enabled = TRUE
  OR EXISTS (
    SELECT 1 FROM feature_flag_overrides ffo
    WHERE ffo.flag_id = ff.id 
    AND ffo.user_id = p_user_id
    AND ffo.enabled = TRUE
    AND (ffo.expires_at IS NULL OR ffo.expires_at > NOW())
  );
END;
$$;

-- Trigger to log flag changes
CREATE OR REPLACE FUNCTION log_feature_flag_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    INSERT INTO feature_flag_history (flag_id, action, previous_state, changed_by)
    VALUES (OLD.id, v_action, row_to_json(OLD), auth.uid());
    RETURN OLD;
  ELSE
    IF OLD.enabled != NEW.enabled THEN
      v_action := CASE WHEN NEW.enabled THEN 'enabled' ELSE 'disabled' END;
    ELSIF OLD.rollout_percentage != NEW.rollout_percentage THEN
      v_action := 'rollout_changed';
    ELSE
      v_action := 'updated';
    END IF;
  END IF;
  
  INSERT INTO feature_flag_history (flag_id, action, previous_state, new_state, changed_by)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    v_action,
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    auth.uid()
  );
  
  NEW.updated_at := NOW();
  NEW.updated_by := auth.uid();
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_flag_change ON feature_flags;
CREATE TRIGGER trigger_log_flag_change
  BEFORE INSERT OR UPDATE OR DELETE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION log_feature_flag_change();

-- Grant functions
GRANT EXECUTE ON FUNCTION is_feature_enabled TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_feature_flags TO authenticated;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE feature_flags IS 'Feature flags for gradual rollouts and A/B testing';
COMMENT ON TABLE feature_flag_history IS 'Audit log of feature flag changes';
COMMENT ON TABLE feature_flag_overrides IS 'Per-user overrides for feature flags';
COMMENT ON FUNCTION is_feature_enabled IS 'Check if a feature flag is enabled for a specific user';
COMMENT ON FUNCTION get_user_feature_flags IS 'Get all enabled feature flags for a user';

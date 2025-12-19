-- ============================================================================
-- API KEYS
-- Manage API keys for external integrations and programmatic access
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the key
  key_prefix TEXT NOT NULL, -- First 8 chars for identification
  scopes TEXT[] NOT NULL DEFAULT '{}',
  allowed_ips TEXT[], -- NULL means any IP allowed
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- ============================================================================
-- API KEY USAGE LOGS
-- Track API key usage for monitoring and billing
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON api_key_usage(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_date ON api_key_usage(created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;

-- API Keys: Users can manage their own keys
CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all API keys"
  ON api_keys FOR ALL
  USING (auth.role() = 'service_role');

-- API Key Usage: Users can view usage of their own keys
CREATE POLICY "Users can view own API key usage"
  ON api_key_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM api_keys
      WHERE api_keys.id = api_key_usage.api_key_id
      AND api_keys.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage API key usage"
  ON api_key_usage FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to log API key usage
CREATE OR REPLACE FUNCTION log_api_key_usage(
  p_api_key_id UUID,
  p_endpoint TEXT,
  p_method TEXT,
  p_status_code INTEGER,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  usage_id UUID;
BEGIN
  INSERT INTO api_key_usage (api_key_id, endpoint, method, status_code, response_time_ms, ip_address, user_agent)
  VALUES (p_api_key_id, p_endpoint, p_method, p_status_code, p_response_time_ms, p_ip_address, p_user_agent)
  RETURNING id INTO usage_id;
  
  -- Update last_used_at on the key
  UPDATE api_keys SET last_used_at = NOW() WHERE id = p_api_key_id;
  
  RETURN usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get API key usage stats
CREATE OR REPLACE FUNCTION get_api_key_stats(p_api_key_id UUID)
RETURNS TABLE (
  total_requests BIGINT,
  requests_today BIGINT,
  avg_response_time NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::BIGINT as requests_today,
    ROUND(AVG(response_time_ms)::NUMERIC, 2) as avg_response_time,
    ROUND((COUNT(*) FILTER (WHERE status_code < 400)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as success_rate
  FROM api_key_usage
  WHERE api_key_id = p_api_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- LIMITS
-- ============================================================================

-- Limit API keys per user (enforced at application level, but add constraint)
-- Most users get 5 keys, contributors get 10, admins get unlimited
CREATE OR REPLACE FUNCTION check_api_key_limit()
RETURNS TRIGGER AS $$
DECLARE
  key_count INTEGER;
  user_role TEXT;
  max_keys INTEGER;
BEGIN
  -- Get user's role
  SELECT role INTO user_role FROM profiles WHERE id = NEW.user_id;
  
  -- Set max based on role
  max_keys := CASE
    WHEN user_role IN ('admin', 'superadmin') THEN 100
    WHEN user_role IN ('editor', 'contributor') THEN 10
    ELSE 5
  END;
  
  -- Count existing keys
  SELECT COUNT(*) INTO key_count FROM api_keys WHERE user_id = NEW.user_id;
  
  IF key_count >= max_keys THEN
    RAISE EXCEPTION 'API key limit reached (% keys for % role)', max_keys, COALESCE(user_role, 'user');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_api_key_limit ON api_keys;
CREATE TRIGGER trigger_check_api_key_limit
  BEFORE INSERT ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION check_api_key_limit();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE api_keys IS 'API keys for programmatic access to the platform';
COMMENT ON TABLE api_key_usage IS 'Usage logs for API key monitoring and rate limiting';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the full API key';
COMMENT ON COLUMN api_keys.key_prefix IS 'First characters of key for identification (scrng_xxxxxxxx)';
COMMENT ON COLUMN api_keys.scopes IS 'Array of permission scopes granted to this key';

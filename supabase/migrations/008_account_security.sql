-- ============================================================================
-- ACCOUNT SECURITY
-- Login attempts tracking, session management, and account protection
-- ============================================================================

-- ============================================================================
-- LOGIN ATTEMPTS TABLE
-- Track all login attempts for security monitoring and lockout
-- ============================================================================

CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_recent ON login_attempts(created_at DESC) WHERE NOT success;

-- ============================================================================
-- USER SESSIONS TABLE
-- Track active sessions across devices
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'desktop',
  browser TEXT,
  os TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes for session queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_fingerprint ON user_sessions(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- ============================================================================
-- SECURITY EVENTS TABLE
-- Log security-related events for audit purposes
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  severity TEXT NOT NULL DEFAULT 'info', -- info, warning, critical
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity, created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Login attempts: Users can see their own, service role can see all
CREATE POLICY "Users can view own login attempts"
  ON login_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage login attempts"
  ON login_attempts FOR ALL
  USING (auth.role() = 'service_role');

-- User sessions: Users can see and delete their own
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON user_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sessions"
  ON user_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- Security events: Users can see their own, admins can see all
CREATE POLICY "Users can view own security events"
  ON security_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all security events"
  ON security_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Service role can manage security events"
  ON security_events FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO security_events (user_id, event_type, event_data, ip_address, user_agent, severity)
  VALUES (p_user_id, p_event_type, p_event_data, p_ip_address, p_user_agent, p_severity)
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_old_security_data()
RETURNS void AS $$
BEGIN
  -- Delete login attempts older than 90 days
  DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete expired sessions
  DELETE FROM user_sessions WHERE expires_at < NOW();
  
  -- Delete security events older than 1 year
  DELETE FROM security_events WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE login_attempts IS 'Track login attempts for security monitoring and lockout protection';
COMMENT ON TABLE user_sessions IS 'Active user sessions across devices';
COMMENT ON TABLE security_events IS 'Security audit log for compliance and monitoring';

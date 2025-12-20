-- ============================================
-- Migration: 016_webhooks
-- Webhook subscriptions and delivery tracking
-- ============================================

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Webhook configuration
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL, -- Used for signing payloads
  
  -- Event subscriptions
  events TEXT[] NOT NULL DEFAULT '{}', -- Array of event types
  
  -- Delivery options
  active BOOLEAN NOT NULL DEFAULT TRUE,
  retry_count INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  
  -- Headers to include
  custom_headers JSONB DEFAULT '{}',
  
  -- Authentication
  auth_type TEXT DEFAULT 'signature', -- 'signature', 'bearer', 'basic', 'none'
  auth_value TEXT, -- Token or credentials (encrypted)
  
  -- IP restrictions
  allowed_ips TEXT[],
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Stats
  delivery_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_failure_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN(events);

-- Webhook deliveries log
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL,
  event_id UUID, -- Reference to the source event if applicable
  payload JSONB NOT NULL,
  
  -- Delivery details
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed', 'retrying'
  status_code INTEGER,
  response_body TEXT,
  response_headers JSONB,
  
  -- Timing
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  
  -- Error tracking
  error_message TEXT,
  error_code TEXT,
  
  -- Duration
  duration_ms INTEGER
);

-- Indexes for deliveries
CREATE INDEX IF NOT EXISTS idx_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_created ON webhook_deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_retry ON webhook_deliveries(next_retry_at)
  WHERE status = 'retrying';

-- RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Users can manage their own webhooks
CREATE POLICY "Users can view own webhooks"
  ON webhooks
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create webhooks"
  ON webhooks
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own webhooks"
  ON webhooks
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own webhooks"
  ON webhooks
  FOR DELETE
  USING (user_id = auth.uid());

-- Admins can manage all webhooks
CREATE POLICY "Admins can manage all webhooks"
  ON webhooks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Users can view delivery history for their webhooks
CREATE POLICY "Users can view own deliveries"
  ON webhook_deliveries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM webhooks
      WHERE id = webhook_deliveries.webhook_id
      AND user_id = auth.uid()
    )
  );

-- Admins can view all deliveries
CREATE POLICY "Admins can view all deliveries"
  ON webhook_deliveries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to get webhooks for an event type
CREATE OR REPLACE FUNCTION get_webhooks_for_event(p_event_type TEXT)
RETURNS TABLE(
  id UUID,
  url TEXT,
  secret TEXT,
  custom_headers JSONB,
  auth_type TEXT,
  auth_value TEXT,
  retry_count INTEGER,
  timeout_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.url,
    w.secret,
    w.custom_headers,
    w.auth_type,
    w.auth_value,
    w.retry_count,
    w.timeout_seconds
  FROM webhooks w
  WHERE w.active = TRUE
  AND p_event_type = ANY(w.events);
END;
$$;

-- Function to log delivery
CREATE OR REPLACE FUNCTION log_webhook_delivery(
  p_webhook_id UUID,
  p_event_type TEXT,
  p_payload JSONB,
  p_status TEXT,
  p_status_code INTEGER DEFAULT NULL,
  p_response_body TEXT DEFAULT NULL,
  p_response_headers JSONB DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_delivery_id UUID;
BEGIN
  INSERT INTO webhook_deliveries (
    webhook_id,
    event_type,
    payload,
    status,
    status_code,
    response_body,
    response_headers,
    duration_ms,
    error_message,
    delivered_at,
    attempt_count
  )
  VALUES (
    p_webhook_id,
    p_event_type,
    p_payload,
    p_status,
    p_status_code,
    p_response_body,
    p_response_headers,
    p_duration_ms,
    p_error_message,
    CASE WHEN p_status IN ('success', 'failed') THEN NOW() ELSE NULL END,
    1
  )
  RETURNING id INTO v_delivery_id;

  -- Update webhook stats
  UPDATE webhooks
  SET delivery_count = delivery_count + 1,
      last_triggered_at = NOW(),
      last_success_at = CASE WHEN p_status = 'success' THEN NOW() ELSE last_success_at END,
      last_failure_at = CASE WHEN p_status = 'failed' THEN NOW() ELSE last_failure_at END,
      last_failure_reason = CASE WHEN p_status = 'failed' THEN p_error_message ELSE last_failure_reason END,
      failure_count = CASE WHEN p_status = 'failed' THEN failure_count + 1 ELSE failure_count END
  WHERE id = p_webhook_id;

  RETURN v_delivery_id;
END;
$$;

-- Function to get webhook stats
CREATE OR REPLACE FUNCTION get_webhook_stats(p_webhook_id UUID)
RETURNS TABLE(
  total_deliveries BIGINT,
  successful_deliveries BIGINT,
  failed_deliveries BIGINT,
  avg_duration_ms NUMERIC,
  success_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_deliveries,
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT as successful_deliveries,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_deliveries,
    AVG(duration_ms)::NUMERIC as avg_duration_ms,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / COUNT(*)::NUMERIC * 100)
      ELSE 0
    END as success_rate
  FROM webhook_deliveries
  WHERE webhook_id = p_webhook_id;
END;
$$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_webhook_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_webhook_timestamp ON webhooks;
CREATE TRIGGER trigger_webhook_timestamp
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_timestamp();

-- Grant functions
GRANT EXECUTE ON FUNCTION get_webhooks_for_event TO service_role;
GRANT EXECUTE ON FUNCTION log_webhook_delivery TO service_role;
GRANT EXECUTE ON FUNCTION get_webhook_stats TO authenticated;

-- ============================================
-- Webhook event types reference
-- ============================================
COMMENT ON TABLE webhooks IS 'User webhook subscriptions for event notifications';
COMMENT ON TABLE webhook_deliveries IS 'Log of webhook delivery attempts';

-- Available event types (for reference):
-- post.created
-- post.updated
-- post.published
-- post.deleted
-- comment.created
-- comment.moderated
-- user.created
-- user.updated
-- media.uploaded
-- report.submitted
-- moderation.required

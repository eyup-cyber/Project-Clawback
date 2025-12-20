-- ============================================================================
-- ANALYTICS SYSTEM
-- Phase 1.7.13-1.7.14: Event tracking and aggregation
-- ============================================================================

-- ============================================================================
-- ANALYTICS EVENTS TABLE
-- Raw event tracking for detailed analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  properties JSONB DEFAULT '{}',
  page_url TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  ip_address_hash TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partitioning by month for better performance
-- Note: In production, you'd want to partition this table

CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page ON analytics_events(page_url, created_at DESC);

-- ============================================================================
-- ANALYTICS AGGREGATES TABLE
-- Pre-computed metrics for fast dashboard queries
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  dimension TEXT,
  dimension_value TEXT,
  count BIGINT DEFAULT 0,
  sum_value DECIMAL(20,4),
  avg_value DECIMAL(20,4),
  min_value DECIMAL(20,4),
  max_value DECIMAL(20,4),
  unique_count BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, metric_name, dimension, dimension_value)
);

CREATE INDEX IF NOT EXISTS idx_analytics_aggregates_date ON analytics_aggregates(date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_aggregates_metric ON analytics_aggregates(metric_name, date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_aggregates_dimension ON analytics_aggregates(dimension, dimension_value, date DESC);

-- RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_aggregates ENABLE ROW LEVEL SECURITY;

-- Analytics events are insert-only for tracking, read for admins
CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read analytics events"
  ON analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Authors can see events for their posts
CREATE POLICY "Authors can read events for their posts"
  ON analytics_events FOR SELECT
  USING (
    properties->>'post_id' IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = (properties->>'post_id')::UUID
      AND p.author_id = auth.uid()
    )
  );

-- Service role can manage all
CREATE POLICY "Service role manages analytics events"
  ON analytics_events FOR ALL
  USING (auth.role() = 'service_role');

-- Aggregates are read-only for admins, managed by service role
CREATE POLICY "Admins can read aggregates"
  ON analytics_aggregates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Service role manages aggregates"
  ON analytics_aggregates FOR ALL
  USING (auth.role() = 'service_role');

-- Function to track an event
CREATE OR REPLACE FUNCTION track_analytics_event(
  p_event_name TEXT,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_properties JSONB DEFAULT '{}',
  p_page_url TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO analytics_events (
    event_name, user_id, session_id, properties, page_url,
    referrer, utm_source, utm_medium, utm_campaign
  )
  VALUES (
    p_event_name, p_user_id, p_session_id, p_properties, p_page_url,
    p_referrer, p_utm_source, p_utm_medium, p_utm_campaign
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to aggregate daily analytics
CREATE OR REPLACE FUNCTION aggregate_daily_analytics(p_date DATE)
RETURNS VOID AS $$
BEGIN
  -- Page views by page
  INSERT INTO analytics_aggregates (date, metric_name, dimension, dimension_value, count, unique_count)
  SELECT 
    p_date,
    'page_views',
    'page_url',
    page_url,
    COUNT(*),
    COUNT(DISTINCT COALESCE(user_id::TEXT, session_id))
  FROM analytics_events
  WHERE event_name = 'page_view'
    AND DATE(created_at) = p_date
    AND page_url IS NOT NULL
  GROUP BY page_url
  ON CONFLICT (date, metric_name, dimension, dimension_value) DO UPDATE SET
    count = EXCLUDED.count,
    unique_count = EXCLUDED.unique_count;
  
  -- Total page views
  INSERT INTO analytics_aggregates (date, metric_name, dimension, dimension_value, count, unique_count)
  SELECT 
    p_date,
    'page_views',
    'total',
    'all',
    COUNT(*),
    COUNT(DISTINCT COALESCE(user_id::TEXT, session_id))
  FROM analytics_events
  WHERE event_name = 'page_view'
    AND DATE(created_at) = p_date
  ON CONFLICT (date, metric_name, dimension, dimension_value) DO UPDATE SET
    count = EXCLUDED.count,
    unique_count = EXCLUDED.unique_count;
  
  -- Events by type
  INSERT INTO analytics_aggregates (date, metric_name, dimension, dimension_value, count)
  SELECT 
    p_date,
    'events',
    'event_name',
    event_name,
    COUNT(*)
  FROM analytics_events
  WHERE DATE(created_at) = p_date
  GROUP BY event_name
  ON CONFLICT (date, metric_name, dimension, dimension_value) DO UPDATE SET
    count = EXCLUDED.count;
  
  -- Sessions by country
  INSERT INTO analytics_aggregates (date, metric_name, dimension, dimension_value, count, unique_count)
  SELECT 
    p_date,
    'sessions',
    'country',
    COALESCE(country, 'Unknown'),
    COUNT(*),
    COUNT(DISTINCT session_id)
  FROM analytics_events
  WHERE DATE(created_at) = p_date
    AND session_id IS NOT NULL
  GROUP BY country
  ON CONFLICT (date, metric_name, dimension, dimension_value) DO UPDATE SET
    count = EXCLUDED.count,
    unique_count = EXCLUDED.unique_count;
  
  -- Sessions by device type
  INSERT INTO analytics_aggregates (date, metric_name, dimension, dimension_value, count, unique_count)
  SELECT 
    p_date,
    'sessions',
    'device_type',
    COALESCE(device_type, 'Unknown'),
    COUNT(*),
    COUNT(DISTINCT session_id)
  FROM analytics_events
  WHERE DATE(created_at) = p_date
    AND session_id IS NOT NULL
  GROUP BY device_type
  ON CONFLICT (date, metric_name, dimension, dimension_value) DO UPDATE SET
    count = EXCLUDED.count,
    unique_count = EXCLUDED.unique_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get analytics summary for a date range
CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_start_date DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_page_views BIGINT,
  unique_visitors BIGINT,
  total_sessions BIGINT,
  avg_session_duration DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN metric_name = 'page_views' AND dimension = 'total' THEN count END), 0)::BIGINT as total_page_views,
    COALESCE(SUM(CASE WHEN metric_name = 'page_views' AND dimension = 'total' THEN unique_count END), 0)::BIGINT as unique_visitors,
    COALESCE(SUM(CASE WHEN metric_name = 'sessions' AND dimension = 'total' THEN count END), 0)::BIGINT as total_sessions,
    COALESCE(AVG(CASE WHEN metric_name = 'session_duration' THEN avg_value END), 0)::DECIMAL as avg_session_duration
  FROM analytics_aggregates
  WHERE date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top pages
CREATE OR REPLACE FUNCTION get_top_pages(
  p_start_date DATE,
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  page_url TEXT,
  views BIGINT,
  unique_views BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dimension_value as page_url,
    SUM(count)::BIGINT as views,
    SUM(unique_count)::BIGINT as unique_views
  FROM analytics_aggregates
  WHERE metric_name = 'page_views'
    AND dimension = 'page_url'
    AND date BETWEEN p_start_date AND p_end_date
  GROUP BY dimension_value
  ORDER BY views DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SCHEDULED JOBS TABLE
-- Phase 1.7.12: Background job scheduling
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 5,
  scheduled_for TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_type ON scheduled_jobs(type, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_pending ON scheduled_jobs(scheduled_for) WHERE status = 'pending';

-- RLS
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view scheduled jobs"
  ON scheduled_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Service role manages scheduled jobs"
  ON scheduled_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- Function to schedule a job
CREATE OR REPLACE FUNCTION schedule_job(
  p_name TEXT,
  p_type TEXT,
  p_payload JSONB DEFAULT '{}',
  p_scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  p_priority INTEGER DEFAULT 5
)
RETURNS UUID AS $$
DECLARE
  job_id UUID;
BEGIN
  INSERT INTO scheduled_jobs (name, type, payload, scheduled_for, priority)
  VALUES (p_name, p_type, p_payload, p_scheduled_for, p_priority)
  RETURNING id INTO job_id;
  
  RETURN job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending jobs
CREATE OR REPLACE FUNCTION get_pending_jobs(p_type TEXT DEFAULT NULL, p_batch_size INTEGER DEFAULT 10)
RETURNS SETOF scheduled_jobs AS $$
BEGIN
  RETURN QUERY
  UPDATE scheduled_jobs
  SET status = 'running', started_at = NOW()
  WHERE id IN (
    SELECT id FROM scheduled_jobs
    WHERE status = 'pending'
      AND scheduled_for <= NOW()
      AND (p_type IS NULL OR type = p_type)
    ORDER BY priority ASC, scheduled_for ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a job
CREATE OR REPLACE FUNCTION complete_job(p_job_id UUID, p_result JSONB DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE scheduled_jobs
  SET 
    status = 'completed',
    completed_at = NOW(),
    result = p_result
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fail a job
CREATE OR REPLACE FUNCTION fail_job(p_job_id UUID, p_error TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE scheduled_jobs
  SET 
    retry_count = retry_count + 1,
    error_message = p_error,
    status = CASE 
      WHEN retry_count + 1 >= max_retries THEN 'failed'
      ELSE 'pending'
    END,
    started_at = NULL,
    scheduled_for = CASE 
      WHEN retry_count + 1 < max_retries 
      THEN NOW() + (INTERVAL '1 minute' * POWER(2, retry_count + 1))
      ELSE scheduled_for
    END
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE analytics_events IS 'Raw analytics events for detailed tracking';
COMMENT ON TABLE analytics_aggregates IS 'Pre-computed analytics metrics for dashboards';
COMMENT ON TABLE scheduled_jobs IS 'Background job queue for async processing';

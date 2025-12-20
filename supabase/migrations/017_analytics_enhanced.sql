-- Enhanced Analytics Schema
-- Adds comprehensive analytics tables and functions

-- =====================================================
-- Analytics Events Table (enhanced)
-- =====================================================

-- Add additional columns to analytics_events if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'analytics_events' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN session_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'analytics_events' AND column_name = 'device_type'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN device_type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'analytics_events' AND column_name = 'browser'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN browser TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'analytics_events' AND column_name = 'os'
  ) THEN
    ALTER TABLE analytics_events ADD COLUMN os TEXT;
  END IF;
END $$;

-- =====================================================
-- Page Views Table
-- =====================================================

CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  page_url TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  duration_ms INTEGER,
  scroll_depth INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for page_views
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user ON page_views(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_url ON page_views(page_url);

-- =====================================================
-- Sessions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_page TEXT NOT NULL,
  landing_page TEXT NOT NULL,
  exit_page TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  page_views INTEGER DEFAULT 1,
  events INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  is_bounce BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user ON analytics_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_date ON analytics_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_bounce ON analytics_sessions(is_bounce);

-- =====================================================
-- Conversions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES analytics_sessions(id),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  goal_id TEXT NOT NULL,
  goal_name TEXT NOT NULL,
  value DECIMAL(10, 2),
  metadata JSONB DEFAULT '{}',
  attributed_source TEXT,
  attributed_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for conversions
CREATE INDEX IF NOT EXISTS idx_conversions_goal ON conversions(goal_id);
CREATE INDEX IF NOT EXISTS idx_conversions_session ON conversions(session_id);
CREATE INDEX IF NOT EXISTS idx_conversions_user ON conversions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversions_date ON conversions(created_at DESC);

-- =====================================================
-- Goals Table
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('pageview', 'event', 'conversion', 'duration')),
  target_url TEXT,
  target_event TEXT,
  target_value DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Daily Aggregates Materialized View
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS analytics_daily_aggregate;
CREATE MATERIALIZED VIEW analytics_daily_aggregate AS
SELECT
  DATE_TRUNC('day', created_at) AS date,
  COUNT(*) AS total_events,
  COUNT(DISTINCT session_id) AS unique_sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS unique_users,
  event_type,
  device_type,
  country
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY 
  DATE_TRUNC('day', created_at),
  event_type,
  device_type,
  country;

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_aggregate_pk 
  ON analytics_daily_aggregate(date, event_type, device_type, country);

-- =====================================================
-- Hourly Traffic View
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS analytics_hourly_traffic;
CREATE MATERIALIZED VIEW analytics_hourly_traffic AS
SELECT
  DATE_TRUNC('hour', started_at) AS hour,
  COUNT(*) AS sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS unique_users,
  SUM(page_views) AS page_views,
  AVG(duration_ms) AS avg_duration,
  COUNT(*) FILTER (WHERE is_bounce) AS bounces
FROM analytics_sessions
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', started_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hourly_traffic_pk ON analytics_hourly_traffic(hour);

-- =====================================================
-- Top Pages View
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS analytics_top_pages;
CREATE MATERIALIZED VIEW analytics_top_pages AS
SELECT
  page_url,
  COUNT(*) AS views,
  COUNT(DISTINCT session_id) AS unique_views,
  AVG(duration_ms) AS avg_duration,
  AVG(scroll_depth) AS avg_scroll_depth,
  DATE_TRUNC('day', created_at) AS date
FROM page_views
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY page_url, DATE_TRUNC('day', created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_top_pages_pk ON analytics_top_pages(page_url, date);

-- =====================================================
-- Referrer Stats View
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS analytics_referrer_stats;
CREATE MATERIALIZED VIEW analytics_referrer_stats AS
SELECT
  COALESCE(referrer, 'Direct') AS referrer,
  COUNT(*) AS sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS unique_users,
  SUM(page_views) AS total_page_views,
  AVG(duration_ms) AS avg_duration,
  COUNT(*) FILTER (WHERE is_bounce) * 100.0 / NULLIF(COUNT(*), 0) AS bounce_rate
FROM analytics_sessions
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY COALESCE(referrer, 'Direct');

CREATE UNIQUE INDEX IF NOT EXISTS idx_referrer_stats_pk ON analytics_referrer_stats(referrer);

-- =====================================================
-- Functions
-- =====================================================

-- Function to refresh all analytics materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_aggregate;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_hourly_traffic;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_top_pages;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_referrer_stats;
END;
$$ LANGUAGE plpgsql;

-- Function to track session start
CREATE OR REPLACE FUNCTION track_session_start(
  p_session_id TEXT,
  p_user_id UUID,
  p_page_url TEXT,
  p_referrer TEXT,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL,
  p_os TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL
)
RETURNS analytics_sessions AS $$
DECLARE
  v_session analytics_sessions;
BEGIN
  INSERT INTO analytics_sessions (
    id, user_id, first_page, landing_page, referrer,
    utm_source, utm_medium, utm_campaign,
    device_type, browser, os, country
  ) VALUES (
    p_session_id, p_user_id, p_page_url, p_page_url, p_referrer,
    p_utm_source, p_utm_medium, p_utm_campaign,
    p_device_type, p_browser, p_os, p_country
  )
  ON CONFLICT (id) DO UPDATE SET
    page_views = analytics_sessions.page_views + 1,
    is_bounce = FALSE,
    ended_at = NOW()
  RETURNING * INTO v_session;
  
  RETURN v_session;
END;
$$ LANGUAGE plpgsql;

-- Function to track conversion
CREATE OR REPLACE FUNCTION track_conversion(
  p_session_id TEXT,
  p_user_id UUID,
  p_goal_id TEXT,
  p_goal_name TEXT,
  p_value DECIMAL DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS conversions AS $$
DECLARE
  v_conversion conversions;
  v_source TEXT;
  v_campaign TEXT;
BEGIN
  -- Get attribution from session
  SELECT utm_source, utm_campaign INTO v_source, v_campaign
  FROM analytics_sessions WHERE id = p_session_id;
  
  INSERT INTO conversions (
    session_id, user_id, goal_id, goal_name, value, metadata,
    attributed_source, attributed_campaign
  ) VALUES (
    p_session_id, p_user_id, p_goal_id, p_goal_name, p_value, p_metadata,
    v_source, v_campaign
  )
  RETURNING * INTO v_conversion;
  
  RETURN v_conversion;
END;
$$ LANGUAGE plpgsql;

-- Function to get dashboard metrics
CREATE OR REPLACE FUNCTION get_analytics_dashboard(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_total_sessions INTEGER;
  v_total_users INTEGER;
  v_total_pageviews INTEGER;
  v_avg_duration NUMERIC;
  v_bounce_rate NUMERIC;
BEGIN
  -- Get session metrics
  SELECT 
    COUNT(*),
    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL),
    SUM(page_views),
    AVG(duration_ms),
    COUNT(*) FILTER (WHERE is_bounce) * 100.0 / NULLIF(COUNT(*), 0)
  INTO
    v_total_sessions,
    v_total_users,
    v_total_pageviews,
    v_avg_duration,
    v_bounce_rate
  FROM analytics_sessions
  WHERE started_at BETWEEN p_start_date AND p_end_date;
  
  v_result := jsonb_build_object(
    'sessions', COALESCE(v_total_sessions, 0),
    'users', COALESCE(v_total_users, 0),
    'pageViews', COALESCE(v_total_pageviews, 0),
    'avgDuration', COALESCE(v_avg_duration, 0),
    'bounceRate', COALESCE(v_bounce_rate, 0)
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_goals ENABLE ROW LEVEL SECURITY;

-- Only admins can read analytics data
CREATE POLICY "Admins can read page_views"
  ON page_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins can read sessions"
  ON analytics_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins can read conversions"
  ON conversions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'editor')
    )
  );

-- Goals management for admins only
CREATE POLICY "Admins can manage goals"
  ON analytics_goals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert policies for tracking (allow all)
CREATE POLICY "Anyone can insert page_views"
  ON page_views FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Anyone can insert sessions"
  ON analytics_sessions FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Anyone can insert conversions"
  ON conversions FOR INSERT
  WITH CHECK (TRUE);

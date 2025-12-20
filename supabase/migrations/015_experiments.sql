-- ============================================
-- Migration: 015_experiments
-- A/B Testing and experiment infrastructure
-- ============================================

-- Experiments table
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'running', 'paused', 'completed'
  
  -- Variants (stored as JSONB array)
  variants JSONB NOT NULL DEFAULT '[]',
  
  -- Targeting
  targeting_rules JSONB DEFAULT '[]',
  sample_size INTEGER DEFAULT 100 CHECK (sample_size >= 0 AND sample_size <= 100),
  
  -- Dates
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  
  -- Results
  winning_variant TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Experiment assignments (user/session to variant)
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_key TEXT NOT NULL,
  variant_key TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One assignment per user/session per experiment
  CONSTRAINT unique_user_assignment UNIQUE(experiment_key, user_id),
  CONSTRAINT unique_session_assignment UNIQUE(experiment_key, session_id),
  -- Must have either user_id or session_id
  CONSTRAINT has_identifier CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Experiment conversions
CREATE TABLE IF NOT EXISTS experiment_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_key TEXT NOT NULL,
  variant_key TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT,
  goal_key TEXT NOT NULL,
  value NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_experiments_key ON experiments(key);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_experiment ON experiment_assignments(experiment_key);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON experiment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_session ON experiment_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_conversions_experiment ON experiment_conversions(experiment_key);
CREATE INDEX IF NOT EXISTS idx_conversions_variant ON experiment_conversions(experiment_key, variant_key);
CREATE INDEX IF NOT EXISTS idx_conversions_goal ON experiment_conversions(goal_key);

-- RLS
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_conversions ENABLE ROW LEVEL SECURITY;

-- Experiments are readable by all authenticated users (for variant assignment)
CREATE POLICY "Authenticated can read experiments"
  ON experiments
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND status IN ('running', 'paused'));

-- Only admins can manage experiments
CREATE POLICY "Admins can manage experiments"
  ON experiments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Users can see their own assignments
CREATE POLICY "Users can see own assignments"
  ON experiment_assignments
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role can manage assignments
CREATE POLICY "Service can manage assignments"
  ON experiment_assignments
  FOR ALL
  USING (auth.uid() IS NULL); -- Service role has no uid

-- Users can see their own conversions
CREATE POLICY "Users can see own conversions"
  ON experiment_conversions
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can see all conversions
CREATE POLICY "Admins can see all conversions"
  ON experiment_conversions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to get experiment results
CREATE OR REPLACE FUNCTION get_experiment_results(p_experiment_key TEXT)
RETURNS TABLE (
  variant_key TEXT,
  participants BIGINT,
  conversions BIGINT,
  conversion_rate NUMERIC,
  avg_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH assignment_counts AS (
    SELECT 
      ea.variant_key,
      COUNT(DISTINCT COALESCE(ea.user_id::TEXT, ea.session_id)) as participant_count
    FROM experiment_assignments ea
    WHERE ea.experiment_key = p_experiment_key
    GROUP BY ea.variant_key
  ),
  conversion_stats AS (
    SELECT 
      ec.variant_key,
      COUNT(*) as conversion_count,
      AVG(ec.value) as average_value
    FROM experiment_conversions ec
    WHERE ec.experiment_key = p_experiment_key
    GROUP BY ec.variant_key
  )
  SELECT 
    ac.variant_key,
    ac.participant_count as participants,
    COALESCE(cs.conversion_count, 0) as conversions,
    CASE 
      WHEN ac.participant_count > 0 
      THEN ROUND((COALESCE(cs.conversion_count, 0)::NUMERIC / ac.participant_count::NUMERIC) * 100, 2)
      ELSE 0 
    END as conversion_rate,
    cs.average_value as avg_value
  FROM assignment_counts ac
  LEFT JOIN conversion_stats cs ON ac.variant_key = cs.variant_key
  ORDER BY ac.variant_key;
END;
$$;

-- Function to assign variant deterministically
CREATE OR REPLACE FUNCTION assign_experiment_variant(
  p_experiment_key TEXT,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_experiment RECORD;
  v_existing TEXT;
  v_variant JSONB;
  v_bucket INTEGER;
  v_cumulative INTEGER := 0;
  v_hash TEXT;
BEGIN
  -- Check for existing assignment
  IF p_user_id IS NOT NULL THEN
    SELECT variant_key INTO v_existing
    FROM experiment_assignments
    WHERE experiment_key = p_experiment_key AND user_id = p_user_id;
  ELSIF p_session_id IS NOT NULL THEN
    SELECT variant_key INTO v_existing
    FROM experiment_assignments
    WHERE experiment_key = p_experiment_key AND session_id = p_session_id;
  ELSE
    RETURN NULL;
  END IF;
  
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;
  
  -- Get experiment
  SELECT * INTO v_experiment
  FROM experiments
  WHERE key = p_experiment_key AND status = 'running';
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Calculate bucket based on hash
  v_hash := md5(p_experiment_key || ':' || COALESCE(p_user_id::TEXT, p_session_id));
  v_bucket := ('x' || substring(v_hash, 1, 8))::bit(32)::int % 100;
  
  -- Check sample size
  IF v_bucket >= v_experiment.sample_size THEN
    RETURN NULL;
  END IF;
  
  -- Select variant based on weights
  FOR v_variant IN SELECT * FROM jsonb_array_elements(v_experiment.variants)
  LOOP
    v_cumulative := v_cumulative + (v_variant->>'weight')::INTEGER;
    IF v_bucket < v_cumulative THEN
      -- Insert assignment
      INSERT INTO experiment_assignments (experiment_key, variant_key, user_id, session_id)
      VALUES (p_experiment_key, v_variant->>'key', p_user_id, p_session_id)
      ON CONFLICT DO NOTHING;
      
      RETURN v_variant->>'key';
    END IF;
  END LOOP;
  
  RETURN NULL;
END;
$$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_experiment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_experiment_timestamp ON experiments;
CREATE TRIGGER trigger_experiment_timestamp
  BEFORE UPDATE ON experiments
  FOR EACH ROW
  EXECUTE FUNCTION update_experiment_timestamp();

-- Grant functions
GRANT EXECUTE ON FUNCTION get_experiment_results TO authenticated;
GRANT EXECUTE ON FUNCTION assign_experiment_variant TO authenticated;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE experiments IS 'A/B test experiments configuration';
COMMENT ON TABLE experiment_assignments IS 'User/session to variant assignments';
COMMENT ON TABLE experiment_conversions IS 'Conversion events for experiments';
COMMENT ON FUNCTION get_experiment_results IS 'Get aggregated results for an experiment';
COMMENT ON FUNCTION assign_experiment_variant IS 'Deterministically assign a variant to a user/session';

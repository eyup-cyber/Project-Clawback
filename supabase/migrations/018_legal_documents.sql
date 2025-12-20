-- Legal Documents Schema
-- Manage terms of service, privacy policy, and consent records

-- =====================================================
-- Legal Documents Table
-- =====================================================

CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('terms_of_service', 'privacy_policy', 'cookie_policy', 'community_guidelines', 'dmca_policy', 'acceptable_use')),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  effective_date TIMESTAMPTZ NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  requires_acceptance BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(type, version)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_legal_docs_type ON legal_documents(type);
CREATE INDEX IF NOT EXISTS idx_legal_docs_current ON legal_documents(type, is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_legal_docs_effective ON legal_documents(effective_date DESC);

-- =====================================================
-- User Consents Table
-- =====================================================

CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES legal_documents(id),
  document_type TEXT NOT NULL,
  document_version TEXT NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT TRUE,
  ip_address INET,
  user_agent TEXT,
  consent_method TEXT DEFAULT 'click' CHECK (consent_method IN ('click', 'checkbox', 'implicit', 'api')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  UNIQUE(user_id, document_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_document ON user_consents(document_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(document_type);

-- =====================================================
-- Consent History Table
-- =====================================================

CREATE TABLE IF NOT EXISTS consent_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_id UUID REFERENCES user_consents(id),
  document_id UUID REFERENCES legal_documents(id),
  document_type TEXT NOT NULL,
  document_version TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('accepted', 'withdrawn', 'updated', 'expired')),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consent_history_user ON consent_history(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_history_date ON consent_history(created_at DESC);

-- =====================================================
-- Marketing Consents Table
-- =====================================================

CREATE TABLE IF NOT EXISTS marketing_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('email_marketing', 'push_notifications', 'sms', 'third_party', 'analytics', 'personalization')),
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT DEFAULT 'website',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(COALESCE(user_id::text, email), consent_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_consents_user ON marketing_consents(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketing_consents_email ON marketing_consents(email) WHERE email IS NOT NULL;

-- =====================================================
-- Data Processing Records Table (GDPR Article 30)
-- =====================================================

CREATE TABLE IF NOT EXISTS data_processing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_activity TEXT NOT NULL,
  purpose TEXT NOT NULL,
  legal_basis TEXT NOT NULL CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')),
  data_categories TEXT[] NOT NULL,
  data_subjects TEXT[] NOT NULL,
  recipients TEXT[],
  third_countries TEXT[],
  retention_period TEXT,
  security_measures TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Functions
-- =====================================================

-- Function to set current document
CREATE OR REPLACE FUNCTION set_current_legal_document(p_document_id UUID)
RETURNS VOID AS $$
DECLARE
  v_type TEXT;
BEGIN
  -- Get the document type
  SELECT type INTO v_type FROM legal_documents WHERE id = p_document_id;
  
  -- Unset current for all documents of this type
  UPDATE legal_documents SET is_current = FALSE WHERE type = v_type;
  
  -- Set this document as current
  UPDATE legal_documents SET is_current = TRUE WHERE id = p_document_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has accepted current version
CREATE OR REPLACE FUNCTION has_accepted_current_terms(p_user_id UUID, p_document_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_id UUID;
  v_has_consent BOOLEAN;
BEGIN
  -- Get current document ID
  SELECT id INTO v_current_id
  FROM legal_documents
  WHERE type = p_document_type AND is_current = TRUE
  LIMIT 1;
  
  IF v_current_id IS NULL THEN
    RETURN TRUE; -- No current document, assume accepted
  END IF;
  
  -- Check if user has consent
  SELECT EXISTS (
    SELECT 1 FROM user_consents
    WHERE user_id = p_user_id
    AND document_id = v_current_id
    AND consent_given = TRUE
    AND withdrawn_at IS NULL
  ) INTO v_has_consent;
  
  RETURN v_has_consent;
END;
$$ LANGUAGE plpgsql;

-- Function to record consent
CREATE OR REPLACE FUNCTION record_consent(
  p_user_id UUID,
  p_document_type TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_method TEXT DEFAULT 'click'
)
RETURNS UUID AS $$
DECLARE
  v_document legal_documents%ROWTYPE;
  v_consent_id UUID;
BEGIN
  -- Get current document
  SELECT * INTO v_document
  FROM legal_documents
  WHERE type = p_document_type AND is_current = TRUE
  LIMIT 1;
  
  IF v_document.id IS NULL THEN
    RAISE EXCEPTION 'No current document found for type: %', p_document_type;
  END IF;
  
  -- Insert or update consent
  INSERT INTO user_consents (
    user_id, document_id, document_type, document_version,
    consent_given, ip_address, user_agent, consent_method
  ) VALUES (
    p_user_id, v_document.id, v_document.type, v_document.version,
    TRUE, p_ip_address, p_user_agent, p_method
  )
  ON CONFLICT (user_id, document_id) DO UPDATE SET
    consent_given = TRUE,
    ip_address = EXCLUDED.ip_address,
    user_agent = EXCLUDED.user_agent,
    withdrawn_at = NULL
  RETURNING id INTO v_consent_id;
  
  -- Record in history
  INSERT INTO consent_history (
    user_id, consent_id, document_id, document_type, document_version,
    action, ip_address, user_agent
  ) VALUES (
    p_user_id, v_consent_id, v_document.id, v_document.type, v_document.version,
    'accepted', p_ip_address, p_user_agent
  );
  
  RETURN v_consent_id;
END;
$$ LANGUAGE plpgsql;

-- Function to withdraw consent
CREATE OR REPLACE FUNCTION withdraw_consent(
  p_user_id UUID,
  p_document_type TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_consent user_consents%ROWTYPE;
BEGIN
  -- Get current consent
  SELECT uc.* INTO v_consent
  FROM user_consents uc
  JOIN legal_documents ld ON uc.document_id = ld.id
  WHERE uc.user_id = p_user_id
  AND ld.type = p_document_type
  AND ld.is_current = TRUE;
  
  IF v_consent.id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update consent
  UPDATE user_consents SET
    consent_given = FALSE,
    withdrawn_at = NOW()
  WHERE id = v_consent.id;
  
  -- Record in history
  INSERT INTO consent_history (
    user_id, consent_id, document_id, document_type, document_version,
    action, ip_address, user_agent
  ) VALUES (
    p_user_id, v_consent.id, v_consent.document_id, v_consent.document_type, v_consent.document_version,
    'withdrawn', p_ip_address, p_user_agent
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's consent status
CREATE OR REPLACE FUNCTION get_user_consent_status(p_user_id UUID)
RETURNS TABLE (
  document_type TEXT,
  document_version TEXT,
  has_consented BOOLEAN,
  consented_at TIMESTAMPTZ,
  is_current_version BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ld.type,
    ld.version,
    COALESCE(uc.consent_given, FALSE) AND uc.withdrawn_at IS NULL,
    uc.created_at,
    ld.is_current
  FROM legal_documents ld
  LEFT JOIN user_consents uc ON ld.id = uc.document_id AND uc.user_id = p_user_id
  WHERE ld.is_current = TRUE
  ORDER BY ld.type;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_records ENABLE ROW LEVEL SECURITY;

-- Legal documents are public for reading
CREATE POLICY "Anyone can read legal documents"
  ON legal_documents FOR SELECT
  USING (TRUE);

-- Only admins can manage legal documents
CREATE POLICY "Admins can manage legal documents"
  ON legal_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can read their own consents
CREATE POLICY "Users can read own consents"
  ON user_consents FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own consents
CREATE POLICY "Users can insert own consents"
  ON user_consents FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own consents
CREATE POLICY "Users can update own consents"
  ON user_consents FOR UPDATE
  USING (user_id = auth.uid());

-- Users can read their own consent history
CREATE POLICY "Users can read own consent history"
  ON consent_history FOR SELECT
  USING (user_id = auth.uid());

-- Users can manage their own marketing consents
CREATE POLICY "Users can manage own marketing consents"
  ON marketing_consents FOR ALL
  USING (user_id = auth.uid());

-- Admins can read all consents
CREATE POLICY "Admins can read all consents"
  ON user_consents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can manage data processing records
CREATE POLICY "Admins can manage data processing records"
  ON data_processing_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- Seed Data: Initial Legal Documents
-- =====================================================

INSERT INTO legal_documents (type, version, title, content, summary, effective_date, is_current, requires_acceptance)
VALUES 
  (
    'terms_of_service',
    '1.0',
    'Terms of Service',
    'Please read these Terms of Service carefully before using Scroungers...',
    'Our terms govern your use of the platform and your rights and responsibilities.',
    NOW(),
    TRUE,
    TRUE
  ),
  (
    'privacy_policy',
    '1.0',
    'Privacy Policy',
    'This Privacy Policy describes how Scroungers collects, uses, and shares information...',
    'How we collect, use, and protect your personal information.',
    NOW(),
    TRUE,
    TRUE
  ),
  (
    'cookie_policy',
    '1.0',
    'Cookie Policy',
    'This Cookie Policy explains how Scroungers uses cookies and similar technologies...',
    'Information about cookies and tracking technologies we use.',
    NOW(),
    TRUE,
    FALSE
  ),
  (
    'community_guidelines',
    '1.0',
    'Community Guidelines',
    'These Community Guidelines help ensure Scroungers remains a safe and welcoming place...',
    'Rules and standards for community behavior and content.',
    NOW(),
    TRUE,
    FALSE
  )
ON CONFLICT (type, version) DO NOTHING;

-- ============================================================================
-- ENHANCED PROFILES
-- Additional columns for complete user profiles as per plan Phase 1.1.1
-- ============================================================================

-- Add missing columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github_handle TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_ip TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned) WHERE is_banned = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON profiles(last_login_at DESC);

-- Add search index for profile discovery
CREATE INDEX IF NOT EXISTS idx_profiles_search_full ON profiles USING GIN (
  to_tsvector('english', 
    COALESCE(display_name, '') || ' ' || 
    COALESCE(username, '') || ' ' || 
    COALESCE(bio, '') || ' ' ||
    COALESCE(location, '')
  )
);

-- Add constraints
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS chk_follower_count_positive 
  CHECK (follower_count >= 0);
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS chk_following_count_positive 
  CHECK (following_count >= 0);

-- Update the profile view policy to exclude banned users from public view
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (status = 'active' AND NOT COALESCE(is_banned, FALSE));

-- ============================================================================
-- PASSWORD RESET TOKENS TABLE
-- Phase 1.1.4: Secure password reset flow
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);

-- RLS for password reset tokens
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages password reset tokens"
  ON password_reset_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- Function to generate password reset token
CREATE OR REPLACE FUNCTION generate_password_reset_token(p_user_id UUID, p_token_hash TEXT)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Invalidate any existing tokens for this user
  UPDATE password_reset_tokens 
  SET used = TRUE 
  WHERE user_id = p_user_id AND used = FALSE;
  
  -- Create new token with 1 hour expiry
  INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
  VALUES (p_user_id, p_token_hash, NOW() + INTERVAL '1 hour')
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and use password reset token
CREATE OR REPLACE FUNCTION use_password_reset_token(p_token_hash TEXT)
RETURNS UUID AS $$
DECLARE
  token_record RECORD;
BEGIN
  SELECT * INTO token_record
  FROM password_reset_tokens
  WHERE token_hash = p_token_hash
    AND used = FALSE
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  UPDATE password_reset_tokens
  SET used = TRUE, used_at = NOW()
  WHERE id = token_record.id;
  
  RETURN token_record.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- EMAIL VERIFICATION TOKENS TABLE
-- Phase 1.1.5: Email verification and change flow
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  new_email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verify_user ON email_verification_tokens(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_verify_token ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verify_expires ON email_verification_tokens(expires_at);

-- RLS
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages email verification tokens"
  ON email_verification_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- OAUTH ACCOUNTS TABLE
-- Phase 1.1.7: Multi-provider OAuth support
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_accounts(provider, provider_account_id);

-- RLS
ALTER TABLE oauth_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own OAuth accounts"
  ON oauth_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own OAuth accounts"
  ON oauth_accounts FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages OAuth accounts"
  ON oauth_accounts FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger to update updated_at
CREATE TRIGGER update_oauth_accounts_updated_at
  BEFORE UPDATE ON oauth_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE password_reset_tokens IS 'Secure tokens for password reset flow';
COMMENT ON TABLE email_verification_tokens IS 'Tokens for email verification and email change';
COMMENT ON TABLE oauth_accounts IS 'Linked OAuth provider accounts per user';

-- ============================================================================
-- TWO-FACTOR AUTHENTICATION
-- Adds 2FA support with TOTP and backup codes
-- ============================================================================

-- Add 2FA columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS backup_codes TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMPTZ;

-- Create index for 2FA lookups
CREATE INDEX IF NOT EXISTS idx_profiles_totp_enabled ON profiles(totp_enabled) WHERE totp_enabled = TRUE;

-- Create table for 2FA recovery attempts
CREATE TABLE IF NOT EXISTS two_factor_recovery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  backup_code_index INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_2fa_recovery_user ON two_factor_recovery_attempts(user_id, created_at DESC);

-- Create table for 2FA challenge sessions (for login flow)
CREATE TABLE IF NOT EXISTS two_factor_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_2fa_challenges_token ON two_factor_challenges(challenge_token);
CREATE INDEX IF NOT EXISTS idx_2fa_challenges_user ON two_factor_challenges(user_id, created_at DESC);

-- Auto-cleanup expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_2fa_challenges()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM two_factor_challenges WHERE expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup on insert
DROP TRIGGER IF EXISTS trigger_cleanup_2fa_challenges ON two_factor_challenges;
CREATE TRIGGER trigger_cleanup_2fa_challenges
  AFTER INSERT ON two_factor_challenges
  EXECUTE FUNCTION cleanup_expired_2fa_challenges();

-- RLS Policies
ALTER TABLE two_factor_recovery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_challenges ENABLE ROW LEVEL SECURITY;

-- Users can only see their own recovery attempts
CREATE POLICY "Users can view own recovery attempts"
  ON two_factor_recovery_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage recovery attempts
CREATE POLICY "Service role can manage recovery attempts"
  ON two_factor_recovery_attempts FOR ALL
  USING (auth.role() = 'service_role');

-- Challenges are managed by service role only
CREATE POLICY "Service role can manage 2FA challenges"
  ON two_factor_challenges FOR ALL
  USING (auth.role() = 'service_role');

-- Function to check if user has 2FA enabled
CREATE OR REPLACE FUNCTION user_has_2fa_enabled(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(totp_enabled, FALSE)
  FROM profiles
  WHERE id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to disable 2FA (clears all 2FA data)
CREATE OR REPLACE FUNCTION disable_user_2fa(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET 
    totp_secret = NULL,
    totp_enabled = FALSE,
    backup_codes = NULL,
    totp_verified_at = NULL
  WHERE id = user_uuid;
  
  -- Clear any pending challenges
  DELETE FROM two_factor_challenges WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE two_factor_recovery_attempts IS 'Audit log for 2FA backup code usage';
COMMENT ON TABLE two_factor_challenges IS 'Temporary challenges for 2FA verification during login';

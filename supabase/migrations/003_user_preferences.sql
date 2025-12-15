-- ============================================================================
-- MIGRATION 003: USER PREFERENCES
-- User notification and privacy settings
-- ============================================================================

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Email notification preferences
    email_new_comment BOOLEAN DEFAULT true,
    email_comment_reply BOOLEAN DEFAULT true,
    email_new_reaction BOOLEAN DEFAULT true,
    email_post_published BOOLEAN DEFAULT true,
    email_post_rejected BOOLEAN DEFAULT false,
    email_weekly_digest BOOLEAN DEFAULT true,
    email_newsletter BOOLEAN DEFAULT true,
    email_announcements BOOLEAN DEFAULT true,
    
    -- In-app notification preferences
    notify_new_comment BOOLEAN DEFAULT true,
    notify_comment_reply BOOLEAN DEFAULT true,
    notify_new_reaction BOOLEAN DEFAULT true,
    notify_new_follower BOOLEAN DEFAULT true,
    notify_mentions BOOLEAN DEFAULT true,
    
    -- Privacy settings
    show_email_publicly BOOLEAN DEFAULT false,
    show_profile_publicly BOOLEAN DEFAULT true,
    allow_messages BOOLEAN DEFAULT true,
    
    -- Display preferences
    theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language VARCHAR(10) DEFAULT 'en',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- Function to auto-create preferences on new user
CREATE OR REPLACE FUNCTION handle_new_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences when profile is created
DROP TRIGGER IF EXISTS on_profile_created_preferences ON public.profiles;
CREATE TRIGGER on_profile_created_preferences
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_preferences();

-- Update updated_at trigger
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON user_preferences TO authenticated;
GRANT SELECT ON user_preferences TO anon;


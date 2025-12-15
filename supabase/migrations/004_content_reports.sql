-- ============================================================================
-- MIGRATION 004: CONTENT REPORTS
-- Flagging and moderation tracking
-- ============================================================================

-- Create report reasons enum type
DO $$ BEGIN
    CREATE TYPE report_reason AS ENUM (
        'spam',
        'harassment',
        'hate_speech',
        'misinformation',
        'copyright',
        'inappropriate',
        'off_topic',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create report status enum type
DO $$ BEGIN
    CREATE TYPE report_status AS ENUM (
        'pending',
        'reviewing',
        'resolved',
        'dismissed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create content_reports table
CREATE TABLE IF NOT EXISTS content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reporter info
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Reported content (one of these will be set)
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Report details
    reason report_reason NOT NULL,
    description TEXT,
    
    -- Status tracking
    status report_status DEFAULT 'pending',
    
    -- Moderation
    moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    moderator_notes TEXT,
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure at least one content reference is set
    CONSTRAINT content_reports_content_check CHECK (
        (post_id IS NOT NULL)::int +
        (comment_id IS NOT NULL)::int +
        (user_id IS NOT NULL)::int = 1
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_post ON content_reports(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_reports_comment ON content_reports(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_reports_user ON content_reports(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_created ON content_reports(created_at DESC);

-- Enable RLS
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can create reports
CREATE POLICY "Users can create reports"
    ON content_reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
    ON content_reports FOR SELECT
    USING (auth.uid() = reporter_id);

-- Admins/editors can view all reports
CREATE POLICY "Moderators can view all reports"
    ON content_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

-- Admins/editors can update reports
CREATE POLICY "Moderators can update reports"
    ON content_reports FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

-- Update updated_at trigger
CREATE TRIGGER update_content_reports_updated_at
    BEFORE UPDATE ON content_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to prevent duplicate reports
CREATE OR REPLACE FUNCTION check_duplicate_report()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM content_reports
        WHERE reporter_id = NEW.reporter_id
        AND status = 'pending'
        AND (
            (NEW.post_id IS NOT NULL AND post_id = NEW.post_id) OR
            (NEW.comment_id IS NOT NULL AND comment_id = NEW.comment_id) OR
            (NEW.user_id IS NOT NULL AND user_id = NEW.user_id)
        )
    ) THEN
        RAISE EXCEPTION 'You have already reported this content';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent duplicates
CREATE TRIGGER check_duplicate_report_trigger
    BEFORE INSERT ON content_reports
    FOR EACH ROW
    EXECUTE FUNCTION check_duplicate_report();

-- Grant permissions
GRANT ALL ON content_reports TO authenticated;


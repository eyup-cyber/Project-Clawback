-- =============================================================================
-- Phase 5: Editorial Workflow
-- Review assignment, inline annotations, revision tracking
-- =============================================================================

-- =============================================================================
-- REVIEW ASSIGNMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS review_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'declined')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    due_date TIMESTAMPTZ,
    notes TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(post_id, reviewer_id)
);

-- Indexes for review_assignments
CREATE INDEX IF NOT EXISTS idx_review_assignments_reviewer ON review_assignments(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_review_assignments_post ON review_assignments(post_id);
CREATE INDEX IF NOT EXISTS idx_review_assignments_status ON review_assignments(status);
CREATE INDEX IF NOT EXISTS idx_review_assignments_due_date ON review_assignments(due_date) WHERE due_date IS NOT NULL;

-- RLS for review_assignments
ALTER TABLE review_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their assigned reviews"
    ON review_assignments FOR SELECT
    USING (
        reviewer_id = auth.uid() OR
        assigned_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM posts WHERE posts.id = review_assignments.post_id AND posts.author_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('editor', 'admin', 'superadmin')
        )
    );

CREATE POLICY "Editors can create review assignments"
    ON review_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('editor', 'admin', 'superadmin')
        )
    );

CREATE POLICY "Reviewers can update their assignments"
    ON review_assignments FOR UPDATE
    USING (
        reviewer_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('editor', 'admin', 'superadmin')
        )
    );

-- =============================================================================
-- INLINE ANNOTATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS inline_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('text', 'image', 'embed')),
    target_selector TEXT NOT NULL, -- CSS selector or text position marker
    content TEXT NOT NULL,
    annotation_type TEXT NOT NULL CHECK (annotation_type IN ('comment', 'suggestion', 'correction', 'question')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for inline_annotations
CREATE INDEX IF NOT EXISTS idx_inline_annotations_post ON inline_annotations(post_id);
CREATE INDEX IF NOT EXISTS idx_inline_annotations_author ON inline_annotations(author_id);
CREATE INDEX IF NOT EXISTS idx_inline_annotations_status ON inline_annotations(status);

-- RLS for inline_annotations
ALTER TABLE inline_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view annotations on posts they can access"
    ON inline_annotations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.id = inline_annotations.post_id 
            AND (
                posts.author_id = auth.uid() OR
                posts.status = 'published' OR
                EXISTS (
                    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('editor', 'admin', 'superadmin')
                )
            )
        )
    );

CREATE POLICY "Editors can create annotations"
    ON inline_annotations FOR INSERT
    WITH CHECK (
        author_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('editor', 'admin', 'superadmin')
        )
    );

CREATE POLICY "Authors and resolvers can update annotations"
    ON inline_annotations FOR UPDATE
    USING (
        author_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM posts WHERE posts.id = inline_annotations.post_id AND posts.author_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('editor', 'admin', 'superadmin')
        )
    );

-- =============================================================================
-- ANNOTATION REPLIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS annotation_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    annotation_id UUID NOT NULL REFERENCES inline_annotations(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_annotation_replies_annotation ON annotation_replies(annotation_id);

-- RLS for annotation_replies
ALTER TABLE annotation_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view replies on accessible annotations"
    ON annotation_replies FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM inline_annotations ia
            JOIN posts p ON p.id = ia.post_id
            WHERE ia.id = annotation_replies.annotation_id
            AND (
                p.author_id = auth.uid() OR
                p.status = 'published' OR
                EXISTS (
                    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('editor', 'admin', 'superadmin')
                )
            )
        )
    );

CREATE POLICY "Users can create replies"
    ON annotation_replies FOR INSERT
    WITH CHECK (
        author_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM inline_annotations ia
            JOIN posts p ON p.id = ia.post_id
            WHERE ia.id = annotation_replies.annotation_id
            AND (
                p.author_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('contributor', 'editor', 'admin', 'superadmin')
                )
            )
        )
    );

-- =============================================================================
-- REVISION REQUESTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS revision_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    details TEXT,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    items JSONB NOT NULL DEFAULT '[]', -- Array of revision items
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_revision_requests_post ON revision_requests(post_id);
CREATE INDEX IF NOT EXISTS idx_revision_requests_status ON revision_requests(status);

-- RLS for revision_requests
ALTER TABLE revision_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view revision requests for their posts"
    ON revision_requests FOR SELECT
    USING (
        reviewer_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM posts WHERE posts.id = revision_requests.post_id AND posts.author_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('editor', 'admin', 'superadmin')
        )
    );

CREATE POLICY "Editors can create revision requests"
    ON revision_requests FOR INSERT
    WITH CHECK (
        reviewer_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('editor', 'admin', 'superadmin')
        )
    );

CREATE POLICY "Authors and reviewers can update revision requests"
    ON revision_requests FOR UPDATE
    USING (
        reviewer_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM posts WHERE posts.id = revision_requests.post_id AND posts.author_id = auth.uid()
        )
    );

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Get available reviewers with workload
CREATE OR REPLACE FUNCTION get_available_reviewers(
    p_exclude_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    display_name TEXT,
    pending_reviews BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.display_name,
        COUNT(ra.id) FILTER (WHERE ra.status IN ('pending', 'in_progress')) as pending_reviews
    FROM profiles p
    LEFT JOIN review_assignments ra ON ra.reviewer_id = p.id
    WHERE 
        p.role IN ('editor', 'admin', 'superadmin')
        AND p.status = 'active'
        AND NOT (p.id = ANY(p_exclude_user_ids))
    GROUP BY p.id, p.username, p.display_name
    ORDER BY pending_reviews ASC, p.display_name ASC
    LIMIT p_limit;
END;
$$;

-- Get review statistics for a user
CREATE OR REPLACE FUNCTION get_reviewer_stats(p_reviewer_id UUID)
RETURNS TABLE (
    total_reviews BIGINT,
    completed_reviews BIGINT,
    pending_reviews BIGINT,
    avg_review_time_hours NUMERIC,
    reviews_this_week BIGINT,
    reviews_this_month BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_reviews,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_reviews,
        COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress')) as pending_reviews,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600) 
            FILTER (WHERE completed_at IS NOT NULL AND started_at IS NOT NULL) as avg_review_time_hours,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as reviews_this_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as reviews_this_month
    FROM review_assignments
    WHERE reviewer_id = p_reviewer_id;
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_editorial_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_review_assignments_updated_at
    BEFORE UPDATE ON review_assignments
    FOR EACH ROW EXECUTE FUNCTION update_editorial_updated_at();

CREATE TRIGGER update_inline_annotations_updated_at
    BEFORE UPDATE ON inline_annotations
    FOR EACH ROW EXECUTE FUNCTION update_editorial_updated_at();

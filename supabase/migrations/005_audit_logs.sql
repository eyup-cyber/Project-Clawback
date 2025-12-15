-- ============================================================================
-- MIGRATION 005: AUDIT LOGS
-- Security and compliance logging
-- ============================================================================

-- Create action type enum
DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM (
        -- Auth actions
        'auth.login',
        'auth.logout',
        'auth.password_reset',
        'auth.email_change',
        
        -- User actions
        'user.create',
        'user.update',
        'user.delete',
        'user.role_change',
        'user.suspend',
        'user.reactivate',
        
        -- Post actions
        'post.create',
        'post.update',
        'post.delete',
        'post.publish',
        'post.reject',
        'post.feature',
        
        -- Comment actions
        'comment.create',
        'comment.update',
        'comment.delete',
        'comment.flag',
        
        -- Application actions
        'application.submit',
        'application.approve',
        'application.reject',
        
        -- Admin actions
        'admin.settings_update',
        'admin.bulk_action',
        
        -- Security actions
        'security.api_key_create',
        'security.api_key_revoke',
        'security.suspicious_activity'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Who performed the action
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email TEXT,
    actor_role TEXT,
    
    -- What action was performed
    action audit_action NOT NULL,
    
    -- What was affected
    target_type TEXT, -- 'user', 'post', 'comment', 'application', etc.
    target_id UUID,
    
    -- Additional context
    metadata JSONB DEFAULT '{}',
    
    -- Request info
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip_address);

-- Partial index for security-related actions
CREATE INDEX IF NOT EXISTS idx_audit_logs_security ON audit_logs(created_at DESC)
    WHERE action IN ('auth.login', 'auth.password_reset', 'security.suspicious_activity');

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- System can insert audit logs (no user restriction for inserts via service role)
CREATE POLICY "System can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_action audit_action,
    p_actor_id UUID DEFAULT NULL,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_actor_email TEXT;
    v_actor_role TEXT;
    v_log_id UUID;
BEGIN
    -- Get actor info if available
    IF p_actor_id IS NOT NULL THEN
        SELECT email INTO v_actor_email
        FROM auth.users
        WHERE id = p_actor_id;
        
        SELECT role INTO v_actor_role
        FROM profiles
        WHERE id = p_actor_id;
    END IF;
    
    -- Insert audit log
    INSERT INTO audit_logs (
        actor_id,
        actor_email,
        actor_role,
        action,
        target_type,
        target_id,
        metadata,
        ip_address,
        user_agent,
        request_id
    ) VALUES (
        p_actor_id,
        v_actor_email,
        v_actor_role,
        p_action,
        p_target_type,
        p_target_id,
        p_metadata,
        p_ip_address,
        p_user_agent,
        p_request_id
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatic audit triggers for sensitive operations

-- Audit user role changes
CREATE OR REPLACE FUNCTION audit_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        PERFORM log_audit_event(
            'user.role_change'::audit_action,
            auth.uid(),
            'user',
            NEW.id,
            jsonb_build_object(
                'old_role', OLD.role,
                'new_role', NEW.role
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_profile_role_change ON profiles;
CREATE TRIGGER audit_profile_role_change
    AFTER UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION audit_role_change();

-- Audit post status changes
CREATE OR REPLACE FUNCTION audit_post_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        IF NEW.status = 'published' THEN
            PERFORM log_audit_event(
                'post.publish'::audit_action,
                auth.uid(),
                'post',
                NEW.id,
                jsonb_build_object('title', NEW.title)
            );
        ELSIF NEW.status = 'rejected' THEN
            PERFORM log_audit_event(
                'post.reject'::audit_action,
                auth.uid(),
                'post',
                NEW.id,
                jsonb_build_object('title', NEW.title)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_post_status ON posts;
CREATE TRIGGER audit_post_status
    AFTER UPDATE ON posts
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION audit_post_status_change();

-- Grant permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO service_role;
GRANT EXECUTE ON FUNCTION log_audit_event TO authenticated;


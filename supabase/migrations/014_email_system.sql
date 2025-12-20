-- ============================================================================
-- EMAIL SYSTEM
-- Phase 1.7.4-1.7.5: Email queue and templates
-- ============================================================================

-- ============================================================================
-- EMAIL TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_template, text_template, variables) VALUES
(
  'welcome',
  'Welcome to Scroungers Multimedia!',
  '<!DOCTYPE html><html><body>
    <h1>Welcome, {{name}}!</h1>
    <p>Thanks for joining Scroungers Multimedia. We''re excited to have you!</p>
    <p>Start exploring articles now:</p>
    <a href="{{siteUrl}}/articles">Browse Articles</a>
  </body></html>',
  'Welcome, {{name}}! Thanks for joining Scroungers Multimedia. Start exploring at {{siteUrl}}/articles',
  '["name", "siteUrl"]'
),
(
  'password_reset',
  'Reset Your Password',
  '<!DOCTYPE html><html><body>
    <h1>Password Reset Request</h1>
    <p>Hi {{name}},</p>
    <p>You requested to reset your password. Click the link below to set a new password:</p>
    <a href="{{resetUrl}}">Reset Password</a>
    <p>This link expires in 1 hour.</p>
    <p>If you didn''t request this, please ignore this email.</p>
  </body></html>',
  'Hi {{name}}, Reset your password at: {{resetUrl}} (expires in 1 hour)',
  '["name", "resetUrl"]'
),
(
  'email_verification',
  'Verify Your Email Address',
  '<!DOCTYPE html><html><body>
    <h1>Verify Your Email</h1>
    <p>Hi {{name}},</p>
    <p>Please verify your email address by clicking the link below:</p>
    <a href="{{verifyUrl}}">Verify Email</a>
    <p>This link expires in 24 hours.</p>
  </body></html>',
  'Hi {{name}}, Verify your email at: {{verifyUrl}}',
  '["name", "verifyUrl"]'
),
(
  'magic_link',
  'Your Login Link',
  '<!DOCTYPE html><html><body>
    <h1>Login to Scroungers Multimedia</h1>
    <p>Hi {{name}},</p>
    <p>Click the link below to log in:</p>
    <a href="{{magicLink}}">Log In</a>
    <p>This link expires in 15 minutes.</p>
  </body></html>',
  'Hi {{name}}, Log in at: {{magicLink}} (expires in 15 minutes)',
  '["name", "magicLink"]'
),
(
  'new_follower',
  '{{followerName}} is now following you!',
  '<!DOCTYPE html><html><body>
    <h1>New Follower!</h1>
    <p>Hi {{name}},</p>
    <p>{{followerName}} started following you on Scroungers Multimedia.</p>
    <a href="{{profileUrl}}">View their profile</a>
  </body></html>',
  '{{followerName}} is now following you! View their profile: {{profileUrl}}',
  '["name", "followerName", "profileUrl"]'
),
(
  'post_published',
  'Your article "{{postTitle}}" is now live!',
  '<!DOCTYPE html><html><body>
    <h1>Your Article is Published!</h1>
    <p>Hi {{name}},</p>
    <p>Great news! Your article "{{postTitle}}" has been published.</p>
    <a href="{{postUrl}}">View your article</a>
    <p>Share it with your network to get more readers!</p>
  </body></html>',
  'Your article "{{postTitle}}" is now live! View it at: {{postUrl}}',
  '["name", "postTitle", "postUrl"]'
),
(
  'post_rejected',
  'Update needed for your article',
  '<!DOCTYPE html><html><body>
    <h1>Article Needs Revision</h1>
    <p>Hi {{name}},</p>
    <p>Your article "{{postTitle}}" needs some revisions before it can be published.</p>
    <p><strong>Feedback:</strong></p>
    <p>{{feedback}}</p>
    <a href="{{editUrl}}">Edit your article</a>
  </body></html>',
  'Your article "{{postTitle}}" needs revision. Feedback: {{feedback}}',
  '["name", "postTitle", "feedback", "editUrl"]'
),
(
  'new_comment',
  'New comment on "{{postTitle}}"',
  '<!DOCTYPE html><html><body>
    <h1>New Comment</h1>
    <p>Hi {{name}},</p>
    <p>{{commenterName}} commented on your article "{{postTitle}}":</p>
    <blockquote>{{commentExcerpt}}</blockquote>
    <a href="{{commentUrl}}">View and reply</a>
  </body></html>',
  '{{commenterName}} commented on "{{postTitle}}": {{commentExcerpt}}',
  '["name", "commenterName", "postTitle", "commentExcerpt", "commentUrl"]'
),
(
  'application_approved',
  'Congratulations! Your contributor application was approved',
  '<!DOCTYPE html><html><body>
    <h1>You''re Now a Contributor!</h1>
    <p>Hi {{name}},</p>
    <p>Congratulations! Your application to become a contributor at Scroungers Multimedia has been approved.</p>
    <p>You can now start writing and submitting articles.</p>
    <a href="{{dashboardUrl}}">Go to your dashboard</a>
  </body></html>',
  'Congratulations {{name}}! You are now a contributor. Start writing at {{dashboardUrl}}',
  '["name", "dashboardUrl"]'
),
(
  'application_rejected',
  'Update on your contributor application',
  '<!DOCTYPE html><html><body>
    <h1>Application Update</h1>
    <p>Hi {{name}},</p>
    <p>Thank you for your interest in becoming a contributor at Scroungers Multimedia.</p>
    <p>Unfortunately, we''re unable to approve your application at this time.</p>
    <p>{{feedback}}</p>
    <p>You''re welcome to reapply in the future.</p>
  </body></html>',
  'Hi {{name}}, Unfortunately we cannot approve your application at this time. {{feedback}}',
  '["name", "feedback"]'
)
ON CONFLICT (name) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_template = EXCLUDED.html_template,
  text_template = EXCLUDED.text_template,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- ============================================================================
-- EMAIL QUEUE TABLE (Enhanced)
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  to_name TEXT,
  from_email TEXT DEFAULT 'noreply@scroungers.com',
  from_name TEXT DEFAULT 'Scroungers Multimedia',
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  template_name TEXT REFERENCES email_templates(name),
  template_data JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 5,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_created ON email_queue(created_at DESC);

-- RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Admins can manage templates
CREATE POLICY "Admins can view email templates"
  ON email_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Superadmins can manage email templates"
  ON email_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'superadmin'
    )
  );

-- Email queue is service-role only
CREATE POLICY "Service role manages email queue"
  ON email_queue FOR ALL
  USING (auth.role() = 'service_role');

-- Admins can view email queue
CREATE POLICY "Admins can view email queue"
  ON email_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Function to queue an email using a template
CREATE OR REPLACE FUNCTION queue_templated_email(
  p_to_email TEXT,
  p_to_name TEXT,
  p_template_name TEXT,
  p_template_data JSONB,
  p_scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  p_priority INTEGER DEFAULT 5
)
RETURNS UUID AS $$
DECLARE
  template email_templates;
  rendered_subject TEXT;
  rendered_html TEXT;
  rendered_text TEXT;
  new_id UUID;
  key TEXT;
  value TEXT;
BEGIN
  -- Get template
  SELECT * INTO template FROM email_templates WHERE name = p_template_name AND is_active = TRUE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email template % not found or inactive', p_template_name;
  END IF;
  
  -- Simple template rendering (replace {{var}} with values)
  rendered_subject := template.subject;
  rendered_html := template.html_template;
  rendered_text := COALESCE(template.text_template, '');
  
  FOR key, value IN SELECT * FROM jsonb_each_text(p_template_data)
  LOOP
    rendered_subject := REPLACE(rendered_subject, '{{' || key || '}}', value);
    rendered_html := REPLACE(rendered_html, '{{' || key || '}}', value);
    rendered_text := REPLACE(rendered_text, '{{' || key || '}}', value);
  END LOOP;
  
  -- Queue the email
  INSERT INTO email_queue (
    to_email, to_name, subject, html_content, text_content, 
    template_name, template_data, scheduled_for, priority
  )
  VALUES (
    p_to_email, p_to_name, rendered_subject, rendered_html, rendered_text,
    p_template_name, p_template_data, p_scheduled_for, p_priority
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process email queue (for worker)
CREATE OR REPLACE FUNCTION get_pending_emails(p_batch_size INTEGER DEFAULT 10)
RETURNS SETOF email_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE email_queue
  SET status = 'processing'
  WHERE id IN (
    SELECT id FROM email_queue
    WHERE status = 'pending'
      AND scheduled_for <= NOW()
    ORDER BY priority ASC, scheduled_for ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark email as sent
CREATE OR REPLACE FUNCTION mark_email_sent(p_email_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE email_queue
  SET status = 'sent', sent_at = NOW()
  WHERE id = p_email_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark email as failed
CREATE OR REPLACE FUNCTION mark_email_failed(p_email_id UUID, p_error TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE email_queue
  SET 
    retry_count = retry_count + 1,
    error_message = p_error,
    status = CASE 
      WHEN retry_count + 1 >= max_retries THEN 'failed'
      ELSE 'pending'
    END,
    scheduled_for = CASE 
      WHEN retry_count + 1 < max_retries 
      THEN NOW() + (INTERVAL '1 minute' * POWER(2, retry_count + 1))
      ELSE scheduled_for
    END
  WHERE id = p_email_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE email_templates IS 'Email templates with variable substitution support';
COMMENT ON TABLE email_queue IS 'Queue for outgoing emails with retry support';

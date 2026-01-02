/**
 * Advanced Email Template Builder
 * Phase 39: MJML-based email templates with variable substitution
 */

import { logger } from '@/lib/logger';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  description: string | null;
  category: EmailCategory;
  mjml_content: string;
  html_content: string;
  text_content: string;
  variables: TemplateVariable[];
  is_active: boolean;
  is_default: boolean;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type EmailCategory =
  | 'authentication'
  | 'notification'
  | 'marketing'
  | 'transactional'
  | 'system'
  | 'digest'
  | 'custom';

export interface TemplateVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'url' | 'html';
  required: boolean;
  default_value?: string;
  example?: string;
}

export interface EmailRenderContext {
  [key: string]: unknown;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface EmailPreviewData {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  preview_text?: string;
}

// ============================================================================
// DEFAULT TEMPLATES
// ============================================================================

export const DEFAULT_TEMPLATES: Omit<
  EmailTemplate,
  'id' | 'html_content' | 'created_by' | 'created_at' | 'updated_at'
>[] = [
  {
    name: 'Welcome Email',
    slug: 'welcome',
    subject: 'Welcome to {{site_name}}, {{user_name}}!',
    description: 'Sent to new users upon registration',
    category: 'authentication',
    mjml_content: `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="14px" line-height="1.6" color="#333333" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding="40px 20px">
      <mj-column>
        <mj-image src="{{logo_url}}" width="150px" alt="{{site_name}}" />
        <mj-text font-size="24px" font-weight="bold" padding-top="20px">
          Welcome to {{site_name}}!
        </mj-text>
        <mj-text>
          Hi {{user_name}},
        </mj-text>
        <mj-text>
          Thank you for joining our community. We're excited to have you on board!
        </mj-text>
        <mj-button background-color="#007bff" href="{{dashboard_url}}">
          Get Started
        </mj-button>
      </mj-column>
    </mj-section>
    <mj-section padding="20px">
      <mj-column>
        <mj-text font-size="12px" color="#666666" align="center">
          © {{current_year}} {{site_name}}. All rights reserved.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
    text_content: `
Welcome to {{site_name}}!

Hi {{user_name}},

Thank you for joining our community. We're excited to have you on board!

Get started: {{dashboard_url}}

© {{current_year}} {{site_name}}. All rights reserved.`,
    variables: [
      {
        name: 'site_name',
        description: 'Name of the site',
        type: 'string',
        required: true,
        example: 'Scroungers Multimedia',
      },
      {
        name: 'user_name',
        description: 'User display name',
        type: 'string',
        required: true,
        example: 'John',
      },
      {
        name: 'logo_url',
        description: 'Logo image URL',
        type: 'url',
        required: false,
      },
      {
        name: 'dashboard_url',
        description: 'Link to dashboard',
        type: 'url',
        required: true,
      },
      {
        name: 'current_year',
        description: 'Current year',
        type: 'number',
        required: false,
        default_value: new Date().getFullYear().toString(),
      },
    ],
    is_active: true,
    is_default: true,
    version: 1,
  },
  {
    name: 'Password Reset',
    slug: 'password-reset',
    subject: 'Reset Your Password',
    description: 'Sent when user requests password reset',
    category: 'authentication',
    mjml_content: `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="14px" line-height="1.6" color="#333333" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding="40px 20px">
      <mj-column>
        <mj-image src="{{logo_url}}" width="150px" alt="{{site_name}}" />
        <mj-text font-size="24px" font-weight="bold" padding-top="20px">
          Reset Your Password
        </mj-text>
        <mj-text>
          Hi {{user_name}},
        </mj-text>
        <mj-text>
          We received a request to reset your password. Click the button below to create a new password:
        </mj-text>
        <mj-button background-color="#dc3545" href="{{reset_url}}">
          Reset Password
        </mj-button>
        <mj-text font-size="12px" color="#666666">
          This link will expire in {{expiry_hours}} hours. If you didn't request this, please ignore this email.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
    text_content: `
Reset Your Password

Hi {{user_name}},

We received a request to reset your password. Click the link below to create a new password:

{{reset_url}}

This link will expire in {{expiry_hours}} hours. If you didn't request this, please ignore this email.`,
    variables: [
      {
        name: 'site_name',
        description: 'Name of the site',
        type: 'string',
        required: true,
      },
      {
        name: 'user_name',
        description: 'User display name',
        type: 'string',
        required: true,
      },
      {
        name: 'logo_url',
        description: 'Logo image URL',
        type: 'url',
        required: false,
      },
      {
        name: 'reset_url',
        description: 'Password reset link',
        type: 'url',
        required: true,
      },
      {
        name: 'expiry_hours',
        description: 'Hours until expiry',
        type: 'number',
        required: false,
        default_value: '24',
      },
    ],
    is_active: true,
    is_default: true,
    version: 1,
  },
  {
    name: 'New Comment Notification',
    slug: 'new-comment',
    subject: 'New comment on "{{post_title}}"',
    description: "Sent when someone comments on user's post",
    category: 'notification',
    mjml_content: `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="14px" line-height="1.6" color="#333333" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding="40px 20px">
      <mj-column>
        <mj-text font-size="20px" font-weight="bold">
          New Comment on Your Post
        </mj-text>
        <mj-text>
          Hi {{author_name}},
        </mj-text>
        <mj-text>
          <strong>{{commenter_name}}</strong> commented on your post "<a href="{{post_url}}">{{post_title}}</a>":
        </mj-text>
        <mj-text background-color="#f8f9fa" padding="15px" border-left="4px solid #007bff">
          {{comment_excerpt}}
        </mj-text>
        <mj-button background-color="#007bff" href="{{comment_url}}">
          View Comment
        </mj-button>
      </mj-column>
    </mj-section>
    <mj-section padding="20px">
      <mj-column>
        <mj-text font-size="12px" color="#666666" align="center">
          <a href="{{unsubscribe_url}}">Unsubscribe from comment notifications</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
    text_content: `
New Comment on Your Post

Hi {{author_name}},

{{commenter_name}} commented on your post "{{post_title}}":

"{{comment_excerpt}}"

View comment: {{comment_url}}

---
Unsubscribe: {{unsubscribe_url}}`,
    variables: [
      {
        name: 'author_name',
        description: 'Post author name',
        type: 'string',
        required: true,
      },
      {
        name: 'commenter_name',
        description: 'Commenter name',
        type: 'string',
        required: true,
      },
      {
        name: 'post_title',
        description: 'Title of the post',
        type: 'string',
        required: true,
      },
      {
        name: 'post_url',
        description: 'Link to post',
        type: 'url',
        required: true,
      },
      {
        name: 'comment_excerpt',
        description: 'Comment preview',
        type: 'string',
        required: true,
      },
      {
        name: 'comment_url',
        description: 'Direct link to comment',
        type: 'url',
        required: true,
      },
      {
        name: 'unsubscribe_url',
        description: 'Unsubscribe link',
        type: 'url',
        required: true,
      },
    ],
    is_active: true,
    is_default: true,
    version: 1,
  },
  {
    name: 'Weekly Digest',
    slug: 'weekly-digest',
    subject: 'Your Weekly Digest from {{site_name}}',
    description: 'Weekly summary of content and activity',
    category: 'digest',
    mjml_content: `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="14px" line-height="1.6" color="#333333" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding="40px 20px">
      <mj-column>
        <mj-image src="{{logo_url}}" width="150px" alt="{{site_name}}" />
        <mj-text font-size="24px" font-weight="bold" padding-top="20px">
          Your Weekly Digest
        </mj-text>
        <mj-text>
          Hi {{user_name}}, here's what you missed this week:
        </mj-text>
        <mj-divider border-color="#e0e0e0" />
        <mj-text font-size="18px" font-weight="bold">
          Top Stories
        </mj-text>
        {{#each top_posts}}
        <mj-text>
          <a href="{{url}}">{{title}}</a> by {{author}}
        </mj-text>
        {{/each}}
        <mj-divider border-color="#e0e0e0" />
        <mj-text font-size="18px" font-weight="bold">
          Your Stats
        </mj-text>
        <mj-text>
          • {{view_count}} views on your content<br>
          • {{new_followers}} new followers<br>
          • {{comment_count}} new comments
        </mj-text>
        <mj-button background-color="#007bff" href="{{dashboard_url}}">
          View Dashboard
        </mj-button>
      </mj-column>
    </mj-section>
    <mj-section padding="20px">
      <mj-column>
        <mj-text font-size="12px" color="#666666" align="center">
          <a href="{{unsubscribe_url}}">Unsubscribe from digest emails</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
    text_content: `
Your Weekly Digest from {{site_name}}

Hi {{user_name}}, here's what you missed this week:

TOP STORIES
{{#each top_posts}}
- {{title}} by {{author}}
  {{url}}
{{/each}}

YOUR STATS
- {{view_count}} views on your content
- {{new_followers}} new followers
- {{comment_count}} new comments

View Dashboard: {{dashboard_url}}

---
Unsubscribe: {{unsubscribe_url}}`,
    variables: [
      {
        name: 'site_name',
        description: 'Name of the site',
        type: 'string',
        required: true,
      },
      {
        name: 'user_name',
        description: 'User display name',
        type: 'string',
        required: true,
      },
      {
        name: 'logo_url',
        description: 'Logo image URL',
        type: 'url',
        required: false,
      },
      {
        name: 'top_posts',
        description: 'Array of top posts',
        type: 'html',
        required: true,
      },
      {
        name: 'view_count',
        description: 'Total views',
        type: 'number',
        required: true,
      },
      {
        name: 'new_followers',
        description: 'New follower count',
        type: 'number',
        required: true,
      },
      {
        name: 'comment_count',
        description: 'New comment count',
        type: 'number',
        required: true,
      },
      {
        name: 'dashboard_url',
        description: 'Link to dashboard',
        type: 'url',
        required: true,
      },
      {
        name: 'unsubscribe_url',
        description: 'Unsubscribe link',
        type: 'url',
        required: true,
      },
    ],
    is_active: true,
    is_default: true,
    version: 1,
  },
];

// ============================================================================
// TEMPLATE COMPILATION
// ============================================================================

/**
 * Compile MJML to HTML
 * Note: In production, use the mjml package
 */
export function compileMjmlToHtml(mjml: string): string {
  // This is a simplified version - in production, use mjml package
  // For now, return a basic HTML structure

  // Extract body content and convert to basic HTML
  const bodyMatch = mjml.match(/<mj-body[^>]*>([\s\S]*?)<\/mj-body>/);
  if (!bodyMatch) {
    return mjml;
  }

  let html = bodyMatch[1];

  // Convert MJML tags to HTML (simplified)
  html = html
    .replace(
      /<mj-section[^>]*>/g,
      '<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding: 20px;">'
    )
    .replace(/<\/mj-section>/g, '</td></tr></table>')
    .replace(/<mj-column[^>]*>/g, '')
    .replace(/<\/mj-column>/g, '')
    .replace(/<mj-text([^>]*)>/g, '<p$1>')
    .replace(/<\/mj-text>/g, '</p>')
    .replace(
      /<mj-button[^>]*background-color="([^"]*)"[^>]*href="([^"]*)"[^>]*>/g,
      '<a href="$2" style="background-color: $1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">'
    )
    .replace(/<\/mj-button>/g, '</a>')
    .replace(/<mj-image[^>]*src="([^"]*)"[^>]*\/>/g, '<img src="$1" style="max-width: 100%;" />')
    .replace(
      /<mj-divider[^>]*\/>/g,
      '<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />'
    );

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    a { color: #007bff; }
    p { margin: 0 0 15px 0; line-height: 1.6; color: #333; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
    ${html}
  </table>
</body>
</html>`;
}

/**
 * Substitute variables in template
 */
export function substituteVariables(
  content: string,
  context: EmailRenderContext,
  variables: TemplateVariable[]
): string {
  let result = content;

  // Handle Handlebars-like syntax
  // Simple variables: {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    if (context[name] !== undefined) {
      return String(context[name]);
    }
    // Check for default value
    const varDef = variables.find((v) => v.name === name);
    if (varDef?.default_value) {
      return varDef.default_value;
    }
    return match;
  });

  // Handle {{#each}} loops (simplified)
  result = result.replace(
    /\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (match, arrayName, template) => {
      const items = context[arrayName];
      if (!Array.isArray(items)) return '';

      return items
        .map((item) => {
          let itemContent = template;
          Object.entries(item).forEach(([key, value]) => {
            itemContent = itemContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
          });
          return itemContent;
        })
        .join('');
    }
  );

  return result;
}

// ============================================================================
// TEMPLATE CRUD
// ============================================================================

/**
 * Get all templates
 */
export async function getTemplates(options: {
  category?: EmailCategory;
  isActive?: boolean;
  search?: string;
}): Promise<EmailTemplate[]> {
  const { category, isActive, search } = options;
  const supabase = await createClient();

  let query = supabase.from('email_templates').select('*').order('name', { ascending: true });

  if (category) query = query.eq('category', category);
  if (isActive !== undefined) query = query.eq('is_active', isActive);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data, error } = await query;

  if (error) {
    logger.error('[Email] Failed to get templates', error);
    throw error;
  }

  return (data || []) as EmailTemplate[];
}

/**
 * Get template by slug
 */
export async function getTemplateBySlug(slug: string): Promise<EmailTemplate | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) return null;
  return data as EmailTemplate;
}

/**
 * Create a template
 */
export async function createTemplate(
  createdBy: string,
  template: Omit<EmailTemplate, 'id' | 'html_content' | 'created_by' | 'created_at' | 'updated_at'>
): Promise<EmailTemplate> {
  const supabase = await createClient();

  // Compile MJML to HTML
  const htmlContent = compileMjmlToHtml(template.mjml_content);

  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      ...template,
      html_content: htmlContent,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    logger.error('[Email] Failed to create template', error);
    throw error;
  }

  logger.info('[Email] Template created', {
    templateId: data.id,
    slug: template.slug,
  });

  return data as EmailTemplate;
}

/**
 * Update a template
 */
export async function updateTemplate(
  templateId: string,
  updates: Partial<Omit<EmailTemplate, 'id' | 'created_by' | 'created_at'>>
): Promise<EmailTemplate> {
  const supabase = await createClient();

  // Recompile HTML if MJML changed
  const updateData: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (updates.mjml_content) {
    updateData.html_content = compileMjmlToHtml(updates.mjml_content);
    updateData.version = (await getTemplate(templateId))?.version || 0 + 1;
  }

  const { data, error } = await supabase
    .from('email_templates')
    .update(updateData)
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    logger.error('[Email] Failed to update template', error);
    throw error;
  }

  return data as EmailTemplate;
}

/**
 * Get template by ID
 */
export async function getTemplate(templateId: string): Promise<EmailTemplate | null> {
  const supabase = await createClient();

  const { data } = await supabase.from('email_templates').select('*').eq('id', templateId).single();

  return data as EmailTemplate | null;
}

/**
 * Delete a template
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', templateId)
    .eq('is_default', false); // Can't delete default templates

  if (error) {
    logger.error('[Email] Failed to delete template', error);
    throw error;
  }
}

/**
 * Duplicate a template
 */
export async function duplicateTemplate(
  templateId: string,
  createdBy: string,
  newSlug?: string
): Promise<EmailTemplate> {
  const original = await getTemplate(templateId);
  if (!original) throw new Error('Template not found');

  return createTemplate(createdBy, {
    name: `${original.name} (Copy)`,
    slug: newSlug || `${original.slug}-copy`,
    subject: original.subject,
    description: original.description,
    category: original.category,
    mjml_content: original.mjml_content,
    text_content: original.text_content,
    variables: original.variables,
    is_active: false,
    is_default: false,
    version: 1,
  });
}

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

/**
 * Render an email template
 */
export async function renderTemplate(
  slug: string,
  context: EmailRenderContext
): Promise<RenderedEmail> {
  const template = await getTemplateBySlug(slug);
  if (!template) {
    throw new Error(`Template not found: ${slug}`);
  }

  // Validate required variables
  const missingVars = template.variables
    .filter((v) => v.required && context[v.name] === undefined)
    .map((v) => v.name);

  if (missingVars.length > 0) {
    throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
  }

  // Substitute variables
  const subject = substituteVariables(template.subject, context, template.variables);
  const html = substituteVariables(template.html_content, context, template.variables);
  const text = substituteVariables(template.text_content, context, template.variables);

  return { subject, html, text };
}

/**
 * Preview an email template
 */
export async function previewTemplate(
  templateId: string,
  context?: EmailRenderContext
): Promise<EmailPreviewData> {
  const template = await getTemplate(templateId);
  if (!template) throw new Error('Template not found');

  // Use example values if no context provided
  const previewContext: EmailRenderContext = context || {};

  template.variables.forEach((v) => {
    if (previewContext[v.name] === undefined) {
      previewContext[v.name] = v.example || v.default_value || `{{${v.name}}}`;
    }
  });

  const rendered = {
    subject: substituteVariables(template.subject, previewContext, template.variables),
    html: substituteVariables(template.html_content, previewContext, template.variables),
    text: substituteVariables(template.text_content, previewContext, template.variables),
  };

  return {
    to: 'preview@example.com',
    from: 'noreply@scroungersmultimedia.com',
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  };
}

/**
 * Send a test email
 */
export async function sendTestEmail(
  templateId: string,
  toEmail: string,
  context?: EmailRenderContext
): Promise<void> {
  const preview = await previewTemplate(templateId, context);

  // In production, use actual email service
  logger.info('[Email] Test email sent', {
    templateId,
    to: toEmail,
    subject: preview.subject,
  });

  // Queue the email
  const supabase = await createServiceClient();
  await supabase.from('email_queue').insert({
    to_email: toEmail,
    from_email: preview.from,
    subject: `[TEST] ${preview.subject}`,
    html_content: preview.html,
    text_content: preview.text,
    template_id: templateId,
    status: 'pending',
    priority: 'high',
  });
}

/**
 * Seed default templates
 */
export async function seedDefaultTemplates(systemUserId: string): Promise<void> {
  for (const template of DEFAULT_TEMPLATES) {
    try {
      await createTemplate(systemUserId, template);
    } catch (error) {
      // Ignore duplicate key errors
      if ((error as { code?: string })?.code !== '23505') {
        logger.warn('[Email] Failed to seed template', {
          slug: template.slug,
          error,
        });
      }
    }
  }

  logger.info('[Email] Default templates seeded');
}

export default {
  getTemplates,
  getTemplate,
  getTemplateBySlug,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  renderTemplate,
  previewTemplate,
  sendTestEmail,
  seedDefaultTemplates,
  compileMjmlToHtml,
  substituteVariables,
  DEFAULT_TEMPLATES,
};

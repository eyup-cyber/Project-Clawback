// ============================================================================
// EMAIL TEMPLATES
// HTML email templates for various notifications
// ============================================================================

const SITE_NAME = 'Scroungers Multimedia';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://scroungers.co';
const PRIMARY_COLOR = '#E53935';
const ACCENT_COLOR = '#FFB300';

// Base email layout
function baseTemplate(content: string, previewText: string = ''): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${SITE_NAME}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    td { padding: 0; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #0D0D0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  ${previewText ? `<div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>` : ''}
  
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0D0D0D;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 20px 0;">
              <a href="${SITE_URL}" style="text-decoration: none;">
                <span style="font-size: 28px; font-weight: bold; color: ${PRIMARY_COLOR}; font-family: 'Courier New', monospace;">scroungers</span>
                <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: ${ACCENT_COLOR}; display: block; margin-top: -5px;">MULTIMEDIA</span>
              </a>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background-color: #1A1A1A; border-radius: 12px; padding: 40px; border: 1px solid #2A2A2A;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px 0; color: #666666; font-size: 12px;">
              <p style="margin: 0 0 10px;">
                &copy; ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.
              </p>
              <p style="margin: 0;">
                <a href="${SITE_URL}" style="color: ${PRIMARY_COLOR}; text-decoration: none;">Visit Website</a>
                &nbsp;&bull;&nbsp;
                <a href="${SITE_URL}/unsubscribe" style="color: #666666; text-decoration: none;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Button component
function button(text: string, href: string): string {
  return `
    <a href="${href}" style="display: inline-block; padding: 14px 28px; background-color: ${PRIMARY_COLOR}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
      ${text}
    </a>
  `;
}

// ============================================================================
// WELCOME EMAIL
// ============================================================================
export function welcomeEmail(name: string): { html: string; subject: string } {
  const content = `
    <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
      Welcome to ${SITE_NAME}! 🎉
    </h1>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Hey ${name},
    </p>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Welcome to the Scroungers community! We're excited to have you here. You can now:
    </p>
    <ul style="margin: 0 0 20px; padding-left: 20px; color: #cccccc; font-size: 16px; line-height: 1.8;">
      <li>Explore articles, videos, and creative content</li>
      <li>Comment and react to posts</li>
      <li>Connect with creators</li>
      <li>Apply to become a contributor</li>
    </ul>
    <p style="margin: 0 0 30px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Start exploring and discover something new today!
    </p>
    <p style="margin: 0; text-align: center;">
      ${button('Explore Content', `${SITE_URL}/articles`)}
    </p>
  `;

  return {
    html: baseTemplate(content, `Welcome to ${SITE_NAME}!`),
    subject: `Welcome to ${SITE_NAME}! 🎉`,
  };
}

// ============================================================================
// APPLICATION APPROVED EMAIL
// ============================================================================
export function applicationApprovedEmail(name: string): { html: string; subject: string } {
  const content = `
    <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
      Congratulations, ${name}! 🎊
    </h1>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Great news! Your contributor application has been approved. You're now officially part of the Scroungers creative team!
    </p>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      As a contributor, you can now:
    </p>
    <ul style="margin: 0 0 20px; padding-left: 20px; color: #cccccc; font-size: 16px; line-height: 1.8;">
      <li>Create and publish content</li>
      <li>Access your contributor dashboard</li>
      <li>Track your content performance</li>
      <li>Connect with other creators</li>
    </ul>
    <p style="margin: 0 0 30px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Head to your dashboard to start creating!
    </p>
    <p style="margin: 0; text-align: center;">
      ${button('Go to Dashboard', `${SITE_URL}/dashboard`)}
    </p>
  `;

  return {
    html: baseTemplate(content, 'Your contributor application has been approved!'),
    subject: 'Welcome to the team! Your application is approved 🎊',
  };
}

// ============================================================================
// APPLICATION REJECTED EMAIL
// ============================================================================
export function applicationRejectedEmail(name: string): { html: string; subject: string } {
  const content = `
    <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
      Application Update
    </h1>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Hi ${name},
    </p>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Thank you for your interest in becoming a contributor at ${SITE_NAME}. After careful review, we've decided not to move forward with your application at this time.
    </p>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      This isn't the end of the road! We encourage you to:
    </p>
    <ul style="margin: 0 0 20px; padding-left: 20px; color: #cccccc; font-size: 16px; line-height: 1.8;">
      <li>Continue developing your skills</li>
      <li>Build your portfolio</li>
      <li>Reapply in the future</li>
    </ul>
    <p style="margin: 0 0 30px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      In the meantime, you're still welcome to engage with our community!
    </p>
    <p style="margin: 0; text-align: center;">
      ${button('Continue Exploring', `${SITE_URL}/articles`)}
    </p>
  `;

  return {
    html: baseTemplate(content, 'Update on your contributor application'),
    subject: 'Update on your contributor application',
  };
}

// ============================================================================
// POST PUBLISHED EMAIL
// ============================================================================
export function postPublishedEmail(
  name: string,
  postTitle: string,
  postSlug: string
): { html: string; subject: string } {
  const content = `
    <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
      Your Post is Live! 🚀
    </h1>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Hey ${name},
    </p>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Great news! Your post "<strong style="color: #ffffff;">${postTitle}</strong>" has been reviewed and published!
    </p>
    <p style="margin: 0 0 30px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      It's now live and visible to the Scroungers community. Check it out and share it with your audience!
    </p>
    <p style="margin: 0; text-align: center;">
      ${button('View Your Post', `${SITE_URL}/articles/${postSlug}`)}
    </p>
  `;

  return {
    html: baseTemplate(content, `Your post "${postTitle}" is now live!`),
    subject: `Your post is live! 🚀`,
  };
}

// ============================================================================
// NEW COMMENT EMAIL
// ============================================================================
export function newCommentEmail(
  authorName: string,
  commenterName: string,
  postTitle: string,
  postSlug: string,
  commentPreview: string
): { html: string; subject: string } {
  const content = `
    <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
      New Comment on Your Post 💬
    </h1>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Hey ${authorName},
    </p>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      <strong style="color: #ffffff;">${commenterName}</strong> commented on your post "<strong style="color: #ffffff;">${postTitle}</strong>":
    </p>
    <div style="margin: 0 0 20px; padding: 15px; background-color: #252525; border-radius: 8px; border-left: 3px solid ${PRIMARY_COLOR};">
      <p style="margin: 0; color: #cccccc; font-size: 14px; font-style: italic;">
        "${commentPreview}..."
      </p>
    </div>
    <p style="margin: 0; text-align: center;">
      ${button('View Comment', `${SITE_URL}/articles/${postSlug}#comments`)}
    </p>
  `;

  return {
    html: baseTemplate(content, `${commenterName} commented on your post`),
    subject: `${commenterName} commented on your post`,
  };
}

// ============================================================================
// NEWSLETTER WELCOME EMAIL
// ============================================================================
export function newsletterWelcomeEmail(email: string): { html: string; subject: string } {
  const content = `
    <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
      You're Subscribed! 📬
    </h1>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Thanks for subscribing to the Scroungers newsletter!
    </p>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      You'll now receive:
    </p>
    <ul style="margin: 0 0 20px; padding-left: 20px; color: #cccccc; font-size: 16px; line-height: 1.8;">
      <li>Weekly roundups of the best content</li>
      <li>Exclusive behind-the-scenes updates</li>
      <li>Early access to new features</li>
      <li>Community highlights and announcements</li>
    </ul>
    <p style="margin: 0 0 30px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      We're glad to have you along for the ride!
    </p>
    <p style="margin: 0; text-align: center;">
      ${button('Explore Content', `${SITE_URL}/articles`)}
    </p>
  `;

  return {
    html: baseTemplate(content, "You're subscribed to the Scroungers newsletter!"),
    subject: "You're subscribed! 📬",
  };
}

// ============================================================================
// PASSWORD RESET EMAIL
// ============================================================================
export function passwordResetEmail(resetUrl: string): { html: string; subject: string } {
  const content = `
    <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
      Reset Your Password
    </h1>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      We received a request to reset your password. Click the button below to create a new password.
    </p>
    <p style="margin: 0 0 30px; text-align: center;">
      ${button('Reset Password', resetUrl)}
    </p>
    <p style="margin: 0; color: #888888; font-size: 14px; line-height: 1.6;">
      If you didn't request this, you can safely ignore this email. The link will expire in 1 hour.
    </p>
  `;

  return {
    html: baseTemplate(content, 'Reset your Scroungers password'),
    subject: 'Reset your password',
  };
}

// ============================================================================
// POST REJECTED EMAIL
// ============================================================================
export function postRejectedEmail(
  name: string,
  postTitle: string,
  reason?: string
): { html: string; subject: string } {
  const content = `
    <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
      Post Review Update
    </h1>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Hey ${name},
    </p>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Your post "<strong style="color: #ffffff;">${postTitle}</strong>" has been reviewed but wasn't approved for publication at this time.
    </p>
    ${reason ? `
    <div style="margin: 0 0 20px; padding: 15px; background-color: #252525; border-radius: 8px; border-left: 3px solid ${ACCENT_COLOR};">
      <p style="margin: 0; color: #cccccc; font-size: 14px;">
        <strong style="color: #ffffff;">Feedback:</strong> ${reason}
      </p>
    </div>
    ` : ''}
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      You can revise your post based on the feedback and resubmit for review.
    </p>
    <p style="margin: 0; text-align: center;">
      ${button('Edit Your Post', `${SITE_URL}/dashboard/posts`)}
    </p>
  `;

  return {
    html: baseTemplate(content, `Your post "${postTitle}" needs revision`),
    subject: 'Your post needs some changes',
  };
}

// ============================================================================
// COMMENT REPLY EMAIL
// ============================================================================
export function commentReplyEmail(
  originalCommenterName: string,
  replierName: string,
  postTitle: string,
  postSlug: string,
  replyPreview: string
): { html: string; subject: string } {
  const content = `
    <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
      Someone Replied to Your Comment 💬
    </h1>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Hey ${originalCommenterName},
    </p>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      <strong style="color: #ffffff;">${replierName}</strong> replied to your comment on "<strong style="color: #ffffff;">${postTitle}</strong>":
    </p>
    <div style="margin: 0 0 20px; padding: 15px; background-color: #252525; border-radius: 8px; border-left: 3px solid ${ACCENT_COLOR};">
      <p style="margin: 0; color: #cccccc; font-size: 14px; font-style: italic;">
        "${replyPreview}..."
      </p>
    </div>
    <p style="margin: 0; text-align: center;">
      ${button('View Reply', `${SITE_URL}/articles/${postSlug}#comments`)}
    </p>
  `;

  return {
    html: baseTemplate(content, `${replierName} replied to your comment`),
    subject: `${replierName} replied to your comment`,
  };
}

// ============================================================================
// REACTION MILESTONE EMAIL
// ============================================================================
export function reactionMilestoneEmail(
  name: string,
  postTitle: string,
  postSlug: string,
  milestone: number
): { html: string; subject: string } {
  const content = `
    <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
      ${milestone} Reactions! 🔥
    </h1>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Hey ${name},
    </p>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Your post "<strong style="color: #ffffff;">${postTitle}</strong>" just hit <strong style="color: ${PRIMARY_COLOR};">${milestone} reactions</strong>!
    </p>
    <p style="margin: 0 0 30px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      The community is loving your content. Keep up the great work!
    </p>
    <p style="margin: 0; text-align: center;">
      ${button('View Your Post', `${SITE_URL}/articles/${postSlug}`)}
    </p>
  `;

  return {
    html: baseTemplate(content, `Your post hit ${milestone} reactions!`),
    subject: `🔥 Your post hit ${milestone} reactions!`,
  };
}

// ============================================================================
// ROLE CHANGED EMAIL
// ============================================================================
export function roleChangedEmail(
  name: string,
  newRole: string
): { html: string; subject: string } {
  const roleDescriptions: Record<string, string> = {
    contributor: 'You can now create and submit content for review.',
    editor: 'You can now review, edit, and publish content from other contributors.',
    admin: 'You have full administrative access to manage the platform.',
  };

  const content = `
    <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
      Your Role Has Been Updated 🎭
    </h1>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Hey ${name},
    </p>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Your role has been updated to <strong style="color: ${PRIMARY_COLOR};">${newRole}</strong>.
    </p>
    <p style="margin: 0 0 30px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      ${roleDescriptions[newRole] || 'Thank you for being part of our community.'}
    </p>
    <p style="margin: 0; text-align: center;">
      ${button('Go to Dashboard', `${SITE_URL}/dashboard`)}
    </p>
  `;

  return {
    html: baseTemplate(content, `Your role has been updated to ${newRole}`),
    subject: `Your role has been updated to ${newRole}`,
  };
}

// ============================================================================
// APPLICATION RECEIVED EMAIL
// ============================================================================
export function applicationReceivedEmail(
  name: string
): { html: string; subject: string } {
  const content = `
    <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
      Application Received! ✅
    </h1>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Hey ${name},
    </p>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      We've received your application to become a contributor at ${SITE_NAME}. Thank you for your interest!
    </p>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      Our team will review your application and get back to you within <strong style="color: #ffffff;">5-7 business days</strong>.
    </p>
    <p style="margin: 0 0 30px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      In the meantime, feel free to explore our content and engage with the community!
    </p>
    <p style="margin: 0; text-align: center;">
      ${button('Explore Content', `${SITE_URL}/articles`)}
    </p>
  `;

  return {
    html: baseTemplate(content, 'We received your contributor application'),
    subject: 'Application received! ✅',
  };
}

// ============================================================================
// CONTACT ADMIN NOTIFICATION EMAIL
// ============================================================================
export function contactAdminNotificationEmail(
  name: string,
  email: string,
  subject: string,
  message: string,
  category: string
): { html: string; subject: string } {
  const content = `
    <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
      New Contact Form Submission 📥
    </h1>
    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
      You have received a new message from the contact form on ${SITE_NAME}.
    </p>
    <div style="margin: 0 0 20px; padding: 15px; background-color: #252525; border-radius: 8px; border-left: 3px solid ${ACCENT_COLOR};">
      <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px;">
        <strong>Name:</strong> ${name}
      </p>
      <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px;">
        <strong>Email:</strong> <a href="mailto:${email}" style="color: ${PRIMARY_COLOR}; text-decoration: none;">${email}</a>
      </p>
      <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px;">
        <strong>Subject:</strong> ${subject}
      </p>
      <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px;">
        <strong>Category:</strong> ${category}
      </p>
      <p style="margin: 0; color: #ffffff; font-size: 14px;">
        <strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}
      </p>
    </div>
    <p style="margin: 0; text-align: center;">
      ${button('View All Submissions', `${SITE_URL}/admin/contact`)}
    </p>
  `;

  return {
    html: baseTemplate(content, `New contact form submission from ${name}`),
    subject: `New Contact: ${subject}`,
  };
}







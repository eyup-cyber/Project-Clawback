/**
 * Email Worker
 * Processes email sending jobs
 */

import { type Job } from 'bullmq';
import { registerWorker, type EmailJobData, QUEUE_NAMES } from '../queue';

// Email templates (would typically be in a separate file)
const emailTemplates: Record<string, (data: Record<string, unknown>) => { html: string; text: string }> = {
  welcome: (data) => ({
    html: `
      <h1>Welcome to Scroungers Multimedia!</h1>
      <p>Hi ${data.name},</p>
      <p>Thank you for joining our community of creative storytellers.</p>
      <p>Get started by <a href="${data.dashboardUrl}">visiting your dashboard</a>.</p>
    `,
    text: `Welcome to Scroungers Multimedia!\n\nHi ${data.name},\n\nThank you for joining our community of creative storytellers.\n\nGet started by visiting: ${data.dashboardUrl}`,
  }),
  
  postPublished: (data) => ({
    html: `
      <h1>Your Post Has Been Published!</h1>
      <p>Hi ${data.authorName},</p>
      <p>Great news! Your post "${data.postTitle}" has been published.</p>
      <p><a href="${data.postUrl}">View your post</a></p>
    `,
    text: `Your Post Has Been Published!\n\nHi ${data.authorName},\n\nGreat news! Your post "${data.postTitle}" has been published.\n\nView it here: ${data.postUrl}`,
  }),
  
  newComment: (data) => ({
    html: `
      <h1>New Comment on Your Post</h1>
      <p>Hi ${data.authorName},</p>
      <p>${data.commenterName} commented on your post "${data.postTitle}":</p>
      <blockquote>${data.commentPreview}</blockquote>
      <p><a href="${data.postUrl}">View comment</a></p>
    `,
    text: `New Comment on Your Post\n\nHi ${data.authorName},\n\n${data.commenterName} commented on "${data.postTitle}":\n\n"${data.commentPreview}"\n\nView it here: ${data.postUrl}`,
  }),
  
  passwordReset: (data) => ({
    html: `
      <h1>Password Reset Request</h1>
      <p>Hi ${data.name},</p>
      <p>We received a request to reset your password.</p>
      <p><a href="${data.resetUrl}">Reset your password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
    text: `Password Reset Request\n\nHi ${data.name},\n\nWe received a request to reset your password.\n\nReset your password: ${data.resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
  }),
  
  weeklyDigest: (data) => ({
    html: `
      <h1>Your Weekly Digest</h1>
      <p>Hi ${data.name},</p>
      <p>Here's what happened this week:</p>
      <ul>
        <li>New posts: ${data.newPosts}</li>
        <li>Comments on your posts: ${data.comments}</li>
        <li>New followers: ${data.newFollowers}</li>
      </ul>
      <p><a href="${data.dashboardUrl}">View your dashboard</a></p>
    `,
    text: `Your Weekly Digest\n\nHi ${data.name},\n\nHere's what happened this week:\n- New posts: ${data.newPosts}\n- Comments on your posts: ${data.comments}\n- New followers: ${data.newFollowers}\n\nView your dashboard: ${data.dashboardUrl}`,
  }),
};

/**
 * Send email (mock implementation - replace with actual email service)
 */
async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  text: string,
  replyTo?: string
): Promise<void> {
  // In production, integrate with SendGrid, Postmark, AWS SES, etc.
  const recipients = Array.isArray(to) ? to : [to];
  
  console.log(`📧 Sending email to: ${recipients.join(', ')}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Reply-To: ${replyTo || 'default'}`);
  
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  // In production:
  // await emailService.send({
  //   to: recipients,
  //   subject,
  //   html,
  //   text,
  //   replyTo,
  // });
  
  console.log(`✅ Email sent successfully`);
}

/**
 * Process email job
 */
async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, template, templateData, replyTo } = job.data;

  // Get template
  const templateFn = emailTemplates[template];
  if (!templateFn) {
    throw new Error(`Unknown email template: ${template}`);
  }

  // Generate email content
  const { html, text } = templateFn(templateData);

  // Send email
  await sendEmail(to, subject, html, text, replyTo);

  // Update job progress
  await job.updateProgress(100);
}

/**
 * Initialize email worker
 */
export function initEmailWorker(): void {
  registerWorker(QUEUE_NAMES.EMAIL, processEmailJob, {
    concurrency: 10, // Send 10 emails concurrently
    limiter: {
      max: 100, // Max 100 emails per 60 seconds
      duration: 60000,
    },
  });

  console.log('📧 Email worker initialized');
}

/**
 * Helper to queue an email
 */
export async function queueEmail(
  template: string,
  to: string | string[],
  templateData: Record<string, unknown>,
  options?: {
    subject?: string;
    replyTo?: string;
    delay?: number;
    priority?: number;
  }
): Promise<void> {
  const { addJob } = await import('../queue');
  
  const defaultSubjects: Record<string, string> = {
    welcome: 'Welcome to Scroungers Multimedia!',
    postPublished: 'Your post has been published!',
    newComment: 'New comment on your post',
    passwordReset: 'Reset your password',
    weeklyDigest: 'Your Weekly Digest',
  };

  await addJob(
    QUEUE_NAMES.EMAIL,
    {
      to,
      subject: options?.subject || defaultSubjects[template] || 'Notification',
      template,
      templateData,
      replyTo: options?.replyTo,
    },
    {
      delay: options?.delay,
      priority: options?.priority,
    }
  );
}

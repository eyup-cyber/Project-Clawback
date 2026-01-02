// ============================================================================
// EMAIL MODULE
// Central export for email functionality
// ============================================================================

export { type EmailOptions, type EmailResult, sendBulkEmail, sendEmail } from './client';

export {
  applicationApprovedEmail,
  applicationRejectedEmail,
  newCommentEmail,
  newsletterWelcomeEmail,
  passwordResetEmail,
  postPublishedEmail,
  welcomeEmail,
} from './templates';

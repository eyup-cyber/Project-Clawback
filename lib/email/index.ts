// ============================================================================
// EMAIL MODULE
// Central export for email functionality
// ============================================================================

export { sendEmail, sendBulkEmail, type EmailOptions, type EmailResult } from './client';

export {
  welcomeEmail,
  applicationApprovedEmail,
  applicationRejectedEmail,
  postPublishedEmail,
  newCommentEmail,
  newsletterWelcomeEmail,
  passwordResetEmail,
} from './templates';







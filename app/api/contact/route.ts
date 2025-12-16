import { createClient } from '@/lib/supabase/server';
import { type NextRequest } from 'next/server';
import { success, handleApiError, parseBody, validationError } from '@/lib/api';
import { contactSubmissionSchema } from '@/lib/api/validation';
import { applySecurityHeaders } from '@/lib/security/headers';
import { rateLimitByIp } from '@/lib/security/rate-limit';
import { generateRequestId, createContext, clearContext } from '@/lib/logger/context';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email/client';
import { sanitizeText } from '@/lib/security/sanitize';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    createContext(requestId, 'POST', '/api/contact', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
    });

    logger.info('Contact form submission', { method: 'POST', path: '/api/contact' }, requestId);

    // Rate limit: 5 submissions per hour per IP
    await rateLimitByIp(request, { maxRequests: 5, windowMs: 3600000 });

    // Parse and validate body
    const body = await parseBody(request, contactSubmissionSchema);

    // Sanitize inputs
    const sanitizedData = {
      name: sanitizeText(body.name),
      email: body.email.toLowerCase().trim(),
      subject: sanitizeText(body.subject),
      message: sanitizeText(body.message),
      category: body.category,
    };

    const supabase = await createClient();

    // Store contact submission in database
    const { data: submission, error } = await supabase
      .from('contact_submissions')
      .insert({
        name: sanitizedData.name,
        email: sanitizedData.email,
        subject: sanitizedData.subject,
        message: sanitizedData.message,
        category: sanitizedData.category,
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to save contact submission', error, { email: sanitizedData.email }, requestId);
      throw error;
    }

    logger.info('Contact submission saved', { submissionId: submission.id }, requestId);

    // Send email notification to admin
    const adminEmail = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL;
    if (adminEmail) {
      const emailContent = `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${sanitizedData.name}</p>
        <p><strong>Email:</strong> ${sanitizedData.email}</p>
        <p><strong>Category:</strong> ${sanitizedData.category}</p>
        <p><strong>Subject:</strong> ${sanitizedData.subject}</p>
        <p><strong>Message:</strong></p>
        <p>${sanitizedData.message.replace(/\n/g, '<br>')}</p>
      `;

      await sendEmail({
        to: adminEmail,
        subject: `New Contact: ${sanitizedData.subject}`,
        html: emailContent,
        tags: [{ name: 'type', value: 'contact' }],
      });

      logger.info('Admin notification email sent', { adminEmail }, requestId);
    }

    const duration = Date.now() - startTime;
    logger.performance('contactSubmission', duration, { submissionId: submission.id }, requestId);

    const response = success(
      { success: true, message: "Thank you for your message. We'll be in touch soon." },
      201
    );
    return applySecurityHeaders(response);
  } catch (err) {
    return handleApiError(err, requestId);
  } finally {
    clearContext(requestId);
  }
}


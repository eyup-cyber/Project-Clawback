import { z } from 'zod';
import { sanitizeHtml, sanitizeText, sanitizeUrl } from '@/lib/security/sanitize';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Slug validation (lowercase, hyphens, numbers)
export const slugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(100, 'Slug cannot exceed 100 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens');

// Email validation
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email cannot exceed 255 characters')
  .transform((v) => v.toLowerCase().trim());

// URL validation
export const urlSchema = z
  .string()
  .url('Invalid URL')
  .max(2048, 'URL cannot exceed 2048 characters');

// Optional URL (can be empty string or null)
export const optionalUrlSchema = z
  .string()
  .url('Invalid URL')
  .max(2048)
  .optional()
  .nullable()
  .transform((v) => (v === '' ? null : v));

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Sort order
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

// ============================================================================
// CONTENT TYPE SCHEMAS
// ============================================================================

export const contentTypeSchema = z.enum(['written', 'video', 'audio', 'visual']);

export const postStatusSchema = z.enum([
  'draft',
  'pending',
  'scheduled',
  'published',
  'archived',
  'rejected',
]);

// ============================================================================
// USER / PROFILE SCHEMAS
// ============================================================================

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username cannot exceed 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .transform((v) => v.toLowerCase());

export const displayNameSchema = z
  .string()
  .min(1, 'Display name is required')
  .max(50, 'Display name cannot exceed 50 characters')
  .transform((v) => v.trim());

export const bioSchema = z
  .string()
  .max(500, 'Bio cannot exceed 500 characters')
  .optional()
  .nullable()
  .transform((v) => (v?.trim() === '' ? null : v?.trim()));

export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  display_name: displayNameSchema.optional().transform((v) => (v ? sanitizeText(v) : v)),
  bio: bioSchema.transform((v) => (v ? sanitizeText(v) : v)),
  avatar_url: optionalUrlSchema.transform((v) => (v ? sanitizeUrl(v) : v)),
  kofi_username: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((v) => (v ? sanitizeText(v) : v)),
  website_url: optionalUrlSchema.transform((v) => (v ? sanitizeUrl(v) : v)),
  twitter_handle: z
    .string()
    .max(15)
    .regex(/^[a-zA-Z0-9_]*$/)
    .optional()
    .nullable()
    .transform((v) => (v ? sanitizeText(v) : v)),
  location: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((v) => (v ? sanitizeText(v) : v)),
});

// ============================================================================
// POST SCHEMAS
// ============================================================================

export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters')
    .transform((v) => sanitizeText(v.trim())),
  subtitle: z
    .string()
    .max(300)
    .optional()
    .nullable()
    .transform((v) => (v ? sanitizeText(v) : v)),
  excerpt: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v ? sanitizeText(v) : v)),
  content: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? sanitizeHtml(v) : v)),
  content_type: contentTypeSchema,
  category_id: uuidSchema,
  media_url: optionalUrlSchema.transform((v) => (v ? sanitizeUrl(v) : v)),
  featured_image_url: optionalUrlSchema.transform((v) => (v ? sanitizeUrl(v) : v)),
  kofi_username: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((v) => (v ? sanitizeText(v) : v)),
  status: postStatusSchema.default('draft'),
});

export const updatePostSchema = createPostSchema.partial().extend({
  id: uuidSchema,
});

export const publishPostSchema = z.object({
  id: uuidSchema,
  scheduled_for: z.string().datetime().optional(), // ISO 8601 datetime
});

export const listPostsSchema = paginationSchema.extend({
  status: postStatusSchema.optional(),
  content_type: contentTypeSchema.optional(),
  category_id: uuidSchema.optional(),
  author_id: uuidSchema.optional(),
  search: z.string().max(200).optional(),
  sort: z.enum(['created_at', 'published_at', 'view_count', 'title']).default('created_at'),
  order: sortOrderSchema,
  featured: z.coerce.boolean().optional(),
});

// ============================================================================
// COMMENT SCHEMAS
// ============================================================================

export const createCommentSchema = z.object({
  post_id: uuidSchema,
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment cannot exceed 5000 characters')
    .transform((v) => sanitizeHtml(v.trim())),
  parent_id: uuidSchema.optional().nullable(),
});

export const updateCommentSchema = z.object({
  id: uuidSchema,
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment cannot exceed 5000 characters')
    .transform((v) => sanitizeHtml(v.trim())),
});

export const listCommentsSchema = paginationSchema.extend({
  post_id: uuidSchema,
  parent_id: uuidSchema.optional().nullable(),
  sort: z.enum(['created_at', 'likes']).default('created_at'),
  order: sortOrderSchema,
});

export const flagCommentSchema = z.object({
  comment_id: uuidSchema,
  reason: z.enum(['spam', 'abuse', 'off_topic', 'other']),
  details: z.string().max(500).optional(),
});

// ============================================================================
// REACTION SCHEMAS
// ============================================================================

// Post reactions: star, fire, heart, clap, think
export const reactionTypeSchema = z.enum(['star', 'fire', 'heart', 'clap', 'think']);

// Comment reactions: like, dislike
export const commentReactionTypeSchema = z.enum(['like', 'dislike']);

export const toggleReactionSchema = z.object({
  post_id: uuidSchema,
  type: reactionTypeSchema,
});

export const toggleCommentReactionSchema = z.object({
  comment_id: uuidSchema,
  type: commentReactionTypeSchema,
});

// ============================================================================
// APPLICATION SCHEMAS
// ============================================================================

export const contentTypesSchema = z
  .array(contentTypeSchema)
  .min(1, 'Select at least one content type');

export const contributorApplicationSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters')
    .transform((v) => v.trim()),
  email: emailSchema,
  content_types: contentTypesSchema,
  topics: z.array(z.string().max(100)).max(20).optional().default([]),
  why_scroungers: z
    .string()
    .min(50, 'Please provide at least 50 characters')
    .max(2000, 'Response cannot exceed 2000 characters'),
  first_piece_pitch: z
    .string()
    .min(50, 'Please provide at least 50 characters')
    .max(2000, 'Response cannot exceed 2000 characters'),
  portfolio_url: optionalUrlSchema,
  location: z.string().max(100).optional().nullable(),
  agreed_to_terms: z.literal(true).refine((val) => val === true, {
    message: 'You must agree to the terms',
  }),
});

export const reviewApplicationSchema = z.object({
  application_id: uuidSchema,
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(1000).optional(),
});

// ============================================================================
// NEWSLETTER SCHEMAS
// ============================================================================

export const newsletterSubscribeSchema = z.object({
  email: emailSchema,
  source: z.enum(['homepage', 'footer', 'article', 'popup']).default('homepage'),
});

export const newsletterUnsubscribeSchema = z.object({
  email: emailSchema,
  token: z.string(), // Unsubscribe token for security
});

// ============================================================================
// CONTACT SCHEMAS
// ============================================================================

export const contactSubmissionSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .transform((v) => sanitizeText(v.trim())),
  email: emailSchema,
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject cannot exceed 200 characters')
    .transform((v) => sanitizeText(v.trim())),
  message: z
    .string()
    .min(20, 'Message must be at least 20 characters')
    .max(5000, 'Message cannot exceed 5000 characters')
    .transform((v) => sanitizeText(v.trim())),
  category: z.enum(['general', 'partnership', 'technical', 'other']).default('general'),
});

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const updateUserRoleSchema = z.object({
  user_id: uuidSchema,
  role: z.enum(['reader', 'contributor', 'editor', 'admin', 'superadmin']),
});

export const moderatePostSchema = z.object({
  post_id: uuidSchema,
  action: z.enum(['approve', 'reject', 'feature', 'unfeature', 'archive']),
  reason: z.string().max(500).optional(),
});

export const suspendUserSchema = z.object({
  user_id: uuidSchema,
  duration_days: z.number().int().min(1).max(365),
  reason: z.string().min(10).max(500),
});

// ============================================================================
// SEARCH SCHEMAS
// ============================================================================

export const searchSchema = paginationSchema.extend({
  q: z
    .string()
    .min(2, 'Search query must be at least 2 characters')
    .max(200, 'Search query cannot exceed 200 characters'),
  type: z.enum(['posts', 'users', 'all']).default('all'),
  content_type: contentTypeSchema.optional(),
});

// ============================================================================
// NOTIFICATION SCHEMAS
// ============================================================================

export const notificationTypeSchema = z.enum([
  'comment',
  'reaction',
  'mention',
  'follow',
  'post_published',
  'post_rejected',
  'application_approved',
  'application_rejected',
  'system',
]);

export const markNotificationsReadSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(100),
});

// ============================================================================
// MEDIA UPLOAD SCHEMAS
// ============================================================================

export const mediaUploadSchema = z.object({
  filename: z.string().max(255),
  content_type: z.string().regex(/^(image|video|audio)\//),
  size: z
    .number()
    .int()
    .min(1)
    .max(100 * 1024 * 1024), // Max 100MB
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse and validate request body with a Zod schema
 */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw err;
    }
    throw new z.ZodError([
      {
        code: 'custom',
        path: [],
        message: 'Invalid JSON body',
      },
    ]);
  }
}

/**
 * Parse and validate URL search params with a Zod schema
 */
export function parseParams<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
): z.infer<T> {
  const params: Record<string, string | string[]> = {};

  searchParams.forEach((value, key) => {
    if (params[key]) {
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });

  return schema.parse(params);
}

/**
 * Generate a URL-safe slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens from ends
}

/**
 * Calculate reading time for content
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

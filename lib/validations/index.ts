import { z } from 'zod';

// Auth validations
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    agreeToTerms: z.boolean().refine((val) => val === true, 'You must agree to the terms'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Profile validations
export const profileSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  websiteUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  twitterHandle: z
    .string()
    .regex(/^[a-zA-Z0-9_]*$/, 'Invalid Twitter handle')
    .optional()
    .or(z.literal('')),
  kofiUsername: z
    .string()
    .regex(/^[a-zA-Z0-9_]*$/, 'Invalid Ko-fi username')
    .optional()
    .or(z.literal('')),
});

// Application validations
export const applicationSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  location: z.string().optional(),
  portfolioUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  contentTypes: z.array(z.string()).min(1, 'Please select at least one content type'),
  topics: z.array(z.string()).min(1, 'Please select at least one topic'),
  firstPiecePitch: z
    .string()
    .min(200, 'Please write at least 200 words')
    .max(2500, 'Please keep your pitch under 500 words'),
  whyScroungers: z
    .string()
    .min(100, 'Please write at least 100 words')
    .max(1500, 'Please keep your response under 300 words'),
  agreedToTerms: z.boolean().refine((val) => val === true, 'You must agree to the terms'),
  agreedToGuidelines: z.boolean().refine((val) => val === true, 'You must agree to the guidelines'),
  agreedToIP: z.boolean().refine((val) => val === true, 'You must acknowledge the IP terms'),
});

// Post validations
export const postSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title is too long'),
  subtitle: z.string().max(300, 'Subtitle is too long').optional(),
  content: z.any(), // TipTap JSON content
  contentHtml: z.string().optional(),
  contentType: z.enum(['written', 'video', 'audio', 'visual']),
  excerpt: z.string().max(500, 'Excerpt is too long').optional(),
  featuredImageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
  mediaUrl: z.string().url('Invalid media URL').optional().or(z.literal('')),
  categoryId: z.string().uuid('Please select a category').optional(),
  tags: z.array(z.string()).optional(),
  metaTitle: z.string().max(60, 'Meta title is too long').optional(),
  metaDescription: z.string().max(160, 'Meta description is too long').optional(),
});

// Comment validations
export const commentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment is too long (max 2000 characters)'),
});

// Contact form validations
export const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  subject: z.enum(['general', 'technical', 'press', 'partnership']),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message is too long'),
});

// Newsletter validations
export const newsletterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type NewsletterInput = z.infer<typeof newsletterSchema>;

// ============================================================================
// API UTILITIES
// Central export for all API helpers
// ============================================================================

// Security headers
export { applySecurityHeaders } from '../security/headers';
// Error handler
export { handleApiError as handleApiErrorEnhanced, withErrorHandling } from './error-handler';

// Middleware
export {
  type AuthContext,
  type AuthenticatedUser,
  checkRateLimit,
  getAuthUser,
  rateLimitByIp,
  rateLimitByUser,
  requireAdmin,
  requireAuth,
  requireCommentOwnership,
  requireContributor,
  requireEditor,
  requireMinRole,
  requireOwnershipOrAdmin,
  requirePostOwnership,
  requireRole,
  type UserRole,
} from './middleware';
// Response helpers
export {
  ApiError,
  type ApiErrorResponse,
  type ApiSuccessResponse,
  badRequest,
  conflict,
  created,
  databaseError,
  type ErrorCode,
  error,
  forbidden,
  handleApiError,
  internalError,
  methodNotAllowed,
  noContent,
  notFound,
  type PaginatedResponse,
  paginated,
  rateLimited,
  success,
  unauthorized,
  validationError,
} from './response';
// Validation schemas and helpers
export {
  bioSchema,
  calculateReadingTime,
  // Contact schemas
  contactSubmissionSchema,
  // Content schemas
  contentTypeSchema,
  // Application schemas
  contentTypesSchema,
  contributorApplicationSchema,
  // Comment schemas
  createCommentSchema,
  // Post schemas
  createPostSchema,
  displayNameSchema,
  emailSchema,
  flagCommentSchema,
  generateSlug,
  listCommentsSchema,
  listPostsSchema,
  markNotificationsReadSchema,
  // Media schemas
  mediaUploadSchema,
  moderatePostSchema,
  // Newsletter schemas
  newsletterSubscribeSchema,
  newsletterUnsubscribeSchema,
  // Notification schemas
  notificationTypeSchema,
  optionalUrlSchema,
  paginationSchema,
  // Helper functions
  parseBody,
  parseParams,
  postStatusSchema,
  publishPostSchema,
  // Reaction schemas
  reactionTypeSchema,
  reviewApplicationSchema,
  // Search schemas
  searchSchema,
  slugSchema,
  sortOrderSchema,
  suspendUserSchema,
  toggleCommentReactionSchema,
  toggleReactionSchema,
  updateCommentSchema,
  updatePostSchema,
  updateProfileSchema,
  // Admin schemas
  updateUserRoleSchema,
  urlSchema,
  // User schemas
  usernameSchema,
  // Base schemas
  uuidSchema,
} from './validation';

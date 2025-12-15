// ============================================================================
// API UTILITIES
// Central export for all API helpers
// ============================================================================

// Response helpers
export {
  success,
  created,
  noContent,
  paginated,
  error,
  badRequest,
  validationError,
  unauthorized,
  forbidden,
  notFound,
  methodNotAllowed,
  conflict,
  rateLimited,
  internalError,
  databaseError,
  handleApiError,
  ApiError,
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type PaginatedResponse,
  type ErrorCode,
} from './response';

// Validation schemas and helpers
export {
  // Base schemas
  uuidSchema,
  slugSchema,
  emailSchema,
  urlSchema,
  optionalUrlSchema,
  paginationSchema,
  sortOrderSchema,
  // Content schemas
  contentTypeSchema,
  postStatusSchema,
  // User schemas
  usernameSchema,
  displayNameSchema,
  bioSchema,
  updateProfileSchema,
  // Post schemas
  createPostSchema,
  updatePostSchema,
  publishPostSchema,
  listPostsSchema,
  // Comment schemas
  createCommentSchema,
  updateCommentSchema,
  listCommentsSchema,
  flagCommentSchema,
  // Reaction schemas
  reactionTypeSchema,
  toggleReactionSchema,
  toggleCommentReactionSchema,
  // Application schemas
  contentTypesSchema,
  contributorApplicationSchema,
  reviewApplicationSchema,
  // Newsletter schemas
  newsletterSubscribeSchema,
  newsletterUnsubscribeSchema,
  // Contact schemas
  contactSubmissionSchema,
  // Admin schemas
  updateUserRoleSchema,
  moderatePostSchema,
  suspendUserSchema,
  // Search schemas
  searchSchema,
  // Notification schemas
  notificationTypeSchema,
  markNotificationsReadSchema,
  // Media schemas
  mediaUploadSchema,
  // Helper functions
  parseBody,
  parseParams,
  generateSlug,
  calculateReadingTime,
} from './validation';

// Middleware
export {
  getAuthUser,
  requireAuth,
  requireRole,
  requireMinRole,
  requireAdmin,
  requireEditor,
  requireContributor,
  requireOwnershipOrAdmin,
  requirePostOwnership,
  requireCommentOwnership,
  checkRateLimit,
  rateLimitByIp,
  rateLimitByUser,
  type UserRole,
  type AuthenticatedUser,
  type AuthContext,
} from './middleware';

// Error handler
export { handleApiError as handleApiErrorEnhanced, withErrorHandling } from './error-handler';




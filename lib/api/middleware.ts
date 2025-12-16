import { createClient } from '@/lib/supabase/server';
import { ApiError } from './response';

// ============================================================================
// TYPES
// ============================================================================

export type UserRole = 'reader' | 'contributor' | 'editor' | 'admin' | 'superadmin';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  profile: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface AuthContext {
  user: AuthenticatedUser;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

// Role hierarchy - higher number = more permissions
const ROLE_HIERARCHY: Record<UserRole, number> = {
  reader: 0,
  contributor: 1,
  editor: 2,
  admin: 3,
  superadmin: 4,
};

// ============================================================================
// CORE AUTH FUNCTIONS
// ============================================================================

/**
 * Get the current authenticated user from the request
 * Returns null if not authenticated
 */
export async function getAuthUser(): Promise<{
  user: AuthenticatedUser | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();
  
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, supabase };
  }

  // Fetch the user's profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url, role')
    .eq('id', user.id)
    .single();

  const authenticatedUser: AuthenticatedUser = {
    id: user.id,
    email: user.email || '',
    role: (profile?.role as UserRole) || 'reader',
    profile: profile
      ? {
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        }
      : null,
  };

  return { user: authenticatedUser, supabase };
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AuthContext> {
  const { user, supabase } = await getAuthUser();

  if (!user) {
    throw ApiError.unauthorized('Authentication required');
  }

  return { user, supabase };
}

/**
 * Require a specific role - throws if user doesn't have sufficient permissions
 */
export async function requireRole(
  ...allowedRoles: UserRole[]
): Promise<AuthContext> {
  const { user, supabase } = await requireAuth();

  // Check if user has any of the allowed roles
  if (!allowedRoles.includes(user.role)) {
    throw ApiError.forbidden(
      `This action requires one of these roles: ${allowedRoles.join(', ')}`
    );
  }

  return { user, supabase };
}

/**
 * Require minimum role level (uses hierarchy)
 */
export async function requireMinRole(
  minRole: UserRole
): Promise<AuthContext> {
  const { user, supabase } = await requireAuth();

  const userLevel = ROLE_HIERARCHY[user.role];
  const requiredLevel = ROLE_HIERARCHY[minRole];

  if (userLevel < requiredLevel) {
    throw ApiError.forbidden(
      `This action requires at least ${minRole} role`
    );
  }

  return { user, supabase };
}

/**
 * Require admin role
 */
export async function requireAdmin(): Promise<AuthContext> {
  return requireRole('admin');
}

/**
 * Require editor or admin role
 */
export async function requireEditor(): Promise<AuthContext> {
  return requireRole('editor', 'admin');
}

/**
 * Require contributor, editor, or admin role
 */
export async function requireContributor(): Promise<AuthContext> {
  return requireRole('contributor', 'editor', 'admin');
}

// ============================================================================
// RESOURCE OWNERSHIP CHECKS
// ============================================================================

/**
 * Check if user owns a resource or is admin
 */
export async function requireOwnershipOrAdmin(
  resourceOwnerId: string
): Promise<AuthContext> {
  const { user, supabase } = await requireAuth();

  if (user.id !== resourceOwnerId && user.role !== 'admin') {
    throw ApiError.forbidden('You do not have permission to access this resource');
  }

  return { user, supabase };
}

/**
 * Check if user owns a post or is admin/editor
 */
export async function requirePostOwnership(
  postId: string
): Promise<AuthContext & { post: { author_id: string; status: string } }> {
  const { user, supabase } = await requireAuth();

  const { data: post, error } = await supabase
    .from('posts')
    .select('author_id, status')
    .eq('id', postId)
    .single();

  if (error || !post) {
    throw ApiError.notFound('Post');
  }

  const isOwner = post.author_id === user.id;
  const isPrivileged = ['admin', 'editor'].includes(user.role);

  if (!isOwner && !isPrivileged) {
    throw ApiError.forbidden('You do not have permission to modify this post');
  }

  return { user, supabase, post };
}

/**
 * Check if user owns a comment or is admin
 */
export async function requireCommentOwnership(
  commentId: string
): Promise<AuthContext & { comment: { author_id: string } }> {
  const { user, supabase } = await requireAuth();

  const { data: comment, error } = await supabase
    .from('comments')
    .select('author_id')
    .eq('id', commentId)
    .single();

  if (error || !comment) {
    throw ApiError.notFound('Comment');
  }

  const isOwner = comment.author_id === user.id;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You do not have permission to modify this comment');
  }

  return { user, supabase, comment };
}

// ============================================================================
// RATE LIMITING (Simple in-memory - use Redis in production)
// ============================================================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

/**
 * Check rate limit for a given key
 * Returns true if within limit, throws if exceeded
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = { maxRequests: 100, windowMs: 60000 }
): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
    return true;
  }

  if (record.count >= options.maxRequests) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    throw ApiError.badRequest(`Rate limit exceeded. Try again in ${retryAfter} seconds`);
  }

  record.count++;
  return true;
}

/**
 * Rate limit by IP address
 */
export function rateLimitByIp(
  request: Request,
  options?: RateLimitOptions
): boolean {
  const ip = getClientIp(request);
  return checkRateLimit(`ip:${ip}`, options);
}

/**
 * Rate limit by user ID
 */
export function rateLimitByUser(
  userId: string,
  options?: RateLimitOptions
): boolean {
  return checkRateLimit(`user:${userId}`, options);
}

/**
 * Extract client IP from request
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

// ============================================================================
// HELPER TYPE EXPORTS
// ============================================================================

// Clean up rate limit store periodically (simple garbage collection)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000);
}


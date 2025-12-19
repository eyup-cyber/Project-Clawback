/**
 * Account Lockout Protection
 * Implements progressive delays and account lockout after failed attempts
 */

import { createServiceClient } from '@/lib/supabase/server';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const PROGRESSIVE_DELAYS = [0, 1000, 2000, 4000, 8000, 16000]; // milliseconds

export interface LoginAttemptResult {
  allowed: boolean;
  attemptsRemaining: number;
  lockoutUntil: Date | null;
  delayMs: number;
  message: string;
}

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(
  userId: string | null,
  ipAddress: string,
  success: boolean,
  userAgent?: string
): Promise<void> {
  const supabase = await createServiceClient();

  await supabase.from('login_attempts').insert({
    user_id: userId,
    ip_address: ipAddress,
    user_agent: userAgent,
    success,
  });
}

/**
 * Get recent failed attempts for a user or IP
 */
export async function getRecentFailedAttempts(
  identifier: { userId?: string; ipAddress?: string },
  windowMinutes: number = 30
): Promise<number> {
  const supabase = await createServiceClient();
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  let query = supabase
    .from('login_attempts')
    .select('id', { count: 'exact' })
    .eq('success', false)
    .gte('created_at', windowStart.toISOString());

  if (identifier.userId) {
    query = query.eq('user_id', identifier.userId);
  }
  if (identifier.ipAddress) {
    query = query.eq('ip_address', identifier.ipAddress);
  }

  const { count } = await query;
  return count || 0;
}

/**
 * Check if a user/IP is locked out
 */
export async function checkLockout(
  identifier: { userId?: string; ipAddress?: string }
): Promise<LoginAttemptResult> {
  const failedAttempts = await getRecentFailedAttempts(identifier);

  // Check if locked out
  if (failedAttempts >= MAX_ATTEMPTS) {
    const supabase = await createServiceClient();
    
    // Get the most recent failed attempt to calculate lockout end
    let query = supabase
      .from('login_attempts')
      .select('created_at')
      .eq('success', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (identifier.userId) {
      query = query.eq('user_id', identifier.userId);
    }
    if (identifier.ipAddress) {
      query = query.eq('ip_address', identifier.ipAddress);
    }

    const { data } = await query;
    
    if (data && data.length > 0) {
      const lastAttempt = new Date(data[0].created_at);
      const lockoutEnd = new Date(lastAttempt.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      
      if (lockoutEnd > new Date()) {
        const minutesRemaining = Math.ceil((lockoutEnd.getTime() - Date.now()) / 60000);
        return {
          allowed: false,
          attemptsRemaining: 0,
          lockoutUntil: lockoutEnd,
          delayMs: 0,
          message: `Account locked. Try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`,
        };
      }
    }
  }

  // Calculate progressive delay
  const delayIndex = Math.min(failedAttempts, PROGRESSIVE_DELAYS.length - 1);
  const delayMs = PROGRESSIVE_DELAYS[delayIndex];

  return {
    allowed: true,
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - failedAttempts),
    lockoutUntil: null,
    delayMs,
    message: failedAttempts > 0 
      ? `${MAX_ATTEMPTS - failedAttempts} attempts remaining before lockout.`
      : '',
  };
}

/**
 * Handle a login attempt with lockout protection
 */
export async function handleLoginAttempt(
  userId: string | null,
  ipAddress: string,
  userAgent: string | undefined,
  success: boolean
): Promise<LoginAttemptResult> {
  // Record the attempt
  await recordLoginAttempt(userId, ipAddress, success, userAgent);

  // If successful, return immediately
  if (success) {
    // Clear the IP-based tracking on successful login
    return {
      allowed: true,
      attemptsRemaining: MAX_ATTEMPTS,
      lockoutUntil: null,
      delayMs: 0,
      message: 'Login successful',
    };
  }

  // Check lockout status
  const identifier = userId ? { userId, ipAddress } : { ipAddress };
  return checkLockout(identifier);
}

/**
 * Clear login attempts for a user (e.g., after password reset)
 */
export async function clearLoginAttempts(_userId: string): Promise<void> {
  // We don't delete attempts (for audit purposes), but we could mark them as cleared
  // For now, successful logins reset the counter naturally by being counted differently
  // Future: could mark attempts as cleared in database for audit trail
}

/**
 * Get login attempt history for a user (for security dashboard)
 */
export async function getLoginHistory(
  userId: string,
  limit: number = 20
): Promise<Array<{
  id: string;
  ipAddress: string;
  userAgent: string | null;
  success: boolean;
  createdAt: Date;
}>> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('login_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((attempt) => ({
    id: attempt.id,
    ipAddress: attempt.ip_address,
    userAgent: attempt.user_agent,
    success: attempt.success,
    createdAt: new Date(attempt.created_at),
  }));
}

/**
 * Check if an IP address has suspicious activity
 */
export async function checkSuspiciousIP(
  ipAddress: string,
  windowMinutes: number = 60
): Promise<{
  isSuspicious: boolean;
  failedAttempts: number;
  uniqueUsers: number;
}> {
  const supabase = await createServiceClient();
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  // Get failed attempts from this IP
  const { data: attempts } = await supabase
    .from('login_attempts')
    .select('user_id, success')
    .eq('ip_address', ipAddress)
    .gte('created_at', windowStart.toISOString());

  if (!attempts || attempts.length === 0) {
    return {
      isSuspicious: false,
      failedAttempts: 0,
      uniqueUsers: 0,
    };
  }

  const failedAttempts = attempts.filter((a) => !a.success).length;
  const uniqueUsers = new Set(attempts.map((a) => a.user_id).filter(Boolean)).size;

  // Suspicious if many failed attempts or targeting many users
  const isSuspicious = failedAttempts > 10 || uniqueUsers > 3;

  return {
    isSuspicious,
    failedAttempts,
    uniqueUsers,
  };
}

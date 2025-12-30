/**
 * Session Management and Device Fingerprinting
 * Provides enhanced session security features
 */

import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Session information stored in database
 */
export interface SessionInfo {
  id: string;
  userId: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  browser: string;
  os: string;
  location?: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
}

/**
 * Parse user agent string to extract device info
 */
export function parseUserAgent(userAgent: string): {
  deviceType: string;
  browser: string;
  os: string;
} {
  const ua = userAgent.toLowerCase();

  // Detect device type
  let deviceType = 'desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    deviceType = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'tablet';
  }

  // Detect browser
  let browser = 'Unknown';
  if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('opera')) browser = 'Opera';

  // Detect OS
  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  return { deviceType, browser, os };
}

/**
 * Generate a device fingerprint from request data
 */
export function generateDeviceFingerprint(
  userAgent: string,
  ipAddress: string,
  acceptLanguage?: string,
  acceptEncoding?: string
): string {
  const components = [userAgent, ipAddress, acceptLanguage || '', acceptEncoding || ''].join('|');

  return crypto.createHash('sha256').update(components).digest('hex').substring(0, 32);
}

/**
 * Create a new session record
 */
export async function createSession(
  userId: string,
  request: Request,
  expiresInHours: number = 24 * 7 // 7 days default
): Promise<SessionInfo | null> {
  const supabase = await createServiceClient();

  const userAgent = request.headers.get('user-agent') || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const acceptLanguage = request.headers.get('accept-language') || undefined;
  const acceptEncoding = request.headers.get('accept-encoding') || undefined;

  const deviceFingerprint = generateDeviceFingerprint(
    userAgent,
    ipAddress,
    acceptLanguage,
    acceptEncoding
  );

  const deviceInfo = parseUserAgent(userAgent);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('user_sessions')
    .insert({
      user_id: userId,
      device_fingerprint: deviceFingerprint,
      ip_address: ipAddress,
      user_agent: userAgent,
      device_type: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create session:', error);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    deviceFingerprint: data.device_fingerprint,
    ipAddress: data.ip_address,
    userAgent: data.user_agent,
    deviceType: data.device_type,
    browser: data.browser,
    os: data.os,
    location: data.location,
    createdAt: new Date(data.created_at),
    lastActiveAt: new Date(data.last_active_at),
    expiresAt: new Date(data.expires_at),
  };
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<SessionInfo[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('last_active_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((session) => ({
    id: session.id,
    userId: session.user_id,
    deviceFingerprint: session.device_fingerprint,
    ipAddress: session.ip_address,
    userAgent: session.user_agent,
    deviceType: session.device_type,
    browser: session.browser,
    os: session.os,
    location: session.location,
    createdAt: new Date(session.created_at),
    lastActiveAt: new Date(session.last_active_at),
    expiresAt: new Date(session.expires_at),
  }));
}

/**
 * Update session last active timestamp
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  const supabase = await createServiceClient();

  await supabase
    .from('user_sessions')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', sessionId);
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: string, userId: string): Promise<boolean> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);

  return !error;
}

/**
 * Revoke all sessions for a user (except current)
 */
export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
  const supabase = await createServiceClient();

  let query = supabase.from('user_sessions').delete().eq('user_id', userId);

  if (exceptSessionId) {
    query = query.neq('id', exceptSessionId);
  }

  const { data, error } = await query.select();

  if (error) {
    return 0;
  }

  return data?.length || 0;
}

/**
 * Check if a session is valid
 */
export async function validateSession(sessionId: string, userId: string): Promise<boolean> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('user_sessions')
    .select('id, expires_at')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  return new Date(data.expires_at) > new Date();
}

/**
 * Detect suspicious login (new device/location)
 */
export async function detectSuspiciousLogin(
  userId: string,
  request: Request
): Promise<{
  isNewDevice: boolean;
  isNewLocation: boolean;
  previousDevices: number;
}> {
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

  const deviceFingerprint = generateDeviceFingerprint(
    userAgent,
    ipAddress,
    request.headers.get('accept-language') || undefined,
    request.headers.get('accept-encoding') || undefined
  );

  const supabase = await createServiceClient();

  // Get previous sessions
  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('device_fingerprint, ip_address')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!sessions || sessions.length === 0) {
    return {
      isNewDevice: true,
      isNewLocation: true,
      previousDevices: 0,
    };
  }

  const knownFingerprints = new Set(sessions.map((s) => s.device_fingerprint));
  const knownIPs = new Set(sessions.map((s) => s.ip_address));

  return {
    isNewDevice: !knownFingerprints.has(deviceFingerprint),
    isNewLocation: !knownIPs.has(ipAddress),
    previousDevices: knownFingerprints.size,
  };
}

/**
 * Cleanup expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('user_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select();

  if (error) {
    return 0;
  }

  return data?.length || 0;
}

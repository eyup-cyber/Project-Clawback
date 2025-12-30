/**
 * Comprehensive Audit Logging System
 * Phase 38: Track all system events, user actions, and changes
 */

import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface AuditLog {
  id: string;
  event_type: AuditEventType;
  category: AuditCategory;
  actor_id: string | null;
  actor_type: ActorType;
  target_type: string | null;
  target_id: string | null;
  action: string;
  description: string;
  metadata: AuditMetadata;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  session_id: string | null;
  created_at: string;
}

export type AuditEventType =
  // Authentication
  | 'auth.login'
  | 'auth.logout'
  | 'auth.signup'
  | 'auth.password_reset'
  | 'auth.password_change'
  | 'auth.email_change'
  | 'auth.mfa_enable'
  | 'auth.mfa_disable'
  | 'auth.session_revoke'
  | 'auth.failed_login'
  | 'auth.account_locked'
  // User actions
  | 'user.profile_update'
  | 'user.avatar_change'
  | 'user.settings_change'
  | 'user.role_change'
  | 'user.status_change'
  | 'user.delete'
  | 'user.suspend'
  | 'user.unsuspend'
  // Content
  | 'content.create'
  | 'content.update'
  | 'content.delete'
  | 'content.publish'
  | 'content.unpublish'
  | 'content.archive'
  | 'content.restore'
  | 'content.approve'
  | 'content.reject'
  // Comments
  | 'comment.create'
  | 'comment.update'
  | 'comment.delete'
  | 'comment.hide'
  | 'comment.unhide'
  // Moderation
  | 'moderation.report_create'
  | 'moderation.report_resolve'
  | 'moderation.content_flag'
  | 'moderation.user_warn'
  | 'moderation.user_ban'
  // Admin
  | 'admin.settings_change'
  | 'admin.feature_flag_change'
  | 'admin.role_assign'
  | 'admin.role_revoke'
  | 'admin.data_export'
  | 'admin.data_import'
  | 'admin.backup_create'
  | 'admin.backup_restore'
  // System
  | 'system.error'
  | 'system.maintenance_start'
  | 'system.maintenance_end'
  | 'system.deployment'
  | 'system.config_change';

export type AuditCategory =
  | 'authentication'
  | 'user'
  | 'content'
  | 'comment'
  | 'moderation'
  | 'admin'
  | 'system'
  | 'security'
  | 'api';

export type ActorType = 'user' | 'admin' | 'system' | 'api' | 'anonymous';

export interface AuditMetadata {
  changes?: Record<string, { old: unknown; new: unknown }>;
  reason?: string;
  duration_ms?: number;
  error?: string;
  additional?: Record<string, unknown>;
}

export interface AuditQuery {
  eventTypes?: AuditEventType[];
  categories?: AuditCategory[];
  actorId?: string;
  actorType?: ActorType;
  targetType?: string;
  targetId?: string;
  from?: Date;
  to?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  total_events: number;
  events_by_category: Record<AuditCategory, number>;
  events_by_type: Record<string, number>;
  events_by_actor_type: Record<ActorType, number>;
  events_by_day: { date: string; count: number }[];
  top_actors: { actor_id: string; count: number }[];
  top_targets: { target_type: string; target_id: string; count: number }[];
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log an audit event
 */
export async function logAuditEvent(event: {
  eventType: AuditEventType;
  actorId?: string;
  actorType?: ActorType;
  targetType?: string;
  targetId?: string;
  action: string;
  description: string;
  metadata?: AuditMetadata;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
}): Promise<AuditLog> {
  const supabase = await createServiceClient();

  const category = getEventCategory(event.eventType);

  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      event_type: event.eventType,
      category,
      actor_id: event.actorId || null,
      actor_type: event.actorType || 'system',
      target_type: event.targetType || null,
      target_id: event.targetId || null,
      action: event.action,
      description: event.description,
      metadata: event.metadata || {},
      ip_address: event.ipAddress || null,
      user_agent: event.userAgent || null,
      request_id: event.requestId || null,
      session_id: event.sessionId || null,
    })
    .select()
    .single();

  if (error) {
    logger.error('[Audit] Failed to log event', {
      eventType: event.eventType,
      error,
    });
    throw error;
  }

  // Also log to application logger for real-time monitoring
  logger.info('[Audit]', {
    eventType: event.eventType,
    category,
    actorId: event.actorId,
    targetType: event.targetType,
    targetId: event.targetId,
    action: event.action,
  });

  return data as AuditLog;
}

/**
 * Get event category from event type
 */
function getEventCategory(eventType: AuditEventType): AuditCategory {
  const prefix = eventType.split('.')[0];
  const categoryMap: Record<string, AuditCategory> = {
    auth: 'authentication',
    user: 'user',
    content: 'content',
    comment: 'comment',
    moderation: 'moderation',
    admin: 'admin',
    system: 'system',
  };
  return categoryMap[prefix] || 'system';
}

// ============================================================================
// CONVENIENCE LOGGING FUNCTIONS
// ============================================================================

/**
 * Log authentication event
 */
export async function logAuthEvent(
  eventType: AuditEventType,
  userId: string | null,
  options: {
    action: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    metadata?: AuditMetadata;
  }
): Promise<void> {
  await logAuditEvent({
    eventType,
    actorId: userId || undefined,
    actorType: userId ? 'user' : 'anonymous',
    action: options.action,
    description: options.description,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    sessionId: options.sessionId,
    metadata: options.metadata,
  });
}

/**
 * Log content change
 */
export async function logContentChange(
  eventType: AuditEventType,
  actorId: string,
  contentId: string,
  contentType: string,
  options: {
    action: string;
    description: string;
    changes?: Record<string, { old: unknown; new: unknown }>;
    reason?: string;
  }
): Promise<void> {
  await logAuditEvent({
    eventType,
    actorId,
    actorType: 'user',
    targetType: contentType,
    targetId: contentId,
    action: options.action,
    description: options.description,
    metadata: {
      changes: options.changes,
      reason: options.reason,
    },
  });
}

/**
 * Log admin action
 */
export async function logAdminAction(
  eventType: AuditEventType,
  adminId: string,
  options: {
    targetType?: string;
    targetId?: string;
    action: string;
    description: string;
    changes?: Record<string, { old: unknown; new: unknown }>;
    reason?: string;
  }
): Promise<void> {
  await logAuditEvent({
    eventType,
    actorId: adminId,
    actorType: 'admin',
    targetType: options.targetType,
    targetId: options.targetId,
    action: options.action,
    description: options.description,
    metadata: {
      changes: options.changes,
      reason: options.reason,
    },
  });
}

/**
 * Log system event
 */
export async function logSystemEvent(
  eventType: AuditEventType,
  options: {
    action: string;
    description: string;
    metadata?: AuditMetadata;
  }
): Promise<void> {
  await logAuditEvent({
    eventType,
    actorType: 'system',
    action: options.action,
    description: options.description,
    metadata: options.metadata,
  });
}

// ============================================================================
// AUDIT QUERIES
// ============================================================================

/**
 * Query audit logs
 */
export async function queryAuditLogs(
  query: AuditQuery
): Promise<{ logs: AuditLog[]; total: number }> {
  const {
    eventTypes,
    categories,
    actorId,
    actorType,
    targetType,
    targetId,
    from,
    to,
    search,
    limit = 50,
    offset = 0,
  } = query;

  const supabase = await createServiceClient();

  let dbQuery = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (eventTypes?.length) {
    dbQuery = dbQuery.in('event_type', eventTypes);
  }

  if (categories?.length) {
    dbQuery = dbQuery.in('category', categories);
  }

  if (actorId) {
    dbQuery = dbQuery.eq('actor_id', actorId);
  }

  if (actorType) {
    dbQuery = dbQuery.eq('actor_type', actorType);
  }

  if (targetType) {
    dbQuery = dbQuery.eq('target_type', targetType);
  }

  if (targetId) {
    dbQuery = dbQuery.eq('target_id', targetId);
  }

  if (from) {
    dbQuery = dbQuery.gte('created_at', from.toISOString());
  }

  if (to) {
    dbQuery = dbQuery.lte('created_at', to.toISOString());
  }

  if (search) {
    dbQuery = dbQuery.or(`action.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, count, error } = await dbQuery;

  if (error) {
    logger.error('[Audit] Query failed', error);
    throw error;
  }

  return {
    logs: (data || []) as AuditLog[],
    total: count || 0,
  };
}

/**
 * Get audit log by ID
 */
export async function getAuditLog(logId: string): Promise<AuditLog | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase.from('audit_logs').select('*').eq('id', logId).single();

  if (error) return null;
  return data as AuditLog;
}

/**
 * Get audit logs for a specific target
 */
export async function getTargetHistory(
  targetType: string,
  targetId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ logs: AuditLog[]; total: number }> {
  return queryAuditLogs({
    targetType,
    targetId,
    limit: options.limit,
    offset: options.offset,
  });
}

/**
 * Get audit logs for a specific user
 */
export async function getUserActivity(
  userId: string,
  options: { limit?: number; offset?: number; from?: Date; to?: Date } = {}
): Promise<{ logs: AuditLog[]; total: number }> {
  return queryAuditLogs({
    actorId: userId,
    limit: options.limit,
    offset: options.offset,
    from: options.from,
    to: options.to,
  });
}

// ============================================================================
// AUDIT STATISTICS
// ============================================================================

/**
 * Get audit statistics
 */
export async function getAuditStats(options: { from?: Date; to?: Date } = {}): Promise<AuditStats> {
  const { from, to } = options;
  const supabase = await createServiceClient();

  // Build base query conditions (for potential raw SQL use)
  let _conditions = '';
  const _params: Record<string, string> = {};

  if (from) {
    _conditions += ` AND created_at >= '${from.toISOString()}'`;
  }
  if (to) {
    _conditions += ` AND created_at <= '${to.toISOString()}'`;
  }

  // Get total count
  let countQuery = supabase.from('audit_logs').select('*', { count: 'exact', head: true });

  if (from) countQuery = countQuery.gte('created_at', from.toISOString());
  if (to) countQuery = countQuery.lte('created_at', to.toISOString());

  const { count: totalEvents } = await countQuery;

  // Get events by category
  const { data: categoryData } = await supabase.from('audit_logs').select('category');

  const eventsByCategory: Record<AuditCategory, number> = {
    authentication: 0,
    user: 0,
    content: 0,
    comment: 0,
    moderation: 0,
    admin: 0,
    system: 0,
    security: 0,
    api: 0,
  };

  (categoryData || []).forEach((log) => {
    eventsByCategory[log.category as AuditCategory]++;
  });

  // Get events by type (top 10)
  const { data: typeData } = await supabase.from('audit_logs').select('event_type');

  const typeCounts: Record<string, number> = {};
  (typeData || []).forEach((log) => {
    typeCounts[log.event_type] = (typeCounts[log.event_type] || 0) + 1;
  });

  const eventsByType = Object.fromEntries(
    Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  );

  // Get events by actor type
  const { data: actorTypeData } = await supabase.from('audit_logs').select('actor_type');

  const eventsByActorType: Record<ActorType, number> = {
    user: 0,
    admin: 0,
    system: 0,
    api: 0,
    anonymous: 0,
  };

  (actorTypeData || []).forEach((log) => {
    eventsByActorType[log.actor_type as ActorType]++;
  });

  // Get events by day (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { data: dailyData } = await supabase
    .from('audit_logs')
    .select('created_at')
    .gte('created_at', thirtyDaysAgo.toISOString());

  const dailyCounts: Record<string, number> = {};
  (dailyData || []).forEach((log) => {
    const date = log.created_at.split('T')[0];
    dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  });

  const eventsByDay = Object.entries(dailyCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Get top actors
  const { data: actorData } = await supabase
    .from('audit_logs')
    .select('actor_id')
    .not('actor_id', 'is', null)
    .limit(1000);

  const actorCounts: Record<string, number> = {};
  (actorData || []).forEach((log) => {
    if (log.actor_id) {
      actorCounts[log.actor_id] = (actorCounts[log.actor_id] || 0) + 1;
    }
  });

  const topActors = Object.entries(actorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([actor_id, count]) => ({ actor_id, count }));

  // Get top targets
  const { data: targetData } = await supabase
    .from('audit_logs')
    .select('target_type, target_id')
    .not('target_id', 'is', null)
    .limit(1000);

  const targetCounts: Record<string, number> = {};
  (targetData || []).forEach((log) => {
    if (log.target_id) {
      const key = `${log.target_type}:${log.target_id}`;
      targetCounts[key] = (targetCounts[key] || 0) + 1;
    }
  });

  const topTargets = Object.entries(targetCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => {
      const [target_type, target_id] = key.split(':');
      return { target_type, target_id, count };
    });

  return {
    total_events: totalEvents || 0,
    events_by_category: eventsByCategory,
    events_by_type: eventsByType,
    events_by_actor_type: eventsByActorType,
    events_by_day: eventsByDay,
    top_actors: topActors,
    top_targets: topTargets,
  };
}

/**
 * Export audit logs to CSV
 */
export async function exportAuditLogs(query: AuditQuery): Promise<string> {
  const { logs } = await queryAuditLogs({ ...query, limit: 10000 });

  const headers = [
    'ID',
    'Event Type',
    'Category',
    'Actor ID',
    'Actor Type',
    'Target Type',
    'Target ID',
    'Action',
    'Description',
    'IP Address',
    'Created At',
  ];

  const rows = logs.map((log) => [
    log.id,
    log.event_type,
    log.category,
    log.actor_id || '',
    log.actor_type,
    log.target_type || '',
    log.target_id || '',
    log.action,
    log.description,
    log.ip_address || '',
    log.created_at,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Cleanup old audit logs
 */
export async function cleanupOldAuditLogs(retentionDays: number = 365): Promise<number> {
  const supabase = await createServiceClient();

  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('audit_logs')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    logger.error('[Audit] Cleanup failed', error);
    throw error;
  }

  const deletedCount = data?.length || 0;

  logger.info('[Audit] Cleanup completed', { deletedCount, cutoffDate });

  return deletedCount;
}

export default {
  logAuditEvent,
  logAuthEvent,
  logContentChange,
  logAdminAction,
  logSystemEvent,
  queryAuditLogs,
  getAuditLog,
  getTargetHistory,
  getUserActivity,
  getAuditStats,
  exportAuditLogs,
  cleanupOldAuditLogs,
};

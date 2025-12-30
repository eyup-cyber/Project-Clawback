/**
 * Real-time Analytics System
 * Phase 35: Live metrics, current visitors, real-time events
 */

import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface RealtimeMetrics {
  current_visitors: number;
  visitors_trend: 'up' | 'down' | 'stable';
  active_sessions: number;
  page_views_last_minute: number;
  page_views_last_5_minutes: number;
  page_views_last_hour: number;
  events_last_minute: EventCount[];
  top_pages: PageMetric[];
  top_referrers: ReferrerMetric[];
  geo_distribution: GeoMetric[];
  device_breakdown: DeviceMetric[];
  timestamp: string;
}

export interface EventCount {
  event_type: string;
  count: number;
  change: number;
}

export interface PageMetric {
  path: string;
  title: string;
  visitors: number;
  page_views: number;
  avg_time_on_page: number;
}

export interface ReferrerMetric {
  source: string;
  visitors: number;
  percentage: number;
}

export interface GeoMetric {
  country: string;
  country_code: string;
  visitors: number;
  percentage: number;
}

export interface DeviceMetric {
  device_type: 'desktop' | 'mobile' | 'tablet';
  visitors: number;
  percentage: number;
}

export interface ActiveVisitor {
  visitor_id: string;
  user_id: string | null;
  current_page: string;
  page_title: string;
  referrer: string | null;
  device_type: string;
  browser: string;
  country: string | null;
  city: string | null;
  session_start: string;
  last_activity: string;
  page_views: number;
  events: number;
}

export interface LiveEvent {
  id: string;
  visitor_id: string;
  user_id: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  page_path: string;
  timestamp: string;
}

export interface PresenceState {
  visitor_id: string;
  page_path: string;
  entered_at: string;
  user_agent: string;
  metadata: Record<string, unknown>;
}

// ============================================================================
// REALTIME PRESENCE TRACKING
// ============================================================================

const PRESENCE_TTL = 60; // seconds
const _ACTIVE_THRESHOLD = 30 * 60 * 1000; // 30 minutes (reserved for future use)

/**
 * Register visitor presence
 */
export async function registerPresence(
  visitorId: string,
  presence: Omit<PresenceState, 'visitor_id'>
): Promise<void> {
  const supabase = await createServiceClient();

  const { error } = await supabase.from('realtime_presence').upsert(
    {
      visitor_id: visitorId,
      page_path: presence.page_path,
      entered_at: presence.entered_at,
      user_agent: presence.user_agent,
      metadata: presence.metadata,
      last_seen: new Date().toISOString(),
    },
    {
      onConflict: 'visitor_id',
    }
  );

  if (error) {
    logger.error('[Realtime] Failed to register presence', error);
  }
}

/**
 * Update visitor heartbeat
 */
export async function updateHeartbeat(visitorId: string, pagePath: string): Promise<void> {
  const supabase = await createServiceClient();

  await supabase
    .from('realtime_presence')
    .update({
      page_path: pagePath,
      last_seen: new Date().toISOString(),
    })
    .eq('visitor_id', visitorId);
}

/**
 * Remove visitor presence
 */
export async function removePresence(visitorId: string): Promise<void> {
  const supabase = await createServiceClient();

  await supabase.from('realtime_presence').delete().eq('visitor_id', visitorId);
}

/**
 * Clean up stale presence records
 */
export async function cleanupStalePresence(): Promise<number> {
  const supabase = await createServiceClient();

  const threshold = new Date(Date.now() - PRESENCE_TTL * 1000).toISOString();

  const { data, error } = await supabase
    .from('realtime_presence')
    .delete()
    .lt('last_seen', threshold)
    .select('visitor_id');

  if (error) {
    logger.error('[Realtime] Failed to cleanup stale presence', error);
    return 0;
  }

  return data?.length || 0;
}

// ============================================================================
// REALTIME METRICS
// ============================================================================

/**
 * Get current realtime metrics
 */
export async function getRealtimeMetrics(): Promise<RealtimeMetrics> {
  const supabase = await createServiceClient();

  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Get current visitors count
  const { count: currentVisitors } = await supabase
    .from('realtime_presence')
    .select('*', { count: 'exact', head: true })
    .gte('last_seen', new Date(now.getTime() - PRESENCE_TTL * 1000).toISOString());

  // Get page views in different time windows
  const [lastMinute, lastFiveMinutes, lastHour] = await Promise.all([
    getPageViewCount(oneMinuteAgo, now),
    getPageViewCount(fiveMinutesAgo, now),
    getPageViewCount(oneHourAgo, now),
  ]);

  // Get events breakdown
  const eventsLastMinute = await getEventCounts(oneMinuteAgo, now);

  // Get top pages
  const topPages = await getTopPages(fiveMinutesAgo, now);

  // Get top referrers
  const topReferrers = await getTopReferrers(oneHourAgo, now);

  // Get geo distribution
  const geoDistribution = await getGeoDistribution();

  // Get device breakdown
  const deviceBreakdown = await getDeviceBreakdown();

  // Calculate visitor trend
  const previousMinuteCount = await getVisitorCount(
    new Date(now.getTime() - 2 * 60 * 1000),
    oneMinuteAgo
  );

  let visitorsTrend: RealtimeMetrics['visitors_trend'] = 'stable';
  if ((currentVisitors || 0) > previousMinuteCount * 1.1) {
    visitorsTrend = 'up';
  } else if ((currentVisitors || 0) < previousMinuteCount * 0.9) {
    visitorsTrend = 'down';
  }

  return {
    current_visitors: currentVisitors || 0,
    visitors_trend: visitorsTrend,
    active_sessions: currentVisitors || 0,
    page_views_last_minute: lastMinute,
    page_views_last_5_minutes: lastFiveMinutes,
    page_views_last_hour: lastHour,
    events_last_minute: eventsLastMinute,
    top_pages: topPages,
    top_referrers: topReferrers,
    geo_distribution: geoDistribution,
    device_breakdown: deviceBreakdown,
    timestamp: now.toISOString(),
  };
}

async function getPageViewCount(from: Date, to: Date): Promise<number> {
  const supabase = await createServiceClient();

  const { count } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'page_view')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  return count || 0;
}

async function getVisitorCount(from: Date, to: Date): Promise<number> {
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from('analytics_events')
    .select('visitor_id')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  const uniqueVisitors = new Set((data || []).map((e) => e.visitor_id));
  return uniqueVisitors.size;
}

async function getEventCounts(from: Date, to: Date): Promise<EventCount[]> {
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from('analytics_events')
    .select('event_type')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  const counts: Record<string, number> = {};
  (data || []).forEach((event) => {
    counts[event.event_type] = (counts[event.event_type] || 0) + 1;
  });

  return Object.entries(counts).map(([type, count]) => ({
    event_type: type,
    count,
    change: 0, // Would need historical data to calculate
  }));
}

async function getTopPages(from: Date, to: Date): Promise<PageMetric[]> {
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from('analytics_events')
    .select('event_data, visitor_id')
    .eq('event_type', 'page_view')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  const pageStats: Record<string, { visitors: Set<string>; views: number; title: string }> = {};

  (data || []).forEach((event) => {
    const path = (event.event_data as Record<string, string>)?.path || '/';
    const title = (event.event_data as Record<string, string>)?.title || path;

    if (!pageStats[path]) {
      pageStats[path] = { visitors: new Set(), views: 0, title };
    }

    pageStats[path].visitors.add(event.visitor_id);
    pageStats[path].views++;
  });

  return Object.entries(pageStats)
    .map(([path, stats]) => ({
      path,
      title: stats.title,
      visitors: stats.visitors.size,
      page_views: stats.views,
      avg_time_on_page: 0, // Would need session tracking
    }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 10);
}

async function getTopReferrers(from: Date, to: Date): Promise<ReferrerMetric[]> {
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from('analytics_events')
    .select('event_data, visitor_id')
    .eq('event_type', 'session_start')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  const referrerStats: Record<string, Set<string>> = {};
  let total = 0;

  (data || []).forEach((event) => {
    const referrer = (event.event_data as Record<string, string>)?.referrer || 'direct';
    const source = extractReferrerSource(referrer);

    if (!referrerStats[source]) {
      referrerStats[source] = new Set();
    }

    referrerStats[source].add(event.visitor_id);
    total++;
  });

  return Object.entries(referrerStats)
    .map(([source, visitors]) => ({
      source,
      visitors: visitors.size,
      percentage: total > 0 ? (visitors.size / total) * 100 : 0,
    }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 10);
}

function extractReferrerSource(referrer: string): string {
  if (!referrer || referrer === 'direct') return 'Direct';

  try {
    const url = new URL(referrer);
    const host = url.hostname.replace('www.', '');

    // Map common domains
    if (host.includes('google')) return 'Google';
    if (host.includes('facebook') || host.includes('fb.')) return 'Facebook';
    if (host.includes('twitter') || host.includes('t.co')) return 'Twitter';
    if (host.includes('linkedin')) return 'LinkedIn';
    if (host.includes('reddit')) return 'Reddit';
    if (host.includes('youtube')) return 'YouTube';

    return host;
  } catch {
    return 'Other';
  }
}

async function getGeoDistribution(): Promise<GeoMetric[]> {
  const supabase = await createServiceClient();

  const { data } = await supabase.from('realtime_presence').select('metadata');

  const countryStats: Record<string, number> = {};
  let total = 0;

  (data || []).forEach((presence) => {
    const country = (presence.metadata as Record<string, string>)?.country || 'Unknown';
    countryStats[country] = (countryStats[country] || 0) + 1;
    total++;
  });

  return Object.entries(countryStats)
    .map(([country, visitors]) => ({
      country,
      country_code: getCountryCode(country),
      visitors,
      percentage: total > 0 ? (visitors / total) * 100 : 0,
    }))
    .sort((a, b) => b.visitors - a.visitors);
}

function getCountryCode(country: string): string {
  const codes: Record<string, string> = {
    'United States': 'US',
    'United Kingdom': 'GB',
    Canada: 'CA',
    Australia: 'AU',
    Germany: 'DE',
    France: 'FR',
    Japan: 'JP',
    India: 'IN',
    Brazil: 'BR',
    Unknown: 'XX',
  };
  return codes[country] || 'XX';
}

async function getDeviceBreakdown(): Promise<DeviceMetric[]> {
  const supabase = await createServiceClient();

  const { data } = await supabase.from('realtime_presence').select('user_agent');

  const deviceStats: Record<string, number> = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
  };
  let total = 0;

  (data || []).forEach((presence) => {
    const ua = presence.user_agent?.toLowerCase() || '';
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';

    if (/mobile|android|iphone|ipod/i.test(ua)) {
      deviceType = 'mobile';
    } else if (/tablet|ipad/i.test(ua)) {
      deviceType = 'tablet';
    }

    deviceStats[deviceType]++;
    total++;
  });

  return Object.entries(deviceStats).map(([type, visitors]) => ({
    device_type: type as 'desktop' | 'mobile' | 'tablet',
    visitors,
    percentage: total > 0 ? (visitors / total) * 100 : 0,
  }));
}

// ============================================================================
// ACTIVE VISITORS
// ============================================================================

/**
 * Get list of active visitors
 */
export async function getActiveVisitors(options: {
  limit?: number;
  offset?: number;
}): Promise<{ visitors: ActiveVisitor[]; total: number }> {
  const { limit = 50, offset = 0 } = options;
  const supabase = await createServiceClient();

  const threshold = new Date(Date.now() - PRESENCE_TTL * 1000).toISOString();

  const { data, count, error } = await supabase
    .from('realtime_presence')
    .select('*', { count: 'exact' })
    .gte('last_seen', threshold)
    .order('last_seen', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error('[Realtime] Failed to get active visitors', error);
    throw error;
  }

  const visitors: ActiveVisitor[] = (data || []).map((presence) => {
    const metadata = presence.metadata as Record<string, unknown>;
    const ua = presence.user_agent || '';

    return {
      visitor_id: presence.visitor_id,
      user_id: (metadata.user_id as string) || null,
      current_page: presence.page_path,
      page_title: (metadata.page_title as string) || presence.page_path,
      referrer: (metadata.referrer as string) || null,
      device_type: detectDeviceType(ua),
      browser: detectBrowser(ua),
      country: (metadata.country as string) || null,
      city: (metadata.city as string) || null,
      session_start: presence.entered_at,
      last_activity: presence.last_seen,
      page_views: (metadata.page_views as number) || 1,
      events: (metadata.events as number) || 0,
    };
  });

  return {
    visitors,
    total: count || 0,
  };
}

function detectDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
}

function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari')) return 'Safari';
  if (ua.includes('edge')) return 'Edge';
  if (ua.includes('opera')) return 'Opera';
  return 'Other';
}

// ============================================================================
// LIVE EVENT STREAM
// ============================================================================

/**
 * Get recent live events
 */
export async function getLiveEvents(options: {
  limit?: number;
  eventTypes?: string[];
  since?: Date;
}): Promise<LiveEvent[]> {
  const { limit = 50, eventTypes, since } = options;
  const supabase = await createServiceClient();

  let query = supabase
    .from('analytics_events')
    .select('id, visitor_id, user_id, event_type, event_data, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (eventTypes?.length) {
    query = query.in('event_type', eventTypes);
  }

  if (since) {
    query = query.gte('created_at', since.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    logger.error('[Realtime] Failed to get live events', error);
    throw error;
  }

  return (data || []).map((event) => ({
    id: event.id,
    visitor_id: event.visitor_id,
    user_id: event.user_id,
    event_type: event.event_type,
    event_data: event.event_data as Record<string, unknown>,
    page_path: (event.event_data as Record<string, string>)?.path || '/',
    timestamp: event.created_at,
  }));
}

/**
 * Track a realtime event
 */
export async function trackRealtimeEvent(
  visitorId: string,
  eventType: string,
  eventData: Record<string, unknown>,
  userId?: string
): Promise<void> {
  const supabase = await createServiceClient();

  const { error } = await supabase.from('analytics_events').insert({
    visitor_id: visitorId,
    user_id: userId || null,
    event_type: eventType,
    event_data: eventData,
  });

  if (error) {
    logger.error('[Realtime] Failed to track event', error);
    throw error;
  }
}

export default {
  registerPresence,
  updateHeartbeat,
  removePresence,
  cleanupStalePresence,
  getRealtimeMetrics,
  getActiveVisitors,
  getLiveEvents,
  trackRealtimeEvent,
};

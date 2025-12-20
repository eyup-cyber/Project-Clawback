/**
 * Analytics Database Operations
 * Phase 1.7.13: Event tracking and aggregation
 */

import { createClient } from '@/lib/supabase/server';

export interface AnalyticsEvent {
  id: string;
  event_name: string;
  user_id: string | null;
  session_id: string | null;
  properties: Record<string, unknown>;
  page_url: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  ip_address_hash: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  created_at: string;
}

export interface TrackEventOptions {
  eventName: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
  pageUrl?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

/**
 * Track an analytics event
 */
export async function trackEvent(options: TrackEventOptions): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('track_analytics_event', {
    p_event_name: options.eventName,
    p_user_id: options.userId || null,
    p_session_id: options.sessionId || null,
    p_properties: options.properties || {},
    p_page_url: options.pageUrl || null,
    p_referrer: options.referrer || null,
    p_utm_source: options.utmSource || null,
    p_utm_medium: options.utmMedium || null,
    p_utm_campaign: options.utmCampaign || null,
  });

  if (error) {
    // Log error but don't throw (analytics shouldn't break the app)
    console.error('Analytics tracking error:', error);
    return '';
  }

  return data || '';
}

/**
 * Get analytics summary for a date range
 */
export async function getAnalyticsSummary(
  startDate: Date,
  endDate: Date = new Date()
): Promise<{
  total_page_views: number;
  unique_visitors: number;
  total_sessions: number;
  avg_session_duration: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_analytics_summary', {
    p_start_date: startDate.toISOString().split('T')[0],
    p_end_date: endDate.toISOString().split('T')[0],
  });

  if (error) throw error;

  return {
    total_page_views: Number(data?.total_page_views || 0),
    unique_visitors: Number(data?.unique_visitors || 0),
    total_sessions: Number(data?.total_sessions || 0),
    avg_session_duration: Number(data?.avg_session_duration || 0),
  };
}

/**
 * Get top pages for a date range
 */
export async function getTopPages(
  startDate: Date,
  endDate: Date = new Date(),
  limit: number = 10
): Promise<
  Array<{
    page_url: string;
    views: number;
    unique_views: number;
  }>
> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_top_pages', {
    p_start_date: startDate.toISOString().split('T')[0],
    p_end_date: endDate.toISOString().split('T')[0],
    p_limit: limit,
  });

  if (error) throw error;
  return data || [];
}

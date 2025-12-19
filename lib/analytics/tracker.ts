/**
 * Analytics Event Tracker
 * Tracks user interactions and page views
 */

import { createServiceClient } from '@/lib/supabase/server';

export interface AnalyticsEvent {
  sessionId: string;
  userId?: string;
  eventType: string;
  eventData?: Record<string, unknown>;
  pageUrl: string;
  referrer?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface PageViewEvent {
  sessionId: string;
  userId?: string;
  pageUrl: string;
  pageTitle?: string;
  referrer?: string;
  duration?: number;
  scrollDepth?: number;
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Track a page view
 */
export async function trackPageView(event: PageViewEvent): Promise<void> {
  const supabase = await createServiceClient();

  await supabase.from('analytics_events').insert({
    session_id: event.sessionId,
    user_id: event.userId,
    event_type: 'page_view',
    event_data: {
      title: event.pageTitle,
      duration: event.duration,
      scroll_depth: event.scrollDepth,
    },
    page_url: event.pageUrl,
    referrer: event.referrer,
  });
}

/**
 * Track a custom event
 */
export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  const supabase = await createServiceClient();

  await supabase.from('analytics_events').insert({
    session_id: event.sessionId,
    user_id: event.userId,
    event_type: event.eventType,
    event_data: event.eventData,
    page_url: event.pageUrl,
    referrer: event.referrer,
    user_agent: event.userAgent,
  });
}

/**
 * Track post view
 */
export async function trackPostView(
  postId: string,
  sessionId: string,
  userId?: string
): Promise<void> {
  const supabase = await createServiceClient();

  // Insert into post_views table
  await supabase.from('post_views').insert({
    post_id: postId,
    session_id: sessionId,
    viewer_id: userId,
  });

  // Also track as analytics event
  await trackEvent({
    sessionId,
    userId,
    eventType: 'post_view',
    eventData: { postId },
    pageUrl: `/posts/${postId}`,
    timestamp: new Date(),
  });
}

/**
 * Track engagement events
 */
export async function trackEngagement(
  sessionId: string,
  eventType: 'like' | 'comment' | 'share' | 'bookmark',
  contentId: string,
  userId?: string
): Promise<void> {
  await trackEvent({
    sessionId,
    userId,
    eventType: `engagement_${eventType}`,
    eventData: { contentId },
    pageUrl: '',
    timestamp: new Date(),
  });
}

/**
 * Track search event
 */
export async function trackSearch(
  sessionId: string,
  query: string,
  resultsCount: number,
  userId?: string
): Promise<void> {
  await trackEvent({
    sessionId,
    userId,
    eventType: 'search',
    eventData: { query, results_count: resultsCount },
    pageUrl: '/search',
    timestamp: new Date(),
  });
}

/**
 * Track conversion event
 */
export async function trackConversion(
  sessionId: string,
  conversionType: string,
  value?: number,
  userId?: string
): Promise<void> {
  await trackEvent({
    sessionId,
    userId,
    eventType: 'conversion',
    eventData: { type: conversionType, value },
    pageUrl: '',
    timestamp: new Date(),
  });
}

/**
 * Track error event
 */
export async function trackError(
  sessionId: string,
  errorMessage: string,
  errorStack?: string,
  userId?: string
): Promise<void> {
  await trackEvent({
    sessionId,
    userId,
    eventType: 'error',
    eventData: { message: errorMessage, stack: errorStack },
    pageUrl: '',
    timestamp: new Date(),
  });
}

/**
 * Client-side tracking script
 */
export const clientTrackingScript = `
(function() {
  const SESSION_KEY = 'scrng_session';
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  // Track page views
  function trackPageView() {
    const data = {
      sessionId,
      pageUrl: window.location.href,
      pageTitle: document.title,
      referrer: document.referrer,
    };
    
    navigator.sendBeacon('/api/analytics/track', JSON.stringify({
      type: 'page_view',
      data
    }));
  }

  // Track on page load
  if (document.readyState === 'complete') {
    trackPageView();
  } else {
    window.addEventListener('load', trackPageView);
  }

  // Track scroll depth
  let maxScroll = 0;
  window.addEventListener('scroll', function() {
    const scrollPercent = Math.round(
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
    );
    maxScroll = Math.max(maxScroll, scrollPercent);
  });

  // Track time on page
  const startTime = Date.now();
  window.addEventListener('beforeunload', function() {
    const duration = Math.round((Date.now() - startTime) / 1000);
    navigator.sendBeacon('/api/analytics/track', JSON.stringify({
      type: 'page_leave',
      data: {
        sessionId,
        pageUrl: window.location.href,
        duration,
        scrollDepth: maxScroll
      }
    }));
  });

  // Expose tracking function
  window.scrngTrack = function(eventType, eventData) {
    navigator.sendBeacon('/api/analytics/track', JSON.stringify({
      type: 'event',
      data: {
        sessionId,
        eventType,
        eventData,
        pageUrl: window.location.href
      }
    }));
  };
})();
`;

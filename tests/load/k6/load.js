/**
 * Load Test
 * Standard load test with ramping users simulating realistic traffic
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const pageViews = new Counter('page_views');
const apiCalls = new Counter('api_calls');
const searchLatency = new Trend('search_latency');
const postsLatency = new Trend('posts_latency');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 50 }, // Ramp up to 50 users
    { duration: '5m', target: 100 }, // Ramp up to 100 users
    { duration: '2m', target: 50 }, // Ramp down to 50
    { duration: '2m', target: 0 }, // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% under 1 second
    http_req_failed: ['rate<0.05'], // Less than 5% failures
    errors: ['rate<0.05'],
    search_latency: ['p(95)<800'],
    posts_latency: ['p(95)<600'],
  },
};

// Test data
const searchTerms = [
  'creative',
  'art',
  'music',
  'video',
  'design',
  'photography',
  'writing',
  'podcast',
  'tutorial',
  'review',
];

// eslint-disable-next-line import/no-anonymous-default-export
export default function () {
  // Scenario distribution based on typical user behavior
  const scenario = Math.random();

  if (scenario < 0.4) {
    // 40% - Browse homepage and posts
    browseContent();
  } else if (scenario < 0.7) {
    // 30% - Search
    searchContent();
  } else if (scenario < 0.85) {
    // 15% - View dashboard (authenticated)
    viewDashboard();
  } else {
    // 15% - API calls
    apiOperations();
  }
}

function browseContent() {
  group('Browse Content', () => {
    // Homepage
    const homeRes = http.get(`${BASE_URL}/`);
    pageViews.add(1);

    check(homeRes, {
      'homepage status 200': (r) => r.status === 200,
    });

    sleep(randomIntBetween(1, 3));

    // Browse posts
    const postsRes = http.get(`${BASE_URL}/api/posts?limit=10`);
    postsLatency.add(postsRes.timings.duration);
    apiCalls.add(1);

    const postsCheck = check(postsRes, {
      'posts list status': (r) => r.status === 200 || r.status === 401,
      'posts returns JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!postsCheck);

    sleep(randomIntBetween(2, 5));
  });
}

function searchContent() {
  group('Search Content', () => {
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    // Search page
    const searchPageRes = http.get(`${BASE_URL}/search?q=${term}`);
    pageViews.add(1);

    check(searchPageRes, {
      'search page loads': (r) => r.status === 200,
    });

    sleep(randomIntBetween(1, 2));

    // Search API
    const searchRes = http.get(`${BASE_URL}/api/search?q=${term}&limit=20`);
    searchLatency.add(searchRes.timings.duration);
    apiCalls.add(1);

    const searchCheck = check(searchRes, {
      'search API status': (r) => r.status === 200 || r.status === 401,
      'search returns results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.results !== undefined || body.data !== undefined;
        } catch {
          return r.status === 401;
        }
      },
    });

    errorRate.add(!searchCheck);

    // Maybe search with filters
    if (Math.random() > 0.5) {
      const filteredRes = http.get(`${BASE_URL}/api/search?q=${term}&type=video&limit=10`);
      searchLatency.add(filteredRes.timings.duration);
      apiCalls.add(1);
    }

    sleep(randomIntBetween(2, 4));
  });
}

function viewDashboard() {
  group('View Dashboard', () => {
    // Dashboard page (may redirect to login)
    const dashRes = http.get(`${BASE_URL}/dashboard`);
    pageViews.add(1);

    check(dashRes, {
      'dashboard responds': (r) => [200, 302, 401, 403].includes(r.status),
    });

    sleep(randomIntBetween(2, 4));

    // Try settings
    http.get(`${BASE_URL}/dashboard/settings`);
    pageViews.add(1);

    sleep(randomIntBetween(1, 2));
  });
}

function apiOperations() {
  group('API Operations', () => {
    // Health check
    const healthRes = http.get(`${BASE_URL}/api/health`);
    apiCalls.add(1);

    check(healthRes, {
      'health check OK': (r) => r.status === 200,
    });

    sleep(randomIntBetween(1, 2));

    // Categories
    const categoriesRes = http.get(`${BASE_URL}/api/categories`);
    apiCalls.add(1);

    check(categoriesRes, {
      'categories responds': (r) => [200, 401, 404].includes(r.status),
    });

    sleep(randomIntBetween(1, 2));
  });
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data),
    'load-results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  let out = `\n Load Test Summary\n==================\n\n`;

  out += `Total Requests: ${data.metrics.http_reqs?.values.count || 0}\n`;
  out += `Page Views: ${data.metrics.page_views?.values.count || 0}\n`;
  out += `API Calls: ${data.metrics.api_calls?.values.count || 0}\n\n`;

  out += `Response Time (avg): ${Math.round(data.metrics.http_req_duration?.values.avg || 0)}ms\n`;
  out += `Response Time (p95): ${Math.round(data.metrics.http_req_duration?.values['p(95)'] || 0)}ms\n`;
  out += `Error Rate: ${Math.round((data.metrics.http_req_failed?.values.rate || 0) * 100)}%\n`;

  const thresholdsPassed = Object.values(data.metrics).every(
    (m) => !m.thresholds || Object.values(m.thresholds).every((t) => t.ok)
  );
  out += `\nAll Thresholds Passed: ${thresholdsPassed}\n`;

  return out;
}

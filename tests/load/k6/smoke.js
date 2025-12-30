/**
 * Smoke Test
 * Basic sanity check that the system is responding
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const homepageLatency = new Trend('homepage_latency');
const apiLatency = new Trend('api_latency');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 1, // Single user
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'], // Less than 1% failures
    errors: ['rate<0.01'],
  },
};

// eslint-disable-next-line import/no-anonymous-default-export
export default function () {
  // Test homepage
  const homeRes = http.get(`${BASE_URL}/`);
  homepageLatency.add(homeRes.timings.duration);

  const homeCheck = check(homeRes, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage has content': (r) => r.body && r.body.length > 0,
    'homepage loads fast': (r) => r.timings.duration < 500,
  });

  errorRate.add(!homeCheck);
  sleep(1);

  // Test API health endpoint
  const healthRes = http.get(`${BASE_URL}/api/health`);
  apiLatency.add(healthRes.timings.duration);

  const healthCheck = check(healthRes, {
    'health endpoint is 200': (r) => r.status === 200,
    'health returns JSON': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'ok' || body.healthy === true;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!healthCheck);
  sleep(1);

  // Test search endpoint
  const searchRes = http.get(`${BASE_URL}/api/search?q=test`);
  apiLatency.add(searchRes.timings.duration);

  const searchCheck = check(searchRes, {
    'search endpoint responds': (r) => r.status === 200 || r.status === 401,
    'search returns JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return r.status === 401; // Unauthorized is acceptable for smoke
      }
    },
  });

  errorRate.add(!searchCheck);
  sleep(1);

  // Test static assets
  const faviconRes = http.get(`${BASE_URL}/favicon.ico`);
  check(faviconRes, {
    'favicon loads': (r) => r.status === 200,
  });
  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'smoke-results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  let out = `\n${indent}Smoke Test Summary\n${indent}==================\n\n`;

  out += `${indent}Requests: ${data.metrics.http_reqs.values.count}\n`;
  out += `${indent}Duration: ${Math.round(data.metrics.http_req_duration.values.avg)}ms avg\n`;
  out += `${indent}Failed: ${Math.round(data.metrics.http_req_failed.values.rate * 100)}%\n`;

  out += `\n${indent}All checks passed: ${data.root_group.checks.every((c) => c.passes > 0 && c.fails === 0)}\n`;

  return out;
}

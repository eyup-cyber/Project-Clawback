/**
 * Stress Test
 * Push the system to find breaking points
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const requests = new Counter('requests');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '2m', target: 50 }, // Warm up
    { duration: '3m', target: 100 }, // Normal load
    { duration: '3m', target: 200 }, // Stress begins
    { duration: '3m', target: 300 }, // High stress
    { duration: '3m', target: 400 }, // Breaking point
    { duration: '2m', target: 200 }, // Recovery
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // More lenient for stress
    http_req_failed: ['rate<0.15'], // Allow up to 15% failures
    errors: ['rate<0.15'],
  },
};

// High-load scenarios
const scenarios = {
  homepage: {
    exec: () => http.get(`${BASE_URL}/`),
    weight: 0.3,
  },
  search: {
    exec: () => http.get(`${BASE_URL}/api/search?q=test&limit=50`),
    weight: 0.25,
  },
  postsList: {
    exec: () => http.get(`${BASE_URL}/api/posts?limit=20`),
    weight: 0.2,
  },
  dashboard: {
    exec: () => http.get(`${BASE_URL}/dashboard`),
    weight: 0.15,
  },
  health: {
    exec: () => http.get(`${BASE_URL}/api/health`),
    weight: 0.1,
  },
};

// eslint-disable-next-line import/no-anonymous-default-export
export default function () {
  // Select scenario based on weights
  const rand = Math.random();
  let cumulative = 0;
  let selectedScenario = 'homepage';

  for (const [name, scenario] of Object.entries(scenarios)) {
    cumulative += scenario.weight;
    if (rand <= cumulative) {
      selectedScenario = name;
      break;
    }
  }

  group(selectedScenario, () => {
    const start = Date.now();
    const res = scenarios[selectedScenario].exec();
    const duration = Date.now() - start;

    requestDuration.add(duration);
    requests.add(1);

    const success = check(res, {
      'status is not 5xx': (r) => r.status < 500,
      'response time acceptable': (r) => r.timings.duration < 5000,
    });

    errorRate.add(!success);
  });

  // Minimal sleep to increase load
  sleep(0.1 + Math.random() * 0.4);
}

// Spike test variant
export function spike() {
  http.batch([
    ['GET', `${BASE_URL}/`],
    ['GET', `${BASE_URL}/api/health`],
    ['GET', `${BASE_URL}/api/search?q=test`],
    ['GET', `${BASE_URL}/api/posts`],
    ['GET', `${BASE_URL}/dashboard`],
  ]);

  sleep(0.5);
}

export function handleSummary(data) {
  const duration = data.metrics.http_req_duration?.values || {};
  const errors = data.metrics.http_req_failed?.values?.rate || 0;

  let assessment = 'healthy';
  if (duration['p(95)'] > 2000 || errors > 0.05) assessment = 'degraded';
  if (duration['p(95)'] > 5000 || errors > 0.15) assessment = 'failing';

  return {
    stdout: `
Stress Test Summary
===================

Total Requests: ${data.metrics.http_reqs?.values.count || 0}
Max VUs: ${data.metrics.vus_max?.values.max || 0}

Response Times:
  avg: ${Math.round(duration.avg || 0)}ms
  p50: ${Math.round(duration['p(50)'] || 0)}ms
  p95: ${Math.round(duration['p(95)'] || 0)}ms
  p99: ${Math.round(duration['p(99)'] || 0)}ms
  max: ${Math.round(duration.max || 0)}ms

Error Rate: ${Math.round(errors * 100)}%

System Assessment: ${assessment.toUpperCase()}

${assessment === 'healthy' ? '✅ System handled stress well' : ''}
${assessment === 'degraded' ? '⚠️ Performance degraded under load' : ''}
${assessment === 'failing' ? '❌ System failed under stress' : ''}
`,
    'stress-results.json': JSON.stringify(data, null, 2),
  };
}

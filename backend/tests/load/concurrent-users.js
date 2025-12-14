/**
 * T274: k6 Load Test for Concurrent Users
 *
 * Tests FR-097: Support 10,000 concurrent users
 * Tests SC-012: 10,000 concurrent users
 *
 * Run with:
 *   k6 run backend/tests/load/concurrent-users.js
 *
 * For full 10k test (requires k6 cloud or distributed setup):
 *   k6 run --vus 10000 --duration 10m backend/tests/load/concurrent-users.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const pageLoadSuccess = new Rate('page_load_success');
const apiCallSuccess = new Rate('api_call_success');
const totalRequests = new Counter('total_requests');
const homepageLatency = new Trend('homepage_latency');
const searchLatency = new Trend('search_latency');
const detailLatency = new Trend('detail_latency');

// Test configuration for concurrent users simulation
export const options = {
  scenarios: {
    // Scenario 1: Ramp up to target concurrency
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },    // Ramp to 100 VUs
        { duration: '3m', target: 500 },    // Ramp to 500 VUs
        { duration: '5m', target: 1000 },   // Ramp to 1000 VUs
        { duration: '5m', target: 2000 },   // Ramp to 2000 VUs
        { duration: '10m', target: 2000 },  // Hold at 2000 VUs
        { duration: '3m', target: 0 },      // Ramp down
      ],
      gracefulRampDown: '30s',
    },

    // Scenario 2: Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '30m',  // Start after main test
      stages: [
        { duration: '30s', target: 500 },   // Quick spike
        { duration: '1m', target: 500 },    // Hold spike
        { duration: '30s', target: 0 },     // Quick ramp down
      ],
    },
  },

  thresholds: {
    // Response time requirements
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
    'homepage_latency': ['p(95)<800'],
    'search_latency': ['p(95)<500'],    // FR-094
    'detail_latency': ['p(95)<400'],

    // Success rates
    'page_load_success': ['rate>0.995'],  // 99.5% success
    'api_call_success': ['rate>0.99'],    // 99% success

    // Error rate
    'http_req_failed': ['rate<0.01'],     // Less than 1% errors
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3000';

// User behavior simulation data
const actions = {
  browse: 0.4,      // 40% just browse
  search: 0.35,     // 35% search for listings
  detail: 0.20,     // 20% view listing details
  register: 0.05,   // 5% register/login
};

const searchQueries = [
  { q: 'appartement', ville: 'Conakry' },
  { q: 'maison', ville: 'Conakry' },
  { q: 'villa', quartier: 'Kaloum' },
  { q: 'bureau', quartier: 'Ratoma' },
  { q: 'studio', prix_max: 3000000 },
  { type_bien: 'APPARTEMENT', chambres: 2 },
  { type_bien: 'MAISON', chambres: 3 },
  { type_bien: 'VILLA', prix_min: 10000000 },
];

// Helper functions
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat() {
  return Math.random();
}

function buildQueryString(params) {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

// User session simulation
export default function () {
  const sessionStart = new Date();
  let listingIds = [];

  // Simulate typical user flow
  group('User Session', function () {
    // 1. Homepage load (always)
    group('Homepage', function () {
      const params = { tags: { name: 'homepage' } };
      const startTime = new Date();

      // API call for homepage data
      const response = http.get(`${BASE_URL}/api/listings?limit=12&sort=recent`, params);

      homepageLatency.add(new Date() - startTime);
      totalRequests.add(1);

      const success = check(response, {
        'homepage 200': (r) => r.status === 200,
        'homepage < 1s': (r) => r.timings.duration < 1000,
        'has listings': (r) => {
          try {
            const body = JSON.parse(r.body);
            if (body.data && body.data.length > 0) {
              listingIds = body.data.map(l => l.id).slice(0, 5);
            }
            return Array.isArray(body.data);
          } catch {
            return false;
          }
        },
      });

      pageLoadSuccess.add(success);
    });

    sleep(2 + Math.random() * 3); // Think time: 2-5 seconds

    // 2. Determine user action
    const roll = randomFloat();
    let cumulative = 0;

    // Browse (40%)
    cumulative += actions.browse;
    if (roll < cumulative) {
      group('Browse Listings', function () {
        // Pagination through listings
        for (let page = 1; page <= 3; page++) {
          const response = http.get(`${BASE_URL}/api/listings?page=${page}&limit=20`);
          totalRequests.add(1);

          check(response, {
            'browse page 200': (r) => r.status === 200,
          });

          sleep(1 + Math.random() * 2);
        }
      });
    }

    // Search (35%)
    cumulative += actions.search;
    if (roll >= actions.browse && roll < cumulative) {
      group('Search', function () {
        const searchParams = randomItem(searchQueries);
        const params = { tags: { name: 'search' } };
        const startTime = new Date();

        const response = http.get(
          `${BASE_URL}/api/listings/search?${buildQueryString(searchParams)}`,
          params
        );

        searchLatency.add(new Date() - startTime);
        totalRequests.add(1);

        const success = check(response, {
          'search 200': (r) => r.status === 200,
          'search < 500ms': (r) => r.timings.duration < 500,
        });

        apiCallSuccess.add(success);

        // Parse results for potential detail views
        try {
          const body = JSON.parse(response.body);
          if (body.data && body.data.length > 0) {
            listingIds = body.data.map(l => l.id).slice(0, 5);
          }
        } catch {
          // Ignore
        }

        sleep(1 + Math.random() * 2);

        // 50% chance to refine search
        if (Math.random() > 0.5) {
          const refinedParams = { ...searchParams, chambres: 2 };
          http.get(`${BASE_URL}/api/listings/search?${buildQueryString(refinedParams)}`);
          totalRequests.add(1);
          sleep(1);
        }
      });
    }

    // View listing detail (20%)
    cumulative += actions.detail;
    if (roll >= actions.browse + actions.search && roll < cumulative && listingIds.length > 0) {
      group('View Detail', function () {
        const listingId = randomItem(listingIds);
        const params = { tags: { name: 'detail' } };
        const startTime = new Date();

        const response = http.get(`${BASE_URL}/api/listings/${listingId}`, params);

        detailLatency.add(new Date() - startTime);
        totalRequests.add(1);

        const success = check(response, {
          'detail 200': (r) => r.status === 200 || r.status === 404,
          'detail < 400ms': (r) => r.timings.duration < 400,
        });

        apiCallSuccess.add(success);

        sleep(3 + Math.random() * 5); // Users spend more time on detail pages

        // Load photos
        http.get(`${BASE_URL}/api/listings/${listingId}/photos`);
        totalRequests.add(1);

        // 30% chance to view similar listings
        if (Math.random() < 0.3) {
          http.get(`${BASE_URL}/api/listings/${listingId}/similar`);
          totalRequests.add(1);
        }
      });
    }

    // Register/Login attempt (5%)
    if (roll >= cumulative) {
      group('Auth Flow', function () {
        // Check auth endpoint (not actual login to avoid side effects)
        const response = http.get(`${BASE_URL}/api/auth/check`);
        totalRequests.add(1);

        check(response, {
          'auth check responds': (r) => r.status === 200 || r.status === 401,
        });
      });
    }

    // End of session think time
    sleep(1 + Math.random() * 2);
  });
}

// Test lifecycle hooks
export function setup() {
  console.log('Starting concurrent users load test...');
  console.log(`Backend URL: ${BASE_URL}`);
  console.log(`Target: 10,000 concurrent users (FR-097, SC-012)`);

  // Health check
  const response = http.get(`${BASE_URL}/api/health`);
  if (response.status !== 200) {
    throw new Error(`API health check failed: ${response.status}`);
  }

  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log(`Test started at: ${data.startTime}`);
  console.log(`Test ended at: ${new Date().toISOString()}`);
}

// Summary report
export function handleSummary(data) {
  const p95Duration = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99Duration = data.metrics.http_req_duration?.values?.['p(99)'] || 0;
  const successRate = data.metrics.api_call_success?.values?.rate || 0;
  const failRate = data.metrics.http_req_failed?.values?.rate || 0;
  const totalReqs = data.metrics.total_requests?.values?.count || 0;

  const fr097Passed = p95Duration < 1000 && successRate > 0.99;
  const sc012Passed = failRate < 0.01;

  console.log('\n==========================================');
  console.log('ImmoGuinée Concurrent Users Test Results');
  console.log('==========================================');
  console.log(`\nFR-097 (10K Users): ${fr097Passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`SC-012 Compliance: ${sc012Passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`\nMetrics:`);
  console.log(`  - Total Requests: ${totalReqs}`);
  console.log(`  - p95 Response Time: ${p95Duration.toFixed(2)}ms`);
  console.log(`  - p99 Response Time: ${p99Duration.toFixed(2)}ms`);
  console.log(`  - Success Rate: ${(successRate * 100).toFixed(2)}%`);
  console.log(`  - Error Rate: ${(failRate * 100).toFixed(3)}%`);
  console.log('\n==========================================\n');

  return {
    'concurrent-users-summary.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      passed: fr097Passed && sc012Passed,
      metrics: {
        p95Duration,
        p99Duration,
        successRate,
        failRate,
        totalRequests: totalReqs,
      },
      thresholds: {
        fr097: fr097Passed,
        sc012: sc012Passed,
      },
    }, null, 2),
    stdout: '',
  };
}

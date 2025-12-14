/**
 * T273: k6 Load Test for Elasticsearch Search Performance
 *
 * Tests FR-094: API response time <500ms at p95
 *
 * Run with:
 *   k6 run backend/tests/load/search-performance.js
 *
 * Or with more VUs:
 *   k6 run --vus 50 --duration 5m backend/tests/load/search-performance.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const searchSuccessRate = new Rate('search_success_rate');
const searchDuration = new Trend('search_duration');
const filterSearchDuration = new Trend('filter_search_duration');
const geoSearchDuration = new Trend('geo_search_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 25 },    // Ramp up to 25 users
    { duration: '2m', target: 50 },    // Ramp up to 50 users
    { duration: '3m', target: 50 },    // Stay at 50 users
    { duration: '1m', target: 100 },   // Peak load
    { duration: '2m', target: 100 },   // Stay at peak
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // FR-094: 95% of requests should be under 500ms
    'http_req_duration{type:search}': ['p(95)<500'],
    'http_req_duration{type:filter}': ['p(95)<500'],
    'http_req_duration{type:geo}': ['p(95)<600'],  // Geo queries slightly more expensive

    // Success rate should be above 99%
    'search_success_rate': ['rate>0.99'],

    // Overall p99 should be under 1 second
    'http_req_duration': ['p(99)<1000'],
  },
};

// Base URL - configurable via environment
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Sample search terms for Guinea real estate
const searchTerms = [
  'appartement',
  'maison',
  'villa',
  'bureau',
  'studio',
  'Kaloum',
  'Ratoma',
  'Matam',
  'Dixinn',
  'Conakry',
];

// Property types
const propertyTypes = [
  'APPARTEMENT',
  'MAISON',
  'STUDIO',
  'VILLA',
  'BUREAU',
  'MAGASIN',
  'TERRAIN',
  'DUPLEX',
];

// Price ranges in GNF
const priceRanges = [
  { min: 500000, max: 2000000 },
  { min: 2000000, max: 5000000 },
  { min: 5000000, max: 10000000 },
  { min: 10000000, max: 50000000 },
];

// Guinea coordinates (Conakry area)
const geoPoints = [
  { lat: 9.6412, lon: -13.5784 },  // Kaloum
  { lat: 9.5519, lon: -13.6802 },  // Ratoma
  { lat: 9.5823, lon: -13.6108 },  // Matam
  { lat: 9.6208, lon: -13.6189 },  // Dixinn
];

// Helper to get random item from array
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to get random integer
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function () {
  // Test different search scenarios
  group('Basic Text Search', function () {
    const query = randomItem(searchTerms);
    const params = {
      tags: { type: 'search' },
    };

    const startTime = new Date();
    const response = http.get(`${BASE_URL}/api/listings/search?q=${encodeURIComponent(query)}`, params);
    const duration = new Date() - startTime;

    searchDuration.add(duration);

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'has results array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    });

    searchSuccessRate.add(success);
  });

  sleep(randomInt(1, 3)); // Random wait between 1-3 seconds

  group('Filtered Search', function () {
    const type = randomItem(propertyTypes);
    const priceRange = randomItem(priceRanges);
    const params = {
      tags: { type: 'filter' },
    };

    const url = `${BASE_URL}/api/listings/search?type_bien=${type}&prix_min=${priceRange.min}&prix_max=${priceRange.max}&chambres=${randomInt(1, 5)}`;

    const startTime = new Date();
    const response = http.get(url, params);
    const duration = new Date() - startTime;

    filterSearchDuration.add(duration);

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'has pagination': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.meta && typeof body.meta.total === 'number';
        } catch {
          return false;
        }
      },
    });

    searchSuccessRate.add(success);
  });

  sleep(randomInt(1, 2));

  group('Geo Search', function () {
    const point = randomItem(geoPoints);
    const radiusKm = randomItem([1, 2, 5, 10]);
    const params = {
      tags: { type: 'geo' },
    };

    const url = `${BASE_URL}/api/listings/search?lat=${point.lat}&lon=${point.lon}&radius=${radiusKm}`;

    const startTime = new Date();
    const response = http.get(url, params);
    const duration = new Date() - startTime;

    geoSearchDuration.add(duration);

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 600ms': (r) => r.timings.duration < 600,
      'returns geo results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    });

    searchSuccessRate.add(success);
  });

  sleep(randomInt(1, 3));

  group('Combined Search', function () {
    const query = randomItem(searchTerms);
    const type = randomItem(propertyTypes);
    const point = randomItem(geoPoints);
    const params = {
      tags: { type: 'search' },
    };

    const url = `${BASE_URL}/api/listings/search?q=${encodeURIComponent(query)}&type_bien=${type}&lat=${point.lat}&lon=${point.lon}&radius=5&sort=prix_asc`;

    const startTime = new Date();
    const response = http.get(url, params);
    const duration = new Date() - startTime;

    searchDuration.add(duration);

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    searchSuccessRate.add(success);
  });

  sleep(randomInt(2, 4));

  group('Listing Detail', function () {
    // First get a listing from search
    const searchResponse = http.get(`${BASE_URL}/api/listings/search?limit=1`);

    if (searchResponse.status === 200) {
      try {
        const body = JSON.parse(searchResponse.body);
        if (body.data && body.data.length > 0) {
          const listingId = body.data[0].id;
          const params = {
            tags: { type: 'detail' },
          };

          const response = http.get(`${BASE_URL}/api/listings/${listingId}`, params);

          check(response, {
            'detail status is 200': (r) => r.status === 200,
            'detail response time < 300ms': (r) => r.timings.duration < 300,
            'has listing data': (r) => {
              try {
                const data = JSON.parse(r.body);
                return data.data && data.data.id;
              } catch {
                return false;
              }
            },
          });
        }
      } catch {
        // Ignore parse errors
      }
    }
  });

  sleep(randomInt(1, 2));
}

// Summary at the end of the test
export function handleSummary(data) {
  const p95Duration = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99Duration = data.metrics.http_req_duration?.values?.['p(99)'] || 0;
  const successRate = data.metrics.search_success_rate?.values?.rate || 0;

  const passed = p95Duration < 500 && successRate > 0.99;

  console.log('\n========================================');
  console.log('ImmoGuinée Search Performance Test Results');
  console.log('========================================');
  console.log(`\nFR-094 Compliance: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`\nMetrics:`);
  console.log(`  - p95 Response Time: ${p95Duration.toFixed(2)}ms (target: <500ms)`);
  console.log(`  - p99 Response Time: ${p99Duration.toFixed(2)}ms (target: <1000ms)`);
  console.log(`  - Success Rate: ${(successRate * 100).toFixed(2)}% (target: >99%)`);
  console.log('\n========================================\n');

  return {
    'summary.json': JSON.stringify(data, null, 2),
    stdout: '',
  };
}

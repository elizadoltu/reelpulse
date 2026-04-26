/**
 * analytics-load.js
 *
 * Simulates realistic read traffic across the full service-a API surface:
 * health check → login → list movies → fetch movie detail → fetch comments
 *
 * Stages: ramp 10 (30s) → sustain 50 (1m) → spike 100 (30s) → ramp down (30s)
 * Thresholds: p(95) < 2000ms, http_req_failed < 5%
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';

// 404 is an expected response for movies/comments — only 5xx / network errors
// should increment http_req_failed.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 299 }, 404));

export const options = {
  stages: [
    { duration: '30s', target: 10  },  // ramp up
    { duration: '1m',  target: 50  },  // sustain
    { duration: '30s', target: 100 },  // spike
    { duration: '30s', target: 0   },  // ramp down
  ],
  thresholds: {
    http_req_duration:          ['p(95)<2000'],
    http_req_failed:            ['rate<0.05'],
    'http_req_duration{name:getMovies}':  ['p(95)<2000'],
    'http_req_duration{name:getMovie}':   ['p(95)<2000'],
    'http_req_duration{name:getComments}':['p(95)<2000'],
  },
};

const BASE_URL = __ENV.SERVICE_A_URL || 'http://localhost:3001';
const API      = `${BASE_URL}/api/v1`;

// Representative sample_mflix ObjectIds
const MOVIE_IDS = [
  '573a1390f29313caabcd4135',
  '573a1390f29313caabcd42e8',
  '573a1390f29313caabcd4b86',
  '573a1390f29313caabcd4ef0',
  '573a1391f29313caabcd6758',
  '573a1391f29313caabcd7a72',
  '573a1391f29313caabcd84e8',
  '573a1392f29313caabcd9f4e',
  '573a1393f29313caabcdac1a',
  '573a1394f29313caabcde29a',
];

const JSON_HEADERS = { Accept: 'application/json' };

// ---------------------------------------------------------------------------
// setup: verify the service is reachable and capture a token for auth'd calls
// ---------------------------------------------------------------------------
export function setup() {
  const health = http.get(`${API}/health`);
  check(health, { 'health ok': (r) => r.status === 200 });

  const loginRes = http.post(
    `${API}/login`,
    JSON.stringify({ email: __ENV.TEST_EMAIL, password: __ENV.TEST_PASSWORD }),
    { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
  );

  const token = loginRes.status === 200 ? loginRes.json('token') : null;
  if (!token) console.warn('Login failed — auth-required endpoints will be skipped');
  return { token };
}

// ---------------------------------------------------------------------------
// default: realistic read journey
// ---------------------------------------------------------------------------
export default function ({ token }) {
  const movieId = MOVIE_IDS[Math.floor(Math.random() * MOVIE_IDS.length)];
  const authHeaders = token
    ? { ...JSON_HEADERS, Authorization: `Bearer ${token}` }
    : JSON_HEADERS;

  // ── 1. health check ───────────────────────────────────────────────────────
  group('health', () => {
    const r = http.get(`${API}/health`, { headers: JSON_HEADERS, tags: { name: 'health' } });
    check(r, { 'health 200': (res) => res.status === 200 });
  });

  sleep(0.5);

  // ── 2. list movies (page 1) ───────────────────────────────────────────────
  group('list movies', () => {
    const r = http.get(`${API}/movies?page=1&pageSize=20`, {
      headers: JSON_HEADERS,
      tags: { name: 'getMovies' },
    });
    check(r, {
      'movies 200':   (res) => res.status === 200,
      'has data':     (res) => { try { return Array.isArray(JSON.parse(res.body).data); } catch { return false; } },
    });
  });

  sleep(0.5);

  // ── 3. fetch movie detail (also triggers MovieViewedEvent → Pub/Sub → BQ) ─
  group('movie detail', () => {
    const r = http.get(`${API}/movies/${movieId}`, {
      headers: JSON_HEADERS,
      tags: { name: 'getMovie' },
    });
    check(r, {
      'movie 200 or 404': (res) => res.status === 200 || res.status === 404,
    });
  });

  sleep(0.5);

  // ── 4. fetch comments for the same movie ─────────────────────────────────
  group('comments', () => {
    const r = http.get(`${API}/movies/${movieId}/comments?page=1&pageSize=20`, {
      headers: authHeaders,
      tags: { name: 'getComments' },
    });
    check(r, { 'comments 200 or 404': (res) => res.status === 200 || res.status === 404 });
  });

  sleep(1);
}

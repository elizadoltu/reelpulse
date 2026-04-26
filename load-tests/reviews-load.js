import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
const rateLimitedCount = new Counter('rate_limited_429');
const e2eLatency = new Trend('review_e2e_latency_ms', true);
const consistencyWindow = new Trend('review_consistency_window_ms', true);

// Tell k6 that 202 and 429 are both expected — only 5xx / network errors
// will increment http_req_failed.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 202 }, 429));

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // ramp up — intentionally drives >60 req/min
    { duration: '1m',  target: 40 },  // sustain — triggers rate limiting
    { duration: '30s', target: 0 },   // ramp down
  ],
  thresholds: {
    // Only real failures (5xx, network errors) should stay below 5%
    http_req_failed: ['rate<0.05'],
    // 429s tracked separately via custom counter (shown in summary)
    // End-to-end latency for reviews that reach "processed"
    'review_e2e_latency_ms': ['p(95)<30000'],
  },
};

const BASE_URL = __ENV.SERVICE_A_URL || 'http://localhost:3001';
const API = `${BASE_URL}/api/v1`;

// Representative sample of movie IDs from sample_mflix
const MOVIE_IDS = [
  '573a1390f29313caabcd4135',
  '573a1390f29313caabcd42e8',
  '573a1390f29313caabcd4b86',
  '573a1391f29313caabcd6758',
  '573a1392f29313caabcd9f4e',
];

const REVIEW_TEXTS = [
  'An absolutely stunning piece of cinema that left me breathless.',
  'A slow-burning thriller that keeps you on the edge of your seat.',
  'Brilliant performances elevate an already compelling script.',
  'The cinematography is gorgeous but the pacing drags in the second act.',
  'One of the finest films of the decade — essential viewing.',
];

// ---------------------------------------------------------------------------
// setup: obtain a JWT for authenticated requests
// ---------------------------------------------------------------------------
export function setup() {
  const email = __ENV.TEST_EMAIL || 'test@reelpulse.dev';
  const password = __ENV.TEST_PASSWORD || 'testpassword123';

  const res = http.post(
    `${API}/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (res.status !== 200) {
    console.error(`Login failed (${res.status}): ${res.body}`);
    return { token: null };
  }

  const token = res.json('token');
  console.log('Login succeeded, token acquired.');
  return { token };
}

// ---------------------------------------------------------------------------
// default: submit a review, poll for processed status
// ---------------------------------------------------------------------------
export default function (data) {
  const { token } = data;
  if (!token) { sleep(1); return; }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const movieId = MOVIE_IDS[Math.floor(Math.random() * MOVIE_IDS.length)];
  const text = REVIEW_TEXTS[Math.floor(Math.random() * REVIEW_TEXTS.length)];

  // ── Submit review ──────────────────────────────────────────────────────────
  const submitStart = Date.now();
  const submitRes = http.post(
    `${API}/movies/${movieId}/reviews`,
    JSON.stringify({ text }),
    { headers: authHeaders, tags: { name: 'submitReview' } },
  );

  if (submitRes.status === 429) {
    rateLimitedCount.add(1);
    check(submitRes, { '429 rate limited (expected)': (r) => r.status === 429 });
    sleep(2);
    return;
  }

  const accepted = check(submitRes, {
    'review accepted (202)': (r) => r.status === 202,
    'has reviewId': (r) => {
      try { return Boolean(JSON.parse(r.body).reviewId); } catch { return false; }
    },
  });

  if (!accepted) { sleep(1); return; }

  const submitEnd = Date.now();
  let reviewId;
  try {
    reviewId = JSON.parse(submitRes.body).reviewId;
  } catch {
    sleep(1);
    return;
  }

  // ── Poll for processed status (consistency window) ─────────────────────────
  let processed = false;
  const POLL_INTERVAL_S = 2;
  const MAX_POLLS = 15; // max 30s total

  for (let i = 0; i < MAX_POLLS; i++) {
    sleep(POLL_INTERVAL_S);

    const statusRes = http.get(
      `${API}/movies/${movieId}/reviews/${reviewId}/status`,
      { headers: authHeaders, tags: { name: 'pollReviewStatus' } },
    );

    if (statusRes.status !== 200) continue;

    let body;
    try { body = JSON.parse(statusRes.body); } catch { continue; }

    if (body.status === 'processed') {
      processed = true;
      const pollEnd = Date.now();

      // e2e latency: from submit POST start to confirmed processed
      e2eLatency.add(pollEnd - submitStart);

      // consistency window: from 202 response to Firestore update visible
      consistencyWindow.add(pollEnd - submitEnd);
      break;
    }
  }

  check(null, { 'review processed within window': () => processed });
}

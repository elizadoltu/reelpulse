import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.SERVICE_A_URL || 'http://localhost:3001';

export default function () {
  const movieId = 'tt0109830';
  const payload = JSON.stringify({
    userId: `user-${Math.floor(Math.random() * 1000)}`,
    rating: Math.floor(Math.random() * 5) + 1,
    text: 'Great movie! Really enjoyed it.',
  });

  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post(`${BASE_URL}/movies/${movieId}/reviews`, payload, params);

  check(res, {
    'status is 202 (accepted) or 429 (rate limited)': (r) =>
      r.status === 202 || r.status === 429,
  });

  sleep(0.5);
}

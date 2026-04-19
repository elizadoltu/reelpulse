import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.SERVICE_A_URL || 'http://localhost:3001';

export default function () {
  const movieIds = ['tt0109830', 'tt0068646', 'tt0071562', 'tt0468569'];
  const movieId = movieIds[Math.floor(Math.random() * movieIds.length)];

  const res = http.get(`${BASE_URL}/movies/${movieId}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}

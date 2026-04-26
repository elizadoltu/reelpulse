import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from './app.js';

const app = await buildApp();
afterAll(() => app.close());

describe('GET /health', () => {
  it('returns 200 with service name', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', activeConnections: 0 });
  });

  it('allows local frontend origin for CORS requests', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:5173' },
    });

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});

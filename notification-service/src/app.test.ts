import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from './app.js';

const app = await buildApp();
afterAll(() => app.close());

describe('GET /health', () => {
  it('returns 200 with service name', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', service: 'notification-service', version: '1.0.0' });
  });
});

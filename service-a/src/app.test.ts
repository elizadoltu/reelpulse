import { describe, it, expect, afterAll, vi, beforeAll } from 'vitest';
import { buildApp } from './app.js';

vi.mock('@google-cloud/pubsub', () => ({
  PubSub: vi.fn().mockImplementation(() => ({
    topic: vi.fn(),
  })),
}));

beforeAll(() => {
  process.env.PUBSUB_PROJECT_ID = 'test-project';
});

const app = buildApp();
afterAll(() => app.close());

describe('GET /health', () => {
  it('returns 200 with service name', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', service: 'service-a', version: '1.0.1' });
  });
});

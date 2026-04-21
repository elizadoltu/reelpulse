import { describe, it, expect, vi, afterEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { PubSub } from '@google-cloud/pubsub';
import moviesPlugin from './movies.js';

function buildTestApp(publishMessage: ReturnType<typeof vi.fn>): FastifyInstance {
  const app = Fastify({ logger: false });
  app.decorate('pubsub', {
    topic: () => ({ publishMessage }),
  } as unknown as PubSub);
  app.register(moviesPlugin);
  return app;
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('GET /movies/:id', () => {
  let app: FastifyInstance;

  afterEach(() => app.close());

  it('returns 200 even when Pub/Sub publish throws', async () => {
    const publishMessage = vi.fn().mockRejectedValue(new Error('pubsub unavailable'));
    app = buildTestApp(publishMessage);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/movies/1' });
    await flushPromises();

    expect(res.statusCode).toBe(200);
  });

  it('publishes event with correct movieId and genre', async () => {
    let capturedEvent: Record<string, unknown> | undefined;
    const publishMessage = vi.fn().mockImplementation((msg: { data: Buffer }) => {
      capturedEvent = JSON.parse(msg.data.toString()) as Record<string, unknown>;
      return Promise.resolve('msg-id');
    });
    app = buildTestApp(publishMessage);
    await app.ready();

    await app.inject({ method: 'GET', url: '/movies/1' });
    await flushPromises();

    expect(capturedEvent).toMatchObject({ movieId: '1', genre: 'sci-fi' });
  });

  it('returns 404 for unknown movie', async () => {
    const publishMessage = vi.fn().mockResolvedValue('msg-id');
    app = buildTestApp(publishMessage);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/movies/999' });

    expect(res.statusCode).toBe(404);
  });
});

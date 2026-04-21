import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import pubsubPlugin from './pubsub.js';

vi.mock('@google-cloud/pubsub', () => ({
  PubSub: vi.fn().mockImplementation(() => ({
    topic: vi.fn(),
  })),
}));

describe('pubsub plugin', () => {
  let originalProjectId: string | undefined;

  beforeEach(() => {
    originalProjectId = process.env.PUBSUB_PROJECT_ID;
    process.env.PUBSUB_PROJECT_ID = 'test-project';
  });

  afterEach(() => {
    if (originalProjectId === undefined) {
      delete process.env.PUBSUB_PROJECT_ID;
    } else {
      process.env.PUBSUB_PROJECT_ID = originalProjectId;
    }
  });

  it('registers pubsub decorator on the fastify instance', async () => {
    const app = Fastify({ logger: false });
    await app.register(pubsubPlugin);
    await app.ready();
    expect(app.pubsub).toBeDefined();
    await app.close();
  });

  it('passes error to ready callback when PUBSUB_PROJECT_ID is missing', () => {
    return new Promise<void>((resolve, reject) => {
      delete process.env.PUBSUB_PROJECT_ID;
      const app = Fastify({ logger: false });
      app.register(pubsubPlugin);
      app.ready((err) => {
        try {
          expect(err).toBeDefined();
          expect(err?.message).toContain('PUBSUB_PROJECT_ID');
          resolve();
        } catch (assertionError) {
          reject(assertionError);
        }
      });
    });
  });
});

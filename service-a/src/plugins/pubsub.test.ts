import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import pubsubPlugin from './pubsub.ts';

vi.mock('@google-cloud/pubsub', () => ({
  PubSub: vi.fn().mockImplementation(() => ({
    topic: vi.fn(),
  })),
}));

describe('pubsub plugin', () => {
  let savedPubsubProjectId: string | undefined;
  let savedGcpProjectId: string | undefined;

  beforeEach(() => {
    savedPubsubProjectId = process.env.PUBSUB_PROJECT_ID;
    savedGcpProjectId = process.env.GCP_PROJECT_ID;
    process.env.PUBSUB_PROJECT_ID = 'test-project';
    delete process.env.GCP_PROJECT_ID;
  });

  afterEach(() => {
    if (savedPubsubProjectId === undefined) {
      delete process.env.PUBSUB_PROJECT_ID;
    } else {
      process.env.PUBSUB_PROJECT_ID = savedPubsubProjectId;
    }
    if (savedGcpProjectId === undefined) {
      delete process.env.GCP_PROJECT_ID;
    } else {
      process.env.GCP_PROJECT_ID = savedGcpProjectId;
    }
  });

  it('registers pubsub decorator on the fastify instance', async () => {
    const app = Fastify({ logger: false });
    await app.register(pubsubPlugin);
    await app.ready();
    expect(app.pubsub).toBeDefined();
    await app.close();
  });

  it('uses GCP_PROJECT_ID when PUBSUB_PROJECT_ID is not set', async () => {
    delete process.env.PUBSUB_PROJECT_ID;
    process.env.GCP_PROJECT_ID = 'gcp-fallback-project';
    const app = Fastify({ logger: false });
    await app.register(pubsubPlugin);
    await app.ready();
    expect(app.pubsub).toBeDefined();
    await app.close();
  });

  it('passes error to ready callback when neither project ID env var is set', () => {
    return new Promise<void>((resolve, reject) => {
      delete process.env.PUBSUB_PROJECT_ID;
      delete process.env.GCP_PROJECT_ID;
      const app = Fastify({ logger: false });
      app.register(pubsubPlugin);
      app.ready((err) => {
        try {
          expect(err).toBeDefined();
          expect(err?.message).toContain('PUBSUB_PROJECT_ID or GCP_PROJECT_ID');
          resolve();
        } catch (assertionError) {
          reject(assertionError);
        }
      });
    });
  });
});

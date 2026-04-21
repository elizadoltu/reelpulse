import Fastify from 'fastify';
import pubsubPlugin from './plugins/pubsub.js';

export function buildApp() {
  const app = Fastify({ logger: false });

  app.register(pubsubPlugin);

  app.get('/health', async () => ({ status: 'ok', service: 'service-a', version: '1.0.1' }));

  return app;
}

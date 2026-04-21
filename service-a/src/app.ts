import Fastify from 'fastify';
import pubsubPlugin from './plugins/pubsub.js';
import moviesPlugin from './routes/movies.js';

export function buildApp() {
  const app = Fastify({ logger: false });

  app.register(pubsubPlugin);
  app.register(moviesPlugin);

  app.get('/health', async () => ({ status: 'ok', service: 'service-a', version: '1.0.1' }));

  return app;
}

import Fastify from 'fastify';

export function buildApp() {
  const app = Fastify({ logger: false });

  app.get('/health', async () => ({ status: 'ok', service: 'service-a', version: '1.0.0' }));

  return app;
}

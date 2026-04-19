import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';

export async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(fastifyWebsocket);

  app.get('/health', async () => ({ status: 'ok', service: 'notification-service' }));

  app.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, (socket, _req) => {
      socket.on('message', (message: Buffer) => {
        app.log.info(`Received: ${message}`);
      });

      socket.on('close', () => {
        app.log.info('Client disconnected');
      });
    });
  });

  return app;
}

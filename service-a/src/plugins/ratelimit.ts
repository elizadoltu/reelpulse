import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifyRateLimit from '@fastify/rate-limit';

const rateLimitPlugin = fp(
  async (fastify: FastifyInstance) => {
    fastify.register(fastifyRateLimit as unknown as FastifyPluginAsync<{ global: boolean }>, {
      global: false,
    });
  },
  { name: 'ratelimit' },
);

export default rateLimitPlugin;

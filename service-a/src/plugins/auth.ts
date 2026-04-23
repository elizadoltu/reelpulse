import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { HttpMethods, RouteTags } from '../utils/constants/enums.ts';

const allowedMethods = [HttpMethods.OPTIONS, HttpMethods.GET, HttpMethods.HEAD].map((method) =>
  method.valueOf(),
);

const authenticationPlugin = fp(
  async (fastify: FastifyInstance) => {
    fastify.register(fastifyJwt as unknown as FastifyPluginAsync<{ secret: string }>, {
      secret: fastify.config.JWT_SECRET,
    });

    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    });

    fastify.addHook('onRequest', async (request, _reply) => {
      const routeSchema = request.routeOptions.schema;
      const tags = routeSchema?.tags ?? [];
      if (allowedMethods.includes(request.method) || tags.includes(RouteTags.AUTH)) {
        return;
      }
      await request.jwtVerify();
    });
  },
  { name: 'auth', dependencies: ['server-config'] },
);

export default authenticationPlugin;

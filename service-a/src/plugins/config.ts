import fastifyEnv, { type FastifyEnvOptions } from '@fastify/env';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { EnvSchema } from '../schemas/dotenv.ts';

const configOptions: FastifyEnvOptions = {
  confKey: 'config',
  schema: EnvSchema,
  dotenv: true,
  data: process.env,
};

const configPlugin = fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(
      fastifyEnv as unknown as FastifyPluginAsync<FastifyEnvOptions>,
      configOptions,
    );
  },
  { name: 'server-config' },
);

export default configPlugin;

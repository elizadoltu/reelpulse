import type { FastifyInstance } from 'fastify';
import buildInstance from './app';
import autoloadOptions from './swappable-options/autoload-options';
import { cacheOptions } from './swappable-options/cache-options';
import { serverOptions } from './swappable-options/server-options';

const fastifyApp: FastifyInstance = buildInstance(serverOptions, autoloadOptions, cacheOptions);

const port = Number(process.env.PORT) || Number(process.env.APP_PORT) || 3001;

fastifyApp.listen({ host: '0.0.0.0', port }).catch((err: Error) => {
  fastifyApp.log.error(err);
  process.exit(1);
});

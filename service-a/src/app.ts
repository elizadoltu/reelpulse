import Autoload, { type AutoloadPluginOptions } from '@fastify/autoload';
import fastifyCaching, { type FastifyCachingPluginOptions } from '@fastify/caching';
import fastifyCors, { type FastifyCorsOptions } from '@fastify/cors';
import fastifyEtag from '@fastify/etag';
import fastify, {
  type FastifyInstance,
  type FastifyPluginAsync,
  type FastifyServerOptions,
} from 'fastify';

const buildInstance = (
  serverOptions: FastifyServerOptions,
  autoloadPluginsOptions: AutoloadPluginOptions[],
  cachingOptions: FastifyCachingPluginOptions,
): FastifyInstance => {
  const fastifyApp: FastifyInstance = fastify(serverOptions);

  fastifyApp.register(
    fastifyCors as unknown as FastifyPluginAsync<FastifyCorsOptions>,
    {
      origin: ['http://localhost:5173'],
    },
  );

  for (const pluginOptions of autoloadPluginsOptions) {
    fastifyApp.register(Autoload as unknown as FastifyPluginAsync, pluginOptions);
  }

  fastifyApp.register(fastifyCaching as unknown as FastifyPluginAsync, cachingOptions);
  fastifyApp.register(fastifyEtag as unknown as FastifyPluginAsync);

  return fastifyApp;
};

export default buildInstance;

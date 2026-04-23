import Autoload, { type AutoloadPluginOptions } from '@fastify/autoload';
import fastifyCaching, { type FastifyCachingPluginOptions } from '@fastify/caching';
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

  for (const pluginOptions of autoloadPluginsOptions) {
    fastifyApp.register(Autoload as unknown as FastifyPluginAsync, pluginOptions);
  }

  fastifyApp.register(fastifyCaching as unknown as FastifyPluginAsync, cachingOptions);
  fastifyApp.register(fastifyEtag as unknown as FastifyPluginAsync);

  return fastifyApp;
};

export default buildInstance;

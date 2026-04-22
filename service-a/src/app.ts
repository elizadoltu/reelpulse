import pubsubPlugin from './plugins/pubsub.js';
import moviesPlugin from './routes/movies.js';
import Autoload, { type AutoloadPluginOptions } from '@fastify/autoload';
import fastifyCaching, { type FastifyCachingPluginOptions } from '@fastify/caching';
import fastifyEtag from '@fastify/etag';
import fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';

const buildInstance = (
  serverOptions: FastifyServerOptions,
  autoloadPluginsOptions: AutoloadPluginOptions[],
  cachingOptions: FastifyCachingPluginOptions
): FastifyInstance => {
  const fastifyApp: FastifyInstance = fastify(serverOptions);

  for (const pluginOptions of autoloadPluginsOptions) {
    fastifyApp.register(Autoload, pluginOptions);
  }

  fastifyApp.register(pubsubPlugin);
  fastifyApp.register(moviesPlugin);

  fastifyApp.get('/health', async () => ({ status: 'ok', service: 'service-a', version: '1.0.1' }));

  fastifyApp.register(fastifyCaching, cachingOptions);
  fastifyApp.register(fastifyEtag);

  return fastifyApp;
};

export default buildInstance;

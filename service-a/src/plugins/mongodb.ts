import fastifyMongo, { type FastifyMongodbOptions } from '@fastify/mongodb';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const getMongoOptions = async (fastify: FastifyInstance): Promise<FastifyMongodbOptions> => {
  const commonOptions: FastifyMongodbOptions = {
    forceClose: true,
  };

  if (fastify.config.NODE_ENV === 'test') {
    const { default: setupMongoTestcontainers } =
      (await import('../utils/testing/setup-mongo-testcontainers.js')) as unknown as {
        default: () => Promise<FastifyMongodbOptions>;
      };
    const mongoTestcontainersOptions = await setupMongoTestcontainers();
    return {
      ...commonOptions,
      ...mongoTestcontainersOptions,
    };
  }

  return {
    ...commonOptions,
    url: fastify.config.MONGO_URL,
    database: fastify.config.MONGO_DB_NAME,
  };
};

const mongoPlugin = fp(
  async (fastify: FastifyInstance) => {
    const mongoOptions = await getMongoOptions(fastify);
    await fastify.register(
      fastifyMongo as unknown as FastifyPluginAsync<FastifyMongodbOptions>,
      mongoOptions,
    );
    await fastify.mongo.client.db().command({ ping: 1 });
    fastify.log.info('MongoDB connection established');
  },
  { name: 'mongo', dependencies: ['server-config'] },
);

export default mongoPlugin;

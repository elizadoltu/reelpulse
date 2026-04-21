import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { PubSub } from '@google-cloud/pubsub';

declare module 'fastify' {
  interface FastifyInstance {
    pubsub: PubSub;
  }
}

const pubsubPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const projectId = process.env.PUBSUB_PROJECT_ID;
  if (!projectId) {
    throw new Error('PUBSUB_PROJECT_ID environment variable is required');
  }

  const pubsub = new PubSub({ projectId });
  app.decorate('pubsub', pubsub);
};

export default fp(pubsubPlugin, { name: 'pubsub' });

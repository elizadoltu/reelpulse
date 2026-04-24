import { Firestore } from '@google-cloud/firestore';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    firestore: Firestore;
  }
}

const firestorePlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  if (process.env.MOCK_FIRESTORE === 'true') {
    const mock = {
      collection: () => ({
        doc: () => ({
          set: async () => {},
        }),
      }),
    };
    app.decorate('firestore', mock as unknown as Firestore);
    return;
  }

  const projectId = process.env.GCP_PROJECT_ID;
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID environment variable is required for Firestore');
  }

  const firestore = new Firestore({ projectId });
  app.decorate('firestore', firestore);
};

export default fp(firestorePlugin, { name: 'firestore' });

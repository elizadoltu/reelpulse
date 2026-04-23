import type { FastifyServerOptions } from 'fastify';

const isDev = process.env.NODE_ENV !== 'production';

const serverOptions: FastifyServerOptions = {
  caseSensitive: false,
  logger: isDev
    ? {
        level: 'debug',
        transport: {
          target: 'pino-pretty',
        },
      }
    : {
        level: 'info',
      },
  pluginTimeout: 100000,
};

export { serverOptions };

import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyWebsocket, { type WebSocket as FastifyWebSocket } from '@fastify/websocket';
import { startSubscriber, type PubSubSubscription } from './pubsub-subscriber.js';
import { MovieServiceClient } from './types/reelpulse.js';
import * as grpc from '@grpc/grpc-js';

export type ConnectionMap = Map<string, FastifyWebSocket>;

const GRPC_SERVER_ADDR = process.env.SERVICE_A_GRPC_URL || 'localhost:50051';
const movieClient = new MovieServiceClient(
  GRPC_SERVER_ADDR,
  grpc.credentials.createInsecure()
);
 
type IdentifyMessage = {
  type: string;
  userId?: string;
  token?: string;
};

type BuildAppOptions = {
  identifyTimeoutMs?: number;
  pingIntervalMs?: number;
  pongTimeoutMs?: number;
  subscription?: PubSubSubscription;
};

type NotificationApp = Awaited<ReturnType<typeof Fastify>> & {
  connectionMap: ConnectionMap;
};

function removeConnection(connectionMap: ConnectionMap, socket: FastifyWebSocket): void {
  for (const [userId, mappedSocket] of connectionMap.entries()) {
    if (mappedSocket === socket) {
      connectionMap.delete(userId);
      break;
    }
  }
}

export async function buildApp(options: BuildAppOptions = {}): Promise<NotificationApp> {
  const app = Fastify({ logger: false });
  const connectionMap: ConnectionMap = new Map();
  const identifyTimeoutMs = options.identifyTimeoutMs ?? 5000;
  const pingIntervalMs = options.pingIntervalMs ?? 30_000;
  const pongTimeoutMs = options.pongTimeoutMs ?? 10_000;
  const pongTimeouts = new WeakMap<FastifyWebSocket, ReturnType<typeof setTimeout>>();

  app.decorate('connectionMap', connectionMap);

  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map(s => s.trim());
  await app.register(fastifyCors, {
    origin: allowedOrigins,
  });

  await app.register(fastifyWebsocket);

  app.get('/health', async () => ({ status: 'ok', activeConnections: connectionMap.size }));

  app.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, (socket, _req) => {
      let identified = false;

      const identifyTimeout = setTimeout(() => {
        if (!identified) {
          socket.close(4001, 'No IDENTIFY received');
        }
      }, identifyTimeoutMs);

      socket.on('pong', () => {
        const timeout = pongTimeouts.get(socket);
        if (timeout !== undefined) {
          clearTimeout(timeout);
          pongTimeouts.delete(socket);
        }
      });

      socket.on('error', (err) => {
        app.log.error({ err: err.message }, 'WebSocket socket error');
      });

      socket.on('message', (message: Buffer) => {
        try {
          const payload = JSON.parse(message.toString()) as IdentifyMessage;

          if (payload.type !== 'IDENTIFY' || !payload.userId || !payload.token) {
            return;
          }

          identified = true;
          clearTimeout(identifyTimeout);
          connectionMap.set(payload.userId, socket);
          socket.send(JSON.stringify({ type: 'IDENTIFIED' }));
        } catch {
          app.log.warn('Received malformed WebSocket message');
        }
      });

      socket.on('close', () => {
        clearTimeout(identifyTimeout);
        const pongTimeout = pongTimeouts.get(socket);
        if (pongTimeout !== undefined) {
          clearTimeout(pongTimeout);
          pongTimeouts.delete(socket);
        }
        removeConnection(connectionMap, socket);
        app.log.info('Client disconnected');
      });
    });
  });

  const heartbeatInterval = setInterval(() => {
    for (const [userId, socket] of connectionMap.entries()) {
      if (socket.readyState !== socket.OPEN) {
        connectionMap.delete(userId);
        continue;
      }
      socket.ping();
      const timeout = setTimeout(() => {
        pongTimeouts.delete(socket);
        connectionMap.delete(userId);
        socket.terminate();
      }, pongTimeoutMs);
      pongTimeouts.set(socket, timeout);
    }
  }, pingIntervalMs);

  app.addHook('onClose', () => {
    clearInterval(heartbeatInterval);
  });

  if (options.subscription !== undefined) {
    const { subscription } = options;
    startSubscriber(subscription, connectionMap, {
      warn: (msg) => app.log.warn(msg),
      error: (msg) => app.log.error(msg),
    }, movieClient);
    app.addHook('onClose', async () => {
      await subscription.close();
    });
  }

  return app as NotificationApp;
}

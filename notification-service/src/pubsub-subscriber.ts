import type { ConnectionMap } from './app.js';
import type { WebSocket } from '@fastify/websocket';

export interface PubSubIncomingMessage {
  data: Buffer;
  ack(): void;
}

export interface PubSubSubscription {
  on(event: 'message', listener: (message: PubSubIncomingMessage) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  close(): Promise<void>;
}

type ReviewProcessedPayload = {
  type: 'REVIEW_PROCESSED';
  reviewId: string;
  movieId: string;
  userId: string;
  analysis: unknown;
};

type AnalyticsUpdatePayload = {
  type: 'ANALYTICS_UPDATE';
  [key: string]: unknown;
};

type IncomingPayload = ReviewProcessedPayload | AnalyticsUpdatePayload;

interface SubscriberLogger {
  warn(msg: string): void;
  error(msg: string): void;
}

function trySend(socket: WebSocket, data: string, log: SubscriberLogger): void {
  try {
    if (socket.readyState === socket.OPEN) {
      socket.send(data);
    }
  } catch (err) {
    log.warn(`Failed to send WebSocket message: ${String(err)}`);
  }
}

export function startSubscriber(
  subscription: PubSubSubscription,
  connectionMap: ConnectionMap,
  log: SubscriberLogger,
): void {
  subscription.on('message', (message) => {
    try {
      const payload = JSON.parse(message.data.toString()) as IncomingPayload;

      if (payload.type === 'REVIEW_PROCESSED') {
        const socket = connectionMap.get(payload.userId);
        if (socket !== undefined) {
          trySend(
            socket,
            JSON.stringify({
              type: 'REVIEW_PROCESSED',
              reviewId: payload.reviewId,
              movieId: payload.movieId,
              analysis: payload.analysis,
            }),
            log,
          );
        }
      } else if (payload.type === 'ANALYTICS_UPDATE') {
        for (const socket of connectionMap.values()) {
          trySend(socket, JSON.stringify(payload), log);
        }
      }
    } catch (err) {
      log.warn(`Failed to process PubSub message: ${String(err)}`);
    } finally {
      message.ack();
    }
  });

  subscription.on('error', (err) => {
    log.error(`PubSub subscription error: ${err.message}`);
  });
}

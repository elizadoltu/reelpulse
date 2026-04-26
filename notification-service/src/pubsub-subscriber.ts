import type { ConnectionMap } from './app.js';
import type { WebSocket } from '@fastify/websocket';

import { MovieServiceClient } from './types/reelpulse.js';

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
  trending: Array<{
    movieId: string;
    views: number;
  }>;
  genres: Array<string>;
  aiNarrative: string;
  activeUsers: number;
  latencyPercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
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
  movieClient: MovieServiceClient
): void {
  subscription.on('message', async (message) => {
    try {
      const payload = JSON.parse(message.data.toString()) as IncomingPayload;

      const getMovieTitle = async (movieId: string): Promise<string> => {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve("unknown"), 2000);

          movieClient.getMovieTitle({ movieId }, (err, response) => {
            clearTimeout(timeout);
            if (err) {
              log.warn(`gRPC error for ${movieId}: ${err.message}`);
              return resolve("unknown");
            }
            resolve(response?.found ? response.title : "unknown");
          });
        });
      };

      if (payload.type === 'REVIEW_PROCESSED') {
        const socket = connectionMap.get(payload.userId);

        const title = await getMovieTitle(payload.movieId);

        if (socket !== undefined) {
          trySend(
            socket,
            JSON.stringify({
              type: 'REVIEW_PROCESSED',
              reviewId: payload.reviewId,
              movieId: payload.movieId,
              analysis: payload.analysis,
              movieTitle: title,
            }),
            log,
          );
        }
      } else if (payload.type === 'ANALYTICS_UPDATE') {

        const enrichedTrending = [];
        for (const trendingItem of payload.trending) {
          const movieTitle = await getMovieTitle(trendingItem.movieId);
          enrichedTrending.push({ ...trendingItem, movieTitle });
        }

        for (const socket of connectionMap.values()) {
          trySend(socket, JSON.stringify({
            type: 'ANALYTICS_UPDATE',
            trending: enrichedTrending,
            genres: payload.genres,
            aiNarrative: payload.aiNarrative,
            activeUsers: payload.activeUsers,
            latencyPercentiles: {
              p50: payload.latencyPercentiles.p50,
              p95: payload.latencyPercentiles.p95,
              p99: payload.latencyPercentiles.p99,
            },
          }), log);
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

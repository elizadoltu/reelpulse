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
    title?: string;
    views: number;
    genre?: string;
  }>;
  genres: Array<string>;
  genreDistribution?: Record<string, number>;
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

function getMovieTitleGrpc(movieId: string, client: MovieServiceClient): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 2000);
    client.getMovieTitle({ movieId }, (err: Error | null, response: { found: boolean; title: string } | undefined) => {
      clearTimeout(timeout);
      if (err || !response?.found) return resolve(null);
      resolve(response.title);
    });
  });
}

async function getMovieTitle(movieId: string, client: MovieServiceClient, log: SubscriberLogger): Promise<string> {
  const grpcTitle = await getMovieTitleGrpc(movieId, client);
  if (grpcTitle) return grpcTitle;

  // REST fallback for Cloud Run where gRPC port is not exposed
  const serviceUrl = process.env.SERVICE_A_URL;
  if (serviceUrl) {
    try {
      const res = await fetch(`${serviceUrl}/api/v1/movies/${movieId}`);
      if (res.ok) {
        const movie = await res.json() as { title?: string };
        if (movie.title) return movie.title;
      }
    } catch (err) {
      log.warn(`REST title lookup failed for ${movieId}: ${String(err)}`);
    }
  } else {
    log.warn(`Title lookup failed for ${movieId}: gRPC unavailable and SERVICE_A_URL not set`);
  }
  return 'Unknown';
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

      if (payload.type === 'REVIEW_PROCESSED') {
        const socket = connectionMap.get(payload.userId);

        const title = await getMovieTitle(payload.movieId, movieClient, log);

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

        // Titles are pre-fetched by the scheduler — no gRPC call needed here
        const enrichedTrending = payload.trending.map((item) => ({
          ...item,
          movieTitle: item.title ?? 'Unknown',
        }));

        // Use the live connection count — scheduler always sends 0
        const activeUsers = connectionMap.size;

        for (const socket of connectionMap.values()) {
          trySend(socket, JSON.stringify({
            type: 'ANALYTICS_UPDATE',
            trending: enrichedTrending,
            genres: payload.genres,
            genreDistribution: payload.genreDistribution ?? {},
            aiNarrative: payload.aiNarrative,
            activeUsers,
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

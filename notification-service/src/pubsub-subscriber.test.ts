import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import {
  startSubscriber,
  type PubSubSubscription,
  type PubSubIncomingMessage,
} from './pubsub-subscriber.js';
import type { ConnectionMap } from './app.js';
import type { WebSocket } from '@fastify/websocket';

function makeMockSocket(readyState = 1 /* WebSocket.OPEN */): WebSocket {
  return {
    readyState,
    OPEN: 1,
    send: vi.fn(),
  } as unknown as WebSocket;
}

function makeMockSubscription(): PubSubSubscription & EventEmitter {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    close: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
  }) as unknown as PubSubSubscription & EventEmitter;
}

function makeMessage(payload: object): PubSubIncomingMessage & { ack: ReturnType<typeof vi.fn> } {
  return {
    data: Buffer.from(JSON.stringify(payload)),
    ack: vi.fn(),
  };
}


function makeMockMovieClient() {
  return {
    getMovieTitle: vi.fn((args, callback) => {
      callback(null, {
        movieId: args.movieId,
        title: 'Mock Movie Title',
        found: true,
      });
    }),
  };
}


describe('startSubscriber', () => {
  let connectionMap: ConnectionMap;
  let log: { warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let movieClient: ReturnType<typeof makeMockMovieClient>;

  beforeEach(() => {
    connectionMap = new Map();
    log = { warn: vi.fn(), error: vi.fn() };
    movieClient = makeMockMovieClient();
  });

  it('REVIEW_PROCESSED enriches data with gRPC and sends to correct user', async () => {
    const sub = makeMockSubscription();
    startSubscriber(sub, connectionMap, log, movieClient as any);

    const socketA = makeMockSocket();
    connectionMap.set('user-a', socketA);

    const analysis = { sentiment_score: 0.9, summary: 'Great film.' };
    const msg = makeMessage({
      type: 'REVIEW_PROCESSED',
      reviewId: 'rev-1',
      movieId: 'mov-1',
      userId: 'user-a',
      analysis,
    });

    sub.emit('message', msg);

    await vi.waitFor(() => {
      expect(msg.ack).toHaveBeenCalledOnce();
    });

    expect(movieClient.getMovieTitle).toHaveBeenCalledWith(
      expect.objectContaining({ movieId: 'mov-1' }),
      expect.any(Function)
    );

    expect(socketA.send).toHaveBeenCalledOnce();
    const sent = JSON.parse(vi.mocked(socketA.send).mock.calls[0][0] as string);
    
    expect(sent.type).toBe('REVIEW_PROCESSED');
    expect(sent.movieTitle).toBe('Mock Movie Title');
    expect(sent.analysis).toEqual(analysis);
  });

  it('REVIEW_PROCESSED handles gRPC errors gracefully by using fallback', async () => {
    const sub = makeMockSubscription();
    movieClient.getMovieTitle.mockImplementation((_args, callback) => {
      callback(new Error('Service Unavailable'), null);
    });

    startSubscriber(sub, connectionMap, log, movieClient as any);

    const socketA = makeMockSocket();
    connectionMap.set('user-a', socketA);

    const msg = makeMessage({
      type: 'REVIEW_PROCESSED',
      reviewId: 'rev-err',
      movieId: 'mov-fail',
      userId: 'user-a',
    });

    sub.emit('message', msg);

    await vi.waitFor(() => {
      expect(msg.ack).toHaveBeenCalledOnce();
    });

    const sent = JSON.parse(vi.mocked(socketA.send).mock.calls[0][0] as string);
    expect(sent.movieTitle).toBe('Unknown');
    expect(log.warn).toHaveBeenCalled();
  });

  it('ANALYTICS_UPDATE broadcasts to all connected clients after enrichment', async () => {
  const sub = makeMockSubscription();
  
  // Ensure the mock handles the trending enrichment
  movieClient.getMovieTitle.mockImplementation((args, callback) => {
    callback(null, { 
      movie_id: args.movieId || args.movie_id, // Handle both just in case
      title: 'Enriched Title', 
      found: true 
    });
  });

  startSubscriber(sub, connectionMap, log, movieClient as any);

  const socketA = makeMockSocket();
  const socketB = makeMockSocket();
  connectionMap.set('user-a', socketA);
  connectionMap.set('user-b', socketB);

  const msg = makeMessage({
    type: 'ANALYTICS_UPDATE',
    trending: [{ movieId: 'm1', title: 'Enriched Title', views: 100 }],
    genres: ['Action'],
    aiNarrative: 'Trending now',
    activeUsers: 10,
    latencyPercentiles: { p50: 10, p95: 50, p99: 100 }
  });

  sub.emit('message', msg);

  await vi.waitFor(() => {
    expect(socketA.send).toHaveBeenCalledOnce();
    expect(socketB.send).toHaveBeenCalledOnce();
    expect(msg.ack).toHaveBeenCalledOnce();
  });

  const sentData = JSON.parse(vi.mocked(socketA.send).mock.calls[0][0] as string);
  expect(sentData.trending[0].movieTitle).toBe('Enriched Title');
});

  it('REVIEW_PROCESSED for disconnected user acknowledges message', async () => {
    const sub = makeMockSubscription();
    startSubscriber(sub, connectionMap, log, movieClient as any);

    const msg = makeMessage({
      type: 'REVIEW_PROCESSED',
      reviewId: 'rev-2',
      movieId: 'mov-2',
      userId: 'offline-user',
    });

    sub.emit('message', msg);

    await vi.waitFor(() => {
      expect(msg.ack).toHaveBeenCalledOnce();
    });
    expect(log.warn).not.toHaveBeenCalled();
  });
});
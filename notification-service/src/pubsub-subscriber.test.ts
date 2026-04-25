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

describe('startSubscriber', () => {
  let connectionMap: ConnectionMap;
  let log: { warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    connectionMap = new Map();
    log = { warn: vi.fn(), error: vi.fn() };
  });

  it('REVIEW_PROCESSED sends notification to the correct connected user only', () => {
    const sub = makeMockSubscription();
    startSubscriber(sub, connectionMap, log);

    const socketA = makeMockSocket();
    const socketB = makeMockSocket();
    connectionMap.set('user-a', socketA);
    connectionMap.set('user-b', socketB);

    const analysis = { sentiment_score: 0.9, themes: ['drama'], spoiler_detected: false, summary: 'Great film.' };
    const msg = makeMessage({
      type: 'REVIEW_PROCESSED',
      reviewId: 'rev-1',
      movieId: 'mov-1',
      userId: 'user-a',
      analysis,
    });

    sub.emit('message', msg);

    expect(socketA.send).toHaveBeenCalledOnce();
    const sent = JSON.parse((socketA.send as ReturnType<typeof vi.fn>).mock.calls[0][0] as string) as {
      type: string;
      reviewId: string;
      movieId: string;
      analysis: unknown;
    };
    expect(sent.type).toBe('REVIEW_PROCESSED');
    expect(sent.reviewId).toBe('rev-1');
    expect(sent.movieId).toBe('mov-1');
    expect(sent.analysis).toEqual(analysis);

    expect(socketB.send).not.toHaveBeenCalled();
    expect(msg.ack).toHaveBeenCalledOnce();
  });

  it('ANALYTICS_UPDATE broadcasts to all connected clients', () => {
    const sub = makeMockSubscription();
    startSubscriber(sub, connectionMap, log);

    const socketA = makeMockSocket();
    const socketB = makeMockSocket();
    const socketC = makeMockSocket();
    connectionMap.set('user-a', socketA);
    connectionMap.set('user-b', socketB);
    connectionMap.set('user-c', socketC);

    const msg = makeMessage({
      type: 'ANALYTICS_UPDATE',
      metric: 'views',
      value: 42,
    });

    sub.emit('message', msg);

    for (const socket of [socketA, socketB, socketC]) {
      expect(socket.send).toHaveBeenCalledOnce();
      const sent = JSON.parse((socket.send as ReturnType<typeof vi.fn>).mock.calls[0][0] as string) as {
        type: string;
        metric: string;
        value: number;
      };
      expect(sent.type).toBe('ANALYTICS_UPDATE');
      expect(sent.metric).toBe('views');
      expect(sent.value).toBe(42);
    }

    expect(msg.ack).toHaveBeenCalledOnce();
  });

  it('ANALYTICS_UPDATE continues broadcasting when one socket send fails', () => {
    const sub = makeMockSubscription();
    startSubscriber(sub, connectionMap, log);

    const failingSocket = makeMockSocket();
    const healthySocket = makeMockSocket();
    vi.mocked(failingSocket.send).mockImplementation(() => {
      throw new Error('send failed');
    });
    connectionMap.set('user-a', failingSocket);
    connectionMap.set('user-b', healthySocket);

    const msg = makeMessage({
      type: 'ANALYTICS_UPDATE',
      metric: 'views',
      value: 42,
    });

    sub.emit('message', msg);

    expect(failingSocket.send).toHaveBeenCalledOnce();
    expect(healthySocket.send).toHaveBeenCalledOnce();
    expect(msg.ack).toHaveBeenCalledOnce();
    expect(log.warn).toHaveBeenCalledOnce();
  });

  it('REVIEW_PROCESSED for disconnected user acknowledges message with no error', () => {
    const sub = makeMockSubscription();
    startSubscriber(sub, connectionMap, log);

    // connectionMap is empty; user is not connected
    const msg = makeMessage({
      type: 'REVIEW_PROCESSED',
      reviewId: 'rev-2',
      movieId: 'mov-2',
      userId: 'user-offline',
      analysis: null,
    });

    sub.emit('message', msg);

    expect(msg.ack).toHaveBeenCalledOnce();
    expect(log.warn).not.toHaveBeenCalled();
    expect(log.error).not.toHaveBeenCalled();
  });
});

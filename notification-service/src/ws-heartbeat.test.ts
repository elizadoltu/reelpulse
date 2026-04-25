import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp, type ConnectionMap } from './app.js';
import { WebSocket as WebSocketClient } from 'ws';

type PongableClient = { pong: () => void };

describe('WebSocket heartbeat', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let connectionMap: ConnectionMap;
  const openClients: WebSocketClient[] = [];

  async function waitForExpectation(assertion: () => void, deadlineMs = 2000): Promise<void> {
    const deadline = Date.now() + deadlineMs;
    let lastError: unknown;

    while (Date.now() < deadline) {
      try {
        assertion();
        return;
      } catch (err) {
        lastError = err;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }
  }

  beforeEach(async () => {
    app = await buildApp({
      identifyTimeoutMs: 50,
      pingIntervalMs: 100,
      pongTimeoutMs: 150,
    });
    await app.listen({ port: 0, host: '127.0.0.1' });
    connectionMap = app.connectionMap;
  });

  afterEach(async () => {
    for (const client of openClients) {
      if (client.readyState === client.OPEN || client.readyState === client.CONNECTING) {
        client.terminate();
      }
    }
    openClients.length = 0;
    await app.close();
  });

  it('keeps connection alive when client responds to ping with pong', async () => {
    const address = app.server.address();
    if (typeof address === 'string' || address === null) {
      throw new Error('Expected server to bind to a TCP port');
    }

    const client = new WebSocketClient(`ws://127.0.0.1:${address.port}/ws`);
    openClients.push(client);

    await new Promise<void>((resolve) => client.on('open', resolve));

    const identifiedPromise = new Promise<void>((resolve) => {
      client.on('message', () => resolve());
    });

    client.send(JSON.stringify({ type: 'IDENTIFY', userId: 'user-heartbeat-alive', token: 'tok' }));
    await identifiedPromise;

    expect(connectionMap.has('user-heartbeat-alive')).toBe(true);

    // Wait for multiple ping/pong cycles; ws auto-replies to pings so connection stays alive
    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(connectionMap.has('user-heartbeat-alive')).toBe(true);
  });

  it('removes connection and terminates socket when client does not respond to ping', async () => {
    const address = app.server.address();
    if (typeof address === 'string' || address === null) {
      throw new Error('Expected server to bind to a TCP port');
    }

    const client = new WebSocketClient(`ws://127.0.0.1:${address.port}/ws`);
    openClients.push(client);

    await new Promise<void>((resolve) => client.on('open', resolve));

    const identifiedPromise = new Promise<void>((resolve) => {
      client.on('message', () => resolve());
    });

    client.send(JSON.stringify({ type: 'IDENTIFY', userId: 'user-heartbeat-dead', token: 'tok' }));
    await identifiedPromise;

    expect(connectionMap.has('user-heartbeat-dead')).toBe(true);

    // ws auto-pongs by calling this.pong() inside the receiver; override it to suppress pong
    (client as unknown as PongableClient).pong = () => {};

    await waitForExpectation(() => {
      expect(connectionMap.has('user-heartbeat-dead')).toBe(false);
    }, 2000);
  });
});

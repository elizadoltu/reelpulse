import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp, type ConnectionMap } from './app.js';
import type { WebSocket } from '@fastify/websocket';
import { WebSocket as WebSocketClient } from 'ws';

describe('WebSocket connection management', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let connectionMap: ConnectionMap;
  const openClients: WebSocket[] = [];

  async function waitForExpectation(assertion: () => void): Promise<void> {
    const deadline = Date.now() + 500;
    let lastError: unknown;

    while (Date.now() < deadline) {
      try {
        assertion();
        return;
      } catch (err) {
        lastError = err;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }
  }

  beforeEach(async () => {
    app = await buildApp({ identifyTimeoutMs: 50 });
    await app.listen({ port: 0, host: '127.0.0.1' });
    connectionMap = app.connectionMap;
  });

  afterEach(async () => {
    for (const client of openClients) {
      if (client.readyState === client.OPEN || client.readyState === client.CONNECTING) {
        client.close();
      }
    }
    openClients.length = 0;
    await app.close();
  });

  it('stores userId in connection map and sends IDENTIFIED on valid IDENTIFY', async () => {
    const client = await app.injectWS('/ws');
    openClients.push(client);

    const messagePromise = new Promise<{ type: string }>((resolve) => {
      client.on('message', (data: Buffer) =>
        resolve(JSON.parse(data.toString()) as { type: string }),
      );
    });

    client.send(JSON.stringify({ type: 'IDENTIFY', userId: 'user-1', token: 'tok' }));

    const msg = await messagePromise;

    expect(msg.type).toBe('IDENTIFIED');
    expect(connectionMap.has('user-1')).toBe(true);
    expect(connectionMap.get('user-1')).toBeDefined();
  });

  it('closes connection with code 4001 when no IDENTIFY received within timeout', async () => {
    const client = await app.injectWS('/ws');
    openClients.push(client);

    const closeResult = await new Promise<{ code: number; reason: string }>((resolve) => {
      client.on('close', (code: number, reason: Buffer) =>
        resolve({ code, reason: reason.toString() }),
      );
    });

    expect(closeResult.code).toBe(4001);
    expect(closeResult.reason).toBe('No IDENTIFY received');
    expect(connectionMap.size).toBe(0);
  });

  it('removes userId from connection map when client disconnects', async () => {
    const address = app.server.address();
    if (typeof address === 'string' || address === null) {
      throw new Error('Expected notification-service test server to bind to a TCP port');
    }

    const client = new WebSocketClient(`ws://127.0.0.1:${address.port}/ws`) as WebSocket;
    openClients.push(client);

    await new Promise<void>((resolve) => client.on('open', resolve));

    const identifiedPromise = new Promise<void>((resolve) => {
      client.on('message', () => resolve());
    });

    client.send(JSON.stringify({ type: 'IDENTIFY', userId: 'user-2', token: 'tok' }));
    await identifiedPromise;

    expect(connectionMap.has('user-2')).toBe(true);

    client.close();

    await waitForExpectation(() => {
      expect(connectionMap.has('user-2')).toBe(false);
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from './useWebSocket.js';

vi.mock('@/services/api.js', () => ({
  getToken: vi.fn().mockReturnValue('header.eyJpZCI6InVzZXItMSJ9.sig'),
}));

// ---------------------------------------------------------------------------
// Minimal WebSocket mock — avoids no-this-alias by using a separate registry
// ---------------------------------------------------------------------------
interface WsHandlers {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
  readyState: number;
  sent: string[];
}

const instances: WsHandlers[] = [];

function lastInstance(): WsHandlers | undefined {
  return instances[instances.length - 1];
}

const MockWS = vi.fn().mockImplementation((_url: string) => {
  const inst: WsHandlers = {
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
    readyState: 0,
    sent: [],
  };
  instances.push(inst);

  return Object.assign(inst, {
    send(data: string) { inst.sent.push(data); },
    close() {
      inst.readyState = 3;
      inst.onclose?.();
    },
  });
});
(MockWS as unknown as { OPEN: number; CLOSED: number }).OPEN = 1;
(MockWS as unknown as { OPEN: number; CLOSED: number }).CLOSED = 3;

vi.stubGlobal('WebSocket', MockWS);

function simulateOpen(inst = lastInstance()) {
  if (!inst) return;
  inst.readyState = 1;
  inst.onopen?.();
}

function simulateClose(inst = lastInstance()) {
  if (!inst) return;
  inst.readyState = 3;
  inst.onclose?.();
}

function simulateMessage(data: unknown, inst = lastInstance()) {
  inst?.onmessage?.({ data: JSON.stringify(data) });
}

beforeEach(() => {
  instances.length = 0;
  MockWS.mockClear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta.env as any).VITE_WS_URL = 'ws://localhost:1234';
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useWebSocket', () => {
  it('starts in connecting status and sends IDENTIFY on open', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(result.current.status).toBe('connecting');
    expect(lastInstance()).toBeDefined();

    act(() => simulateOpen());

    expect(result.current.status).toBe('connected');
    expect(lastInstance()!.sent).toHaveLength(1);
    const identify = JSON.parse(lastInstance()!.sent[0]) as { type: string; userId: string; token: string };
    expect(identify.type).toBe('IDENTIFY');
    expect(identify.userId).toBe('user-1');
  });

  it('delivers messages via lastMessage', () => {
    const { result } = renderHook(() => useWebSocket());
    act(() => simulateOpen());

    const msg = { type: 'ANALYTICS_UPDATE', trending: [], genres: [], genreDistribution: {}, aiNarrative: '', activeUsers: 5, latencyPercentiles: { p50: 0, p95: 0, p99: 0 } };
    act(() => simulateMessage(msg));

    expect(result.current.lastMessage).toEqual(msg);
  });

  it('reconnects after close with backoff', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useWebSocket());
    act(() => simulateOpen());
    expect(result.current.status).toBe('connected');

    const countBefore = instances.length;
    act(() => simulateClose());
    expect(result.current.status).toBe('disconnected');

    act(() => vi.advanceTimersByTime(1000));
    expect(instances.length).toBeGreaterThan(countBefore);

    vi.useRealTimers();
  });

  it('does not reconnect after unmount', () => {
    vi.useFakeTimers();

    const { result, unmount } = renderHook(() => useWebSocket());
    act(() => simulateOpen());
    expect(result.current.status).toBe('connected');

    unmount();
    const countAfterUnmount = instances.length;

    act(() => vi.advanceTimersByTime(2000));
    expect(instances.length).toBe(countAfterUnmount);

    vi.useRealTimers();
  });
});

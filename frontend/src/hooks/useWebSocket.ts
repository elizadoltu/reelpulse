import { useEffect, useRef, useState, useCallback } from 'react';
import type { WsMessage, WsStatus } from '@/types/index.js';
import { getToken } from '@/services/api.js';

const BACKOFF_MS = [1000, 3000, 5000];
const MAX_ATTEMPTS = 10;

function decodeJwtUserId(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
    const id = payload.id ?? payload.userId ?? payload.sub ?? payload.email ?? '';
    return typeof id === 'string' ? id : '';
  } catch {
    return '';
  }
}

export interface UseWebSocketResult {
  status: WsStatus;
  lastMessage: WsMessage | null;
  send: (data: string) => void;
}

export function useWebSocket(): UseWebSocketResult {
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const unmountedRef = useRef(false);
  const attemptRef = useRef(0);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;
    const wsUrl = import.meta.env.VITE_WS_URL as string | undefined;
    if (!wsUrl) return;

    setStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      setStatus('disconnected');
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) { ws.close(); return; }
      attemptRef.current = 0;
      setStatus('connected');
      const token = getToken() ?? '';
      const userId = decodeJwtUserId(token);
      ws.send(JSON.stringify({ type: 'IDENTIFY', userId, token }));
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      setStatus('disconnected');
      if (attemptRef.current >= MAX_ATTEMPTS) return;
      const delay = BACKOFF_MS[Math.min(attemptRef.current, BACKOFF_MS.length - 1)];
      attemptRef.current += 1;
      setTimeout(connect, delay);
    };

    ws.onerror = () => {
      setStatus('disconnected');
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage;
        setLastMessage(msg);
      } catch {
        // ignore malformed messages
      }
    };
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    return () => {
      unmountedRef.current = true;
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  return { status, lastMessage, send };
}

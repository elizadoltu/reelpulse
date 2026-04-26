import { useEffect, useRef, useState } from 'react';
import type { ReviewAnalysis } from '@/types/index.js';

type ProcessedCallback = (reviewId: string, analysis: ReviewAnalysis) => void;

export function useReviewSocket(onProcessed: ProcessedCallback): boolean {
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onProcessed);
  callbackRef.current = onProcessed;

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL as string | undefined;
    if (!wsUrl) return;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      return;
    }

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as {
          type: string;
          reviewId?: string;
          analysis?: ReviewAnalysis;
        };
        if (msg.type === 'REVIEW_PROCESSED' && msg.reviewId && msg.analysis) {
          callbackRef.current(msg.reviewId, msg.analysis);
        }
      } catch {
        // ignore malformed messages
      }
    };

    return () => ws.close();
  }, []);

  return connected;
}

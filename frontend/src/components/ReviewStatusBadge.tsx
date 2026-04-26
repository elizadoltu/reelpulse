import { useEffect, useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useReviewSocket } from '@/hooks/useReviewSocket.js';
import { getReviewStatus } from '@/services/api.js';
import ReviewCard from '@/components/ReviewCard.js';
import type { ReviewAnalysis, ReviewStatus } from '@/types/index.js';

interface ReviewStatusBadgeProps {
  movieId: string;
  reviewId: string;
}

export default function ReviewStatusBadge({ movieId, reviewId }: ReviewStatusBadgeProps) {
  const [status, setStatus] = useState<ReviewStatus | null>(null);
  const processed = status?.status === 'processed';

  const wsConnected = useReviewSocket((incomingId: string, analysis: ReviewAnalysis) => {
    if (incomingId === reviewId) {
      setStatus({ reviewId, status: 'processed', analysis, processedAt: new Date().toISOString() });
    }
  });

  // Polling fallback when WebSocket is not connected and review not yet processed
  useEffect(() => {
    if (processed || wsConnected) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const result = await getReviewStatus(movieId, reviewId);
        if (!cancelled) setStatus(result);
      } catch {
        // keep polling on error
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [movieId, reviewId, wsConnected, processed]);

  if (!processed) {
    return (
      <div
        role="status"
        aria-label="Analyzing your review"
        className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span>Analyzing your review...</span>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-green-400">
        <CheckCircle className="h-4 w-4" aria-hidden />
        <span>Analyzed ✓</span>
      </div>
      {status?.analysis && <ReviewCard analysis={status.analysis} />}
    </div>
  );
}

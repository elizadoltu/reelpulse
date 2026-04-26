import { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge.js';
import { Button } from '@/components/ui/button.js';
import { getReviewStatus } from '@/services/api.js';
import type { ReviewStatus, ReviewSubmitResponse } from '@/types/index.js';

interface PendingReview {
  movieId: string;
  reviewId: string;
  submittedAt: number;
}

interface ReviewListProps {
  movieId: string;
  newReview: ReviewSubmitResponse | null;
}

function sentimentLabel(score: number): { label: string; color: string } {
  if (score >= 0.6) return { label: 'Positive', color: 'text-green-400' };
  if (score <= -0.6) return { label: 'Negative', color: 'text-red-400' };
  return { label: 'Neutral', color: 'text-yellow-400' };
}

function ReviewStatusCard({ movieId, reviewId }: PendingReview) {
  const [status, setStatus] = useState<ReviewStatus | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!polling) return;
    let cancelled = false;

    const check = async () => {
      try {
        const result = await getReviewStatus(movieId, reviewId);
        if (cancelled) return;
        setStatus(result);
        if (result.status === 'processed') setPolling(false);
      } catch {
        if (!cancelled) setPolling(false);
      }
    };

    check();
    const interval = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [movieId, reviewId, polling]);

  if (!status) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <Clock className="h-4 w-4 animate-spin" />
        Analysing your review…
      </div>
    );
  }

  if (status.status === 'pending') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        Review submitted — analysis pending.
      </div>
    );
  }

  const analysis = status.analysis;
  if (!analysis) return null;

  const { label, color } = sentimentLabel(analysis.sentiment_score);

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-400" />
        <span className="text-sm font-medium">Your review was analysed</span>
        {analysis.spoiler_detected && (
          <Badge variant="destructive" className="ml-auto flex items-center gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" />
            Spoiler
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{analysis.summary}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs font-medium ${color}`}>{label}</span>
        {analysis.themes.map((t) => (
          <Badge key={t} variant="outline" className="text-xs">
            {t}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function ReviewList({ movieId, newReview }: ReviewListProps) {
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);

  useEffect(() => {
    if (!newReview) return;
    setPendingReviews((prev) => [
      { movieId, reviewId: newReview.reviewId, submittedAt: Date.now() },
      ...prev,
    ]);
  }, [newReview, movieId]);

  if (pendingReviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No reviews yet. Be the first to share your thoughts!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {pendingReviews.map((r) => (
        <ReviewStatusCard key={r.reviewId} {...r} />
      ))}
    </div>
  );
}

export { ReviewStatusCard };

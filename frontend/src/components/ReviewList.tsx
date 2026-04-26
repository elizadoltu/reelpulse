import { useEffect, useState } from 'react';
import ReviewStatusBadge from '@/components/ReviewStatusBadge.js';
import type { ReviewSubmitResponse } from '@/types/index.js';

interface PendingReview {
  movieId: string;
  reviewId: string;
}

interface ReviewListProps {
  readonly movieId: string;
  readonly newReview: ReviewSubmitResponse | null;
}

export default function ReviewList({ movieId, newReview }: ReviewListProps) {
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);

  useEffect(() => {
    if (!newReview) return;
    setPendingReviews((prev) => [{ movieId, reviewId: newReview.reviewId }, ...prev]);
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
        <ReviewStatusBadge key={r.reviewId} movieId={r.movieId} reviewId={r.reviewId} />
      ))}
    </div>
  );
}

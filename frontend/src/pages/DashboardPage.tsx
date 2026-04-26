import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket.js';
import { getMyReviews } from '@/services/api.js';
import { WSStatusDot } from '@/components/WSStatusDot.js';
import { ActiveUsersCounter } from '@/components/ActiveUsersCounter.js';
import { AITrendingNarrative } from '@/components/AITrendingNarrative.js';
import { TrendingMovies } from '@/components/TrendingMovies.js';
import { GenreHeatmap } from '@/components/GenreHeatmap.js';
import { LatencyChart } from '@/components/LatencyChart.js';
import ReviewCard from '@/components/ReviewCard.js';
import type {
  AnalyticsUpdate,
  TrendingEntry,
  LatencyDataPoint,
  ReviewAnalysis,
} from '@/types/index.js';

const MAX_REVIEWS = 10;

interface ReviewFeedEntry {
  id: string;
  movieTitle?: string;
  analysis: ReviewAnalysis;
  receivedAt: Date;
}

export default function DashboardPage() {
  const { status, lastMessage } = useWebSocket();

  const [trending, setTrending] = useState<TrendingEntry[]>([]);
  const [genreDistribution, setGenreDistribution] = useState<Record<string, number>>({});
  const [activeUsers, setActiveUsers] = useState(0);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [latencyPoint, setLatencyPoint] = useState<Omit<LatencyDataPoint, 'timestamp'> | null>(null);
  const [analyticsUpdated, setAnalyticsUpdated] = useState<Date | null>(null);
  const [reviews, setReviews] = useState<ReviewFeedEntry[]>([]);

  // Seed the panel with the user's already-processed reviews on mount
  useEffect(() => {
    getMyReviews()
      .then((myReviews) => {
        setReviews(
          myReviews
            .filter((r) => r.analysis !== null)
            .map((r) => ({
              id: r.reviewId,
              movieId: r.movieId,
              analysis: r.analysis!,
              receivedAt: r.processedAt ? new Date(r.processedAt) : new Date(),
            })),
        );
      })
      .catch(() => {
        // not logged in or network error — panel stays empty until WS delivers
      });
  }, []);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'ANALYTICS_UPDATE') {
      const u = lastMessage as AnalyticsUpdate;
      setTrending(u.trending);
      setGenreDistribution(u.genreDistribution);
      setActiveUsers(u.activeUsers);
      setNarrative(u.aiNarrative);
      setLatencyPoint(u.latencyPercentiles);
      setAnalyticsUpdated(new Date());
    }

    if (lastMessage.type === 'REVIEW_PROCESSED') {
      const { reviewId, movieTitle, analysis } = lastMessage;
      setReviews((prev) => [
        { id: reviewId, movieTitle, analysis, receivedAt: new Date() },
        ...prev,
      ].slice(0, MAX_REVIEWS));
    }
  }, [lastMessage]);

  const connected = status === 'connected';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <WSStatusDot status={status} />
        </div>

        <ActiveUsersCounter count={activeUsers} connected={connected} />

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left panel — analytics */}
          <div className="space-y-6">
            <AITrendingNarrative narrative={narrative} lastUpdated={analyticsUpdated} />
            <TrendingMovies entries={trending} lastUpdated={analyticsUpdated} />
            <GenreHeatmap distribution={genreDistribution} />
            <LatencyChart latestPoint={latencyPoint} />
          </div>

          {/* Right panel — recent review feed */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Recent Reviews</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews processed yet.</p>
            ) : (
              reviews.map((entry) => (
                <div key={entry.id}>
                  {entry.movieTitle && (
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {entry.movieTitle}
                    </p>
                  )}
                  <ReviewCard analysis={entry.analysis} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { TrendingEntry } from '@/types/index.js';

function useSecondsSince(date: Date | null): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!date) return;
    const tick = () => setSeconds(Math.floor((Date.now() - date.getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [date]);
  return seconds;
}

const SKELETON_COUNT = 5;

export function TrendingMovies({
  entries,
  lastUpdated,
}: {
  entries: TrendingEntry[];
  lastUpdated: Date | null;
}) {
  const secondsAgo = useSecondsSince(lastUpdated);
  const top10 = entries.slice(0, 10);
  const maxViews = Math.max(...top10.map((e) => e.views), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trending Movies</h2>
        {lastUpdated && (
          <span className="text-xs text-muted-foreground">
            last updated {secondsAgo}s ago
          </span>
        )}
      </div>

      {top10.length === 0 ? (
        <ol className="space-y-2" aria-label="Trending movies skeleton">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 animate-pulse">
              <span className="w-5 shrink-0 text-right text-muted-foreground">#{i + 1}</span>
              <div className="h-4 flex-1 rounded bg-muted" />
            </li>
          ))}
        </ol>
      ) : (
        <ol className="space-y-2" aria-label="Trending movies">
          {top10.map((entry, idx) => (
            <li key={entry.movieId} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">
                #{idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {entry.movieTitle ?? entry.movieId}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {entry.views.toLocaleString()}
                  </span>
                </div>
                {entry.genre && (
                  <span className="text-xs text-muted-foreground">{entry.genre}</span>
                )}
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(entry.views / maxViews) * 100}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket.js';
import { WSStatusDot } from '@/components/WSStatusDot.js';
import { TrendingMovies } from '@/components/TrendingMovies.js';
import { GenreHeatmap } from '@/components/GenreHeatmap.js';
import { ActiveUsersCounter } from '@/components/ActiveUsersCounter.js';
import type { AnalyticsUpdate, TrendingEntry } from '@/types/index.js';

export default function AnalyticsPage() {
  const { status, lastMessage } = useWebSocket();

  const [trending, setTrending] = useState<TrendingEntry[]>([]);
  const [genreDistribution, setGenreDistribution] = useState<Record<string, number>>({});
  const [activeUsers, setActiveUsers] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (lastMessage?.type === 'ANALYTICS_UPDATE') {
      const update = lastMessage as AnalyticsUpdate;
      setTrending(update.trending ?? []);
      setGenreDistribution(update.genreDistribution ?? {});
      setActiveUsers(update.activeUsers);
      setLastUpdated(new Date());
    }
  }, [lastMessage]);

  const connected = status === 'connected';

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <WSStatusDot status={status} />
      </div>

      <ActiveUsersCounter count={activeUsers} connected={connected} />

      <div className="grid gap-6 lg:grid-cols-2">
        <TrendingMovies entries={trending} lastUpdated={lastUpdated} />
        <GenreHeatmap distribution={genreDistribution} />
      </div>
    </div>
  );
}

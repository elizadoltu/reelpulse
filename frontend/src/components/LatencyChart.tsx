import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { LatencyDataPoint } from '@/types/index.js';

const WINDOW_MS = 5 * 60 * 1000;

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function LatencyChart({
  latestPoint,
}: {
  latestPoint: Omit<LatencyDataPoint, 'timestamp'> | null;
}) {
  const [data, setData] = useState<LatencyDataPoint[]>([]);

  useEffect(() => {
    if (!latestPoint) return;
    const now = Date.now();
    setData((prev) => [
      ...prev.filter((p) => now - p.timestamp < WINDOW_MS),
      { timestamp: now, ...latestPoint },
    ]);
  }, [latestPoint]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-4 text-lg font-semibold">Review Latency</h2>
      {/* Hidden counter for test assertions */}
      <span className="sr-only" data-testid="latency-point-count">{data.length}</span>
      {data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          Waiting for data...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatTime}
              scale="time"
              tick={{ fontSize: 10 }}
            />
            <YAxis unit="ms" tick={{ fontSize: 10 }} />
            <Tooltip
              labelFormatter={(v: number) => formatTime(v)}
              formatter={(v: number, name: string) => [`${v}ms`, name]}
            />
            <Legend />
            <Line dataKey="p50" name="p50" stroke="#22c55e" dot={false} isAnimationActive={false} />
            <Line dataKey="p95" name="p95" stroke="#eab308" dot={false} isAnimationActive={false} />
            <Line dataKey="p99" name="p99" stroke="#ef4444" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

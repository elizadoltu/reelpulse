import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const BAR_COLOR = '#6366f1';

export function GenreHeatmap({ distribution = {} }: Readonly<{ distribution?: Record<string, number> }>) {
  const data = Object.entries(distribution)
    .map(([genre, views]) => ({ genre, views }))
    .sort((a, b) => b.views - a.views);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 text-lg font-semibold">Genre Distribution</h2>
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No data yet
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-4 text-lg font-semibold">Genre Distribution</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
          <XAxis
            dataKey="genre"
            tick={{ fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: number) => [value.toLocaleString(), 'Views']}
          />
          <Bar dataKey="views" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.genre} fill={BAR_COLOR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

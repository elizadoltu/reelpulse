import { useEffect, useRef, useState } from 'react';

export function ActiveUsersCounter({
  count,
  connected,
}: {
  count: number;
  connected: boolean;
}) {
  const [displayed, setDisplayed] = useState(connected ? count : 0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(displayed);

  useEffect(() => {
    if (!connected) {
      setDisplayed(0);
      return;
    }
    const from = startRef.current;
    const to = count;
    if (from === to) return;

    const duration = 400;
    const startTime = performance.now();

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const value = Math.round(from + (to - from) * t);
      setDisplayed(value);
      startRef.current = value;
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [count, connected]);

  const dotClass = connected
    ? 'bg-green-500 animate-pulse'
    : 'bg-gray-500';

  const countClass = connected ? 'text-foreground' : 'text-muted-foreground';

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4">
      <span className={`h-3 w-3 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
      <span className={`text-3xl font-bold tabular-nums ${countClass}`} aria-live="polite">
        {connected ? displayed : 0}
      </span>
      <span className="text-sm text-muted-foreground">active users</span>
    </div>
  );
}

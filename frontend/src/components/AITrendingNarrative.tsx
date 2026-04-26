import { useEffect, useRef, useState } from 'react';

const PLACEHOLDER = 'Gathering trending data...';
const CHAR_DELAY_MS = 18;

export function AITrendingNarrative({
  narrative,
  lastUpdated,
}: {
  narrative: string | null;
  lastUpdated: Date | null;
}) {
  const [displayed, setDisplayed] = useState('');
  const [secondsAgo, setSecondsAgo] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!narrative) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayed('');

    let i = 0;
    timerRef.current = setInterval(() => {
      i += 1;
      setDisplayed(narrative.slice(0, i));
      if (i >= narrative.length && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, CHAR_DELAY_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [narrative]);

  useEffect(() => {
    if (!lastUpdated) return;
    const tick = () => setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    tick();
    clockRef.current = setInterval(tick, 1000);
    return () => {
      if (clockRef.current) clearInterval(clockRef.current);
    };
  }, [lastUpdated]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        🤖 AI Summary
      </p>
      <p
        className="min-h-[3rem] text-sm leading-relaxed"
        aria-live="polite"
        data-testid="ai-narrative-text"
      >
        {narrative ? displayed || ' ' : PLACEHOLDER}
      </p>
      {lastUpdated && (
        <p className="mt-2 text-xs text-muted-foreground">
          Generated {secondsAgo}s ago
        </p>
      )}
    </div>
  );
}

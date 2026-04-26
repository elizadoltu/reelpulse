import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge.js';
import type { ReviewAnalysis, ThemeValue } from '@/types/index.js';

interface ReviewCardProps {
  analysis: ReviewAnalysis;
}

// Gemini returns sentiment_score on a 0–10 scale directly.
function normalizeSentiment(score: number): number {
  return Math.round(Math.max(0, Math.min(10, score)));
}

function sentimentColor(display: number): string {
  if (display <= 4) return 'text-red-400';
  if (display <= 6) return 'text-yellow-400';
  return 'text-green-400';
}

const THEME_VARIANT: Record<Exclude<ThemeValue, 'not_mentioned'>, 'default' | 'destructive' | 'secondary'> = {
  positive: 'default',
  negative: 'destructive',
  neutral: 'secondary',
};

export default function ReviewCard({ analysis }: ReviewCardProps) {
  const displayScore = normalizeSentiment(analysis.sentiment_score);
  const color = sentimentColor(displayScore);

  const visibleThemes = Object.entries(analysis.themes).filter(
    (entry): entry is [string, Exclude<ThemeValue, 'not_mentioned'>] => entry[1] !== 'not_mentioned',
  );

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-semibold ${color}`}
          aria-label={`Sentiment score ${displayScore} out of 10`}
        >
          {displayScore}/10
        </span>
        {analysis.spoiler_detected && (
          <Badge variant="destructive" className="flex items-center gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" aria-hidden />
            Spoiler detected
          </Badge>
        )}
      </div>

      {visibleThemes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleThemes.map(([theme, value]) => (
            <Badge key={theme} variant={THEME_VARIANT[value]} className="text-xs capitalize">
              {theme}
            </Badge>
          ))}
        </div>
      )}

      {analysis.summary && (
        <p className="text-sm leading-relaxed text-muted-foreground">{analysis.summary}</p>
      )}
    </div>
  );
}

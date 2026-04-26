import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge.js';
import type { ReviewAnalysis } from '@/types/index.js';

interface ReviewCardProps {
  analysis: ReviewAnalysis;
}

// API returns sentiment_score in [-1, 1]; map to [0, 10] for display.
function normalizeSentiment(score: number): number {
  return Math.round((Math.max(-1, Math.min(1, score)) + 1) * 5);
}

function sentimentColor(display: number): string {
  if (display <= 4) return 'text-red-400';
  if (display <= 6) return 'text-yellow-400';
  return 'text-green-400';
}

export default function ReviewCard({ analysis }: ReviewCardProps) {
  const displayScore = normalizeSentiment(analysis.sentiment_score);
  const color = sentimentColor(displayScore);

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

      {analysis.themes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {analysis.themes.map((theme) => (
            <Badge key={theme} variant="secondary" className="text-xs">
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

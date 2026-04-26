import { useState } from 'react';
import { Button } from '@/components/ui/button.js';
import { Textarea } from '@/components/ui/textarea.js';
import { submitReview } from '@/services/api.js';
import type { ReviewSubmitResponse } from '@/types/index.js';

interface ReviewFormProps {
  movieId: string;
  onSubmitted: (result: ReviewSubmitResponse) => void;
}

export default function ReviewForm({ movieId, onSubmitted }: ReviewFormProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MIN = 10;
  const MAX = 2000;
  const remaining = MAX - text.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.length < MIN) return;
    setError(null);
    setLoading(true);
    try {
      const result = await submitReview(movieId, text);
      setText('');
      onSubmitted(result);
    } catch {
      setError('Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder={`Share your thoughts… (min ${MIN} characters)`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={MAX}
        disabled={loading}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{remaining} characters left</span>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          type="submit"
          size="sm"
          disabled={loading || text.length < MIN}
        >
          {loading ? 'Submitting…' : 'Submit review'}
        </Button>
      </div>
    </form>
  );
}

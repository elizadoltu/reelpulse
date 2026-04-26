import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button.js';
import { Textarea } from '@/components/ui/textarea.js';
import { submitReview } from '@/services/api.js';
import type { ReviewSubmitResponse } from '@/types/index.js';

interface ReviewFormProps {
  readonly movieId: string;
  readonly onSubmitted: (result: ReviewSubmitResponse) => void;
}

const MIN = 10;
const MAX = 2000;
const RATE_LIMIT_SECONDS = 10;

export default function ReviewForm({ movieId, onSubmitted }: ReviewFormProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inCooldown = toast?.startsWith('Too many') ?? false;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startRateLimitCountdown() {
    let remaining = RATE_LIMIT_SECONDS;
    setToast(`Too many submissions, please wait ${remaining} seconds`);
    timerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setToast(null);
      } else {
        setToast(`Too many submissions, please wait ${remaining} seconds`);
      }
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.length < MIN || inCooldown) return;

    setToast(null);
    setLoading(true);
    try {
      const result = await submitReview(movieId, text);
      setText('');
      onSubmitted(result);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 429) {
          startRateLimitCountdown();
        } else if (err.response?.status === 401) {
          setToast('Please log in to submit a review');
        } else {
          setToast('Failed to submit review. Please try again.');
        }
      } else {
        setToast('Failed to submit review. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  const remaining = MAX - text.length;
  const tooShort = text.length < MIN;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder={`Share your thoughts… (min ${MIN} characters)`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={MAX}
        disabled={loading}
        aria-label="Review text"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {tooShort ? `${MIN - text.length} more characters needed` : `${remaining} characters left`}
        </span>
        <Button type="submit" size="sm" disabled={loading || tooShort || inCooldown}>
          {loading ? 'Submitting…' : 'Submit review'}
        </Button>
      </div>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {toast}
        </div>
      )}
    </form>
  );
}

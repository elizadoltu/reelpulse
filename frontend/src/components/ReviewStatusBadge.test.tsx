import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import ReviewStatusBadge from './ReviewStatusBadge.js';
import type { ReviewAnalysis } from '@/types/index.js';

// Capture the WS callback so tests can fire it manually
let capturedCallback: ((reviewId: string, analysis: ReviewAnalysis) => void) | null = null;
let mockWsConnected = false;

vi.mock('@/hooks/useReviewSocket.js', () => ({
  useReviewSocket: vi.fn((cb: (reviewId: string, analysis: ReviewAnalysis) => void) => {
    capturedCallback = cb;
    return mockWsConnected;
  }),
}));

vi.mock('@/services/api.js', () => ({
  getReviewStatus: vi.fn().mockResolvedValue({ reviewId: 'r1', status: 'pending', analysis: null, processedAt: null }),
}));

const THEMES = {
  acting: 'positive' as const,
  plot: 'positive' as const,
  visuals: 'not_mentioned' as const,
  soundtrack: 'not_mentioned' as const,
  pacing: 'neutral' as const,
};

const sampleAnalysis: ReviewAnalysis = {
  sentiment_score: 8,   // 0–10 scale → displays as 8/10
  themes: THEMES,
  spoiler_detected: false,
  summary: 'An excellent film with strong performances.',
};

beforeEach(() => {
  capturedCallback = null;
  mockWsConnected = false;
  vi.clearAllMocks();
});

describe('ReviewStatusBadge', () => {
  it('shows spinner and "Analyzing your review..." in pending state', () => {
    render(<ReviewStatusBadge movieId="m1" reviewId="r1" />);

    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Analyzing your review...')).toBeDefined();
  });

  it('transitions to "Analyzed ✓" and shows ReviewCard when WS delivers REVIEW_PROCESSED', async () => {
    render(<ReviewStatusBadge movieId="m1" reviewId="r1" />);

    // Confirm pending state first
    expect(screen.getByText('Analyzing your review...')).toBeDefined();

    // Simulate the WebSocket REVIEW_PROCESSED event
    act(() => {
      capturedCallback?.('r1', sampleAnalysis);
    });

    await waitFor(() => {
      expect(screen.getByText('Analyzed ✓')).toBeDefined();
      // ReviewCard renders the sentiment score
      expect(screen.getByText('8/10')).toBeDefined();
      // ReviewCard renders themes
      expect(screen.getByText('acting')).toBeDefined();
      // ReviewCard renders summary
      expect(screen.getByText(sampleAnalysis.summary)).toBeDefined();
    });
  });

  it('does not transition when REVIEW_PROCESSED is for a different reviewId', async () => {
    render(<ReviewStatusBadge movieId="m1" reviewId="r1" />);

    act(() => {
      capturedCallback?.('other-review', sampleAnalysis);
    });

    // Should still be in pending state
    expect(screen.getByText('Analyzing your review...')).toBeDefined();
    expect(screen.queryByText('Analyzed ✓')).toBeNull();
  });
});

describe('ReviewCard sentiment colors', () => {
  it('applies green color for sentiment score that normalises to 8/10', async () => {
    render(<ReviewStatusBadge movieId="m1" reviewId="r1" />);

    act(() => {
      capturedCallback?.('r1', { ...sampleAnalysis, sentiment_score: 8 }); // → 8/10
    });

    await waitFor(() => {
      const score = screen.getByLabelText('Sentiment score 8 out of 10');
      expect(score.className).toContain('text-green-400');
    });
  });

  it('applies red color for sentiment score that normalises to 2/10', async () => {
    render(<ReviewStatusBadge movieId="m1" reviewId="r1" />);

    act(() => {
      capturedCallback?.('r1', { ...sampleAnalysis, sentiment_score: 2 }); // → 2/10
    });

    await waitFor(() => {
      const score = screen.getByLabelText('Sentiment score 2 out of 10');
      expect(score.className).toContain('text-red-400');
    });
  });

  it('applies yellow color for sentiment score that normalises to 5/10', async () => {
    render(<ReviewStatusBadge movieId="m1" reviewId="r1" />);

    act(() => {
      capturedCallback?.('r1', { ...sampleAnalysis, sentiment_score: 5 }); // → 5/10
    });

    await waitFor(() => {
      const score = screen.getByLabelText('Sentiment score 5 out of 10');
      expect(score.className).toContain('text-yellow-400');
    });
  });
});

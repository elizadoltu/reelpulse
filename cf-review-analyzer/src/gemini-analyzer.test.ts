import { describe, expect, it, vi } from 'vitest';
import { analyzeReviewWithRetries, type ReviewAnalysis } from './gemini-analyzer.js';
import type { ReviewSubmittedEvent } from './index.js';

describe('Gemini review analysis', () => {
  const event: ReviewSubmittedEvent = {
    eventId: 'event-1',
    reviewId: 'review-1',
    movieId: 'movie-1',
    userId: 'user@example.com',
    text: 'The acting was great, the plot was sharp, and the pacing worked well.',
    timestamp: '2026-04-26T10:00:00.000Z',
  };

  const validAnalysis: ReviewAnalysis = {
    sentiment_score: 8.5,
    themes: {
      acting: 'positive',
      plot: 'positive',
      visuals: 'not_mentioned',
      soundtrack: 'not_mentioned',
      pacing: 'positive',
    },
    spoiler_detected: false,
    summary: 'Strong acting and pacing.',
  };

  it('parses a valid Gemini JSON response', async () => {
    const generateText = vi.fn().mockResolvedValue(JSON.stringify(validAnalysis));

    const result = await analyzeReviewWithRetries(event, generateText);

    expect(result).toEqual(validAnalysis);
    expect(generateText).toHaveBeenCalledOnce();
    expect(generateText.mock.calls[0][0]).toContain('return only valid JSON');
  });

  it('strips markdown fences and succeeds when Gemini returns valid JSON on the third attempt', async () => {
    const generateText = vi
      .fn()
      .mockResolvedValueOnce('not json')
      .mockResolvedValueOnce(JSON.stringify({ ...validAnalysis, summary: 'x'.repeat(101) }))
      .mockResolvedValueOnce(`\`\`\`json\n${JSON.stringify(validAnalysis)}\n\`\`\``);

    const result = await analyzeReviewWithRetries(event, generateText);

    expect(result).toEqual(validAnalysis);
    expect(generateText).toHaveBeenCalledTimes(3);
  });

  it('throws after three invalid Gemini responses', async () => {
    const generateText = vi.fn().mockResolvedValue('not json');

    await expect(analyzeReviewWithRetries(event, generateText)).rejects.toThrow(
      'Gemini returned invalid review analysis after 3 attempts',
    );
    expect(generateText).toHaveBeenCalledTimes(3);
  });
});

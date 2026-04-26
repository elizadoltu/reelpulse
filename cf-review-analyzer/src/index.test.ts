import { describe, expect, it, vi } from 'vitest';
import {
  createReviewAnalyzerHandler,
  type ReviewProcessedEvent,
  type ReviewSubmittedEvent,
} from './index.js';
import type { ReviewAnalysis } from './gemini-analyzer.js';
import type { Request, Response } from '@google-cloud/functions-framework';

type TestDeps = Parameters<typeof createReviewAnalyzerHandler>[0] & {
  getReview: ReturnType<typeof vi.fn>;
  analyzeReview: ReturnType<typeof vi.fn>;
  persistAnalysis: ReturnType<typeof vi.fn>;
  publishReviewProcessed: ReturnType<typeof vi.fn>;
  log: { error: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };
};

function makePubSubRequest(event: ReviewSubmittedEvent): Request {
  return {
    body: {
      message: {
        data: Buffer.from(JSON.stringify(event)).toString('base64'),
      },
    },
  } as Request;
}

function makeResponse(): Response & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
} {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };

  response.status.mockReturnValue(response);
  return response;
}

describe('reviewAnalyzer', () => {
  const event: ReviewSubmittedEvent = {
    eventId: 'event-1',
    reviewId: 'review-1',
    movieId: 'movie-1',
    userId: 'user@example.com',
    text: 'This movie was atmospheric and beautifully acted.',
    timestamp: '2026-04-26T10:00:00.000Z',
  };

  const analysis: ReviewAnalysis = {
    sentiment_score: 8,
    themes: {
      acting: 'positive',
      plot: 'positive',
      visuals: 'not_mentioned',
      soundtrack: 'not_mentioned',
      pacing: 'positive',
    },
    spoiler_detected: false,
    summary: 'Strong review.',
  };

  function makeDeps(overrides: {
    getReview?: ReturnType<typeof vi.fn>;
    analyzeReview?: ReturnType<typeof vi.fn>;
    persistAnalysis?: ReturnType<typeof vi.fn>;
    publishReviewProcessed?: ReturnType<typeof vi.fn>;
    log?: { error: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };
  } = {}): TestDeps {
    return {
      getReview: overrides.getReview ?? vi.fn().mockResolvedValue({ status: 'pending' }),
      analyzeReview: overrides.analyzeReview ?? vi.fn().mockResolvedValue(analysis),
      persistAnalysis: overrides.persistAnalysis ?? vi.fn().mockResolvedValue(undefined),
      publishReviewProcessed:
        overrides.publishReviewProcessed ?? vi.fn().mockResolvedValue(undefined),
      log: overrides.log ?? { error: vi.fn(), info: vi.fn() },
    } as TestDeps;
  }

  it('skips already processed reviews without calling Gemini', async () => {
    const deps = makeDeps({
      getReview: vi.fn().mockResolvedValue({ status: 'processed' }),
    });
    const handler = createReviewAnalyzerHandler(deps);
    const res = makeResponse();

    await handler(makePubSubRequest(event), res);

    expect(deps.getReview).toHaveBeenCalledWith('review-1');
    expect(deps.analyzeReview).not.toHaveBeenCalled();
    expect(deps.persistAnalysis).not.toHaveBeenCalled();
    expect(deps.publishReviewProcessed).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'skipped', reviewId: 'review-1' });
  });

  it('updates Firestore before publishing ReviewProcessedEvent for pending reviews', async () => {
    const deps = makeDeps();
    const handler = createReviewAnalyzerHandler(deps);
    const res = makeResponse();

    await handler(makePubSubRequest(event), res);

    expect(deps.getReview).toHaveBeenCalledWith('review-1');
    expect(deps.analyzeReview).toHaveBeenCalledWith(event);
    expect(deps.persistAnalysis).toHaveBeenCalledWith(
      'review-1',
      analysis,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );
    expect(deps.publishReviewProcessed).toHaveBeenCalledWith({
      type: 'REVIEW_PROCESSED',
      reviewId: 'review-1',
      movieId: 'movie-1',
      userId: 'user@example.com',
      analysis,
    } satisfies ReviewProcessedEvent);
    expect(deps.persistAnalysis.mock.invocationCallOrder[0]).toBeLessThan(
      deps.publishReviewProcessed.mock.invocationCallOrder[0],
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'processed', reviewId: 'review-1' });
  });

  it('returns 500 when Gemini analysis fails after retries', async () => {
    const deps = makeDeps({
      analyzeReview: vi.fn().mockRejectedValue(new Error('invalid Gemini response')),
    });
    const handler = createReviewAnalyzerHandler(deps);
    const res = makeResponse();

    await handler(makePubSubRequest(event), res);

    expect(deps.analyzeReview).toHaveBeenCalledWith(event);
    expect(deps.persistAnalysis).not.toHaveBeenCalled();
    expect(deps.publishReviewProcessed).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Review processing failed',
      reviewId: 'review-1',
    });
  });

  it('returns 500 and does not publish when Firestore update fails', async () => {
    const deps = makeDeps({
      persistAnalysis: vi.fn().mockRejectedValue(new Error('firestore unavailable')),
    });
    const handler = createReviewAnalyzerHandler(deps);
    const res = makeResponse();

    await handler(makePubSubRequest(event), res);

    expect(deps.persistAnalysis).toHaveBeenCalledOnce();
    expect(deps.publishReviewProcessed).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Review processing failed',
      reviewId: 'review-1',
    });
  });

  it('returns 200 and logs error when Pub/Sub publish fails after Firestore success', async () => {
    const log = { error: vi.fn(), info: vi.fn() };
    const deps = makeDeps({
      publishReviewProcessed: vi.fn().mockRejectedValue(new Error('pubsub unavailable')),
      log,
    });
    const handler = createReviewAnalyzerHandler(deps);
    const res = makeResponse();

    await handler(makePubSubRequest(event), res);

    expect(deps.persistAnalysis).toHaveBeenCalledOnce();
    expect(deps.publishReviewProcessed).toHaveBeenCalledOnce();
    expect(log.error).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'processed', reviewId: 'review-1' });
  });
});

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Firestore } from '@google-cloud/firestore';
import errorsPlugin from '../plugins/errors.js';
import reviewStatusRoutes from '../routes/movies/movie_id/reviews/review-status-routes.js';
import { TEST } from '../utils/constants/constants.js';
import { MOVIE_REVIEW_STATUS_ENDPOINT } from '../utils/constants/constants.js';
import { HttpMethods, HttpStatusCodes } from '../utils/constants/enums.js';

const TEST_REVIEW_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const mockGet = vi.fn();
const mockDoc = vi.fn().mockReturnValue({ get: mockGet });
const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });

function buildTestApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  app.register(errorsPlugin);

  app.decorate('firestore', {
    collection: mockCollection,
  } as unknown as Firestore);

  app.register(reviewStatusRoutes);

  return app;
}

describe('GET /movies/:movie_id/reviews/:review_id/status', () => {
  let app: FastifyInstance;
  const statusUrl = MOVIE_REVIEW_STATUS_ENDPOINT(TEST.MAGIC_MOVIE_ID, TEST_REVIEW_ID);

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with pending status when review is awaiting analysis', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        status: 'pending',
        movieId: TEST.MAGIC_MOVIE_ID,
        userId: TEST.USER_EMAIL,
        text: 'This movie was absolutely fantastic and I loved every minute of it!',
        submittedAt: '2024-01-01T00:00:00.000Z',
      }),
    });

    const response = await app.inject({
      method: HttpMethods.GET,
      url: statusUrl,
    });

    expect(response.statusCode).toBe(HttpStatusCodes.OK);
    const body = response.json<{
      reviewId: string;
      status: string;
      analysis: null;
      processedAt: null;
    }>();
    expect(body.reviewId).toBe(TEST_REVIEW_ID);
    expect(body.status).toBe('pending');
    expect(body.analysis).toBeNull();
    expect(body.processedAt).toBeNull();
  });

  it('returns 200 with processed status and analysis object when review is complete', async () => {
    const processedAt = '2024-01-01T01:00:00.000Z';
    const analysis = {
      sentiment_score: 0.85,
      themes: {
        acting: 'positive',
        plot: 'neutral',
        visuals: 'positive',
        soundtrack: 'not_mentioned',
        pacing: 'positive',
      },
      spoiler_detected: false,
      summary: 'A well-crafted film with strong performances.',
    };

    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        status: 'processed',
        movieId: TEST.MAGIC_MOVIE_ID,
        userId: TEST.USER_EMAIL,
        text: 'This movie was absolutely fantastic and I loved every minute of it!',
        submittedAt: '2024-01-01T00:00:00.000Z',
        analysis,
        processedAt,
      }),
    });

    const response = await app.inject({
      method: HttpMethods.GET,
      url: statusUrl,
    });

    expect(response.statusCode).toBe(HttpStatusCodes.OK);
    const body = response.json<{
      reviewId: string;
      status: string;
      analysis: {
        sentiment_score: number;
        themes: {
          acting: string;
          plot: string;
          visuals: string;
          soundtrack: string;
          pacing: string;
        };
        spoiler_detected: boolean;
        summary: string;
      };
      processedAt: string;
    }>();
    expect(body.reviewId).toBe(TEST_REVIEW_ID);
    expect(body.status).toBe('processed');
    expect(body.processedAt).toBe(processedAt);
    expect(body.analysis).toEqual(analysis);
    expect(body.analysis.sentiment_score).toBe(0.85);
    expect(body.analysis.themes).toEqual({
      acting: 'positive',
      plot: 'neutral',
      visuals: 'positive',
      soundtrack: 'not_mentioned',
      pacing: 'positive',
    });
    expect(body.analysis.spoiler_detected).toBe(false);
    expect(body.analysis.summary).toBe('A well-crafted film with strong performances.');
  });

  it('returns 404 when review does not exist', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });

    const response = await app.inject({
      method: HttpMethods.GET,
      url: statusUrl,
    });

    expect(response.statusCode).toBe(HttpStatusCodes.NOT_FOUND);
  });
});

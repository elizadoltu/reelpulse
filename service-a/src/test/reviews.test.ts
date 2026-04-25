import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Firestore } from '@google-cloud/firestore';
import type { PubSub } from '@google-cloud/pubsub';
import errorsPlugin from '../plugins/errors.js';
import movieReviewsRoutes from '../routes/movies/movie_id/reviews/reviews-routes.js';
import { TEST } from '../utils/constants/constants.js';
import { HttpMethods, HttpStatusCodes } from '../utils/constants/enums.js';
import rateLimitPlugin from '../plugins/ratelimit.js';

const mockPublishMessage = vi.fn().mockResolvedValue('msg-id');
const mockFirestoreSet = vi.fn().mockResolvedValue(undefined);

function buildTestApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  app.register(errorsPlugin);
  app.register(rateLimitPlugin);

  app.decorate('jwt', {
    sign: vi.fn(),
    decode: vi.fn().mockReturnValue({
      name: TEST.USER_NAME,
      email: TEST.USER_EMAIL,
      password: TEST.USER_PASSWORD,
    }),
    verify: vi.fn(),
  });

  app.decorate('dataStore', {
    fetchMovie: vi.fn().mockResolvedValue({
      _id: TEST.MAGIC_MOVIE_ID,
      title: TEST.TEST_MOVIE.title,
      type: TEST.TEST_MOVIE.type,
      year: TEST.TEST_MOVIE.year,
    }),
  } as unknown as FastifyInstance['dataStore']);

  app.decorate('pubsub', {
    topic: vi.fn().mockReturnValue({
      publishMessage: mockPublishMessage,
    }),
  } as unknown as PubSub);

  app.decorate('firestore', {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        set: mockFirestoreSet,
      }),
    }),
  } as unknown as Firestore);

  app.register(movieReviewsRoutes);

  return app;
}

describe('POST /movies/:movie_id/reviews', () => {
  let app: FastifyInstance;
  const reviewsUrl = `/movies/${TEST.MAGIC_MOVIE_ID}/reviews`;
  const validText = 'This movie was absolutely fantastic and I loved every minute of it!';

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 202 with correct body for valid submission', async () => {
    mockFirestoreSet.mockClear();
    mockPublishMessage.mockClear();

    const response = await app.inject({
      method: HttpMethods.POST,
      url: reviewsUrl,
      payload: { text: validText },
      headers: { authorization: 'Bearer some-token' },
    });

    expect(response.statusCode).toBe(HttpStatusCodes.ACCEPTED);
    const body = response.json<{ reviewId: string; status: string; message: string }>();
    expect(body.reviewId).toBeDefined();
    expect(typeof body.reviewId).toBe('string');
    expect(body.status).toBe('pending');
    expect(body.message).toBe('Review submitted for analysis');

    expect(mockFirestoreSet).toHaveBeenCalledOnce();
    expect(mockFirestoreSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        movieId: TEST.MAGIC_MOVIE_ID,
        userId: TEST.USER_EMAIL,
        text: validText,
        submittedAt: expect.any(String),
      }),
    );

    await new Promise((resolve) => setImmediate(resolve));

    expect(mockPublishMessage).toHaveBeenCalledOnce();
    const publishedData = JSON.parse(mockPublishMessage.mock.calls[0][0].data.toString()) as {
      eventId: string;
      reviewId: string;
      movieId: string;
      userId: string;
      text: string;
      timestamp: string;
    };
    expect(publishedData.reviewId).toBe(body.reviewId);
    expect(publishedData.movieId).toBe(TEST.MAGIC_MOVIE_ID);
    expect(publishedData.userId).toBe(TEST.USER_EMAIL);
    expect(publishedData.text).toBe(validText);
    expect(publishedData.eventId).toBeDefined();
    expect(publishedData.timestamp).toBeDefined();
  });

  it('returns 400 when text is too short', async () => {
    const response = await app.inject({
      method: HttpMethods.POST,
      url: reviewsUrl,
      payload: { text: 'Short' },
      headers: { authorization: 'Bearer some-token' },
    });

    expect(response.statusCode).toBe(HttpStatusCodes.BAD_REQUEST);
  });

  it('returns 401 when not authenticated', async () => {
    const response = await app.inject({
      method: HttpMethods.POST,
      url: reviewsUrl,
      payload: { text: validText },
    });

    expect(response.statusCode).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    const MAX_REQUESTS = 60;

    const authHeader = { authorization: 'Bearer some-token' };
    for (let i = 0; i < MAX_REQUESTS; i++) {
      await app.inject({
        method: HttpMethods.POST,
        url: reviewsUrl,
        payload: { text: validText },
        headers: authHeader,
      });
    }
    const blockedResponse = await app.inject({
      method: HttpMethods.POST,
      url: reviewsUrl,
      payload: { text: validText },
      headers: authHeader,
    });

    expect(blockedResponse.statusCode).toBe(429);

    const body = blockedResponse.json();
    //console.log(body);
    expect(body.detail).toMatch(/rate limit exceeded/i);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  bqQuery: vi.fn().mockResolvedValue([[]]),
  psPublish: vi.fn().mockResolvedValue('message-id-123'),
  psTopic: vi.fn().mockReturnThis(),
  aiGenerate: vi.fn().mockResolvedValue({
    response: {
      candidates: [{ content: { parts: [{ text: 'Mocked AI Narrative' }] } }]
    }
  }),
  aiGetModel: vi.fn().mockReturnThis(),
}));

vi.mock('@google-cloud/bigquery', () => ({
  BigQuery: vi.fn().mockImplementation(() => ({
    query: mocks.bqQuery,
  })),
}));

vi.mock('@google-cloud/pubsub', () => ({
  PubSub: vi.fn().mockImplementation(() => ({
    topic: mocks.psTopic.mockImplementation(() => ({
      publishMessage: mocks.psPublish,
    })),
  })),
}));

vi.mock('@google-cloud/vertexai', () => ({
  VertexAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: mocks.aiGetModel.mockImplementation(() => ({
      generateContent: mocks.aiGenerate,
    })),
  })),
}));

import { schedulerHandler } from '../src/scheduler.js';

const app = express();
app.use(express.json());
app.all('/test', schedulerHandler);

describe('Scheduler Analytics Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate trending analytics and publish to Pub/Sub', async () => {
    // Setup BigQuery mock data (Matches your schema: movieId, genre, views)
    mocks.bqQuery.mockResolvedValueOnce([[
      { movieId: 'movie_1', genre: 'Sci-Fi, Action', views: 500 },
      { movieId: 'movie_2', genre: 'Drama', views: 300 }
    ]]);

    const res = await request(app).get('/test');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('published successfully');


    expect(mocks.aiGenerate).toHaveBeenCalledWith(
      expect.stringContaining('movie_1 (Sci-Fi, Action): 500 views')
    );

    expect(mocks.psTopic).toHaveBeenCalledWith('review-processed');
    expect(mocks.psPublish).toHaveBeenCalledWith({
      data: expect.any(Buffer)
    });

    const buffer = mocks.psPublish.mock.calls[0][0].data;
    const payload = JSON.parse(buffer.toString());

    expect(payload.type).toBe('ANALYTICS_UPDATE');
    expect(payload.genres).toEqual(expect.arrayContaining(['Sci-Fi', 'Action', 'Drama']));
    expect(payload.aiNarrative).toBe('Mocked AI Narrative');
    expect(payload.trending).toHaveLength(2);
  });

  it('should return 500 if the AI generation fails', async () => {
    mocks.bqQuery.mockResolvedValueOnce([[{ movieId: '1', genre: 'A', views: 1 }]]);
    mocks.aiGenerate.mockRejectedValue(new Error('Gemini Overloaded'));

    const res = await request(app).get('/test');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to generate narrative');

    expect(mocks.psPublish).not.toHaveBeenCalled();
  });
});
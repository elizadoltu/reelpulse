import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  insert: vi.fn().mockResolvedValue([{}]),
  table: vi.fn().mockReturnThis(),
  dataset: vi.fn().mockReturnThis(),
}));

vi.mock('@google-cloud/bigquery', () => {
  return {
    BigQuery: vi.fn().mockImplementation(() => ({
      dataset: mocks.dataset,
      table: mocks.table,
      insert: mocks.insert,
    })),
  };
});

import { analyticsProcessorHandler as analyticsprocessor } from '../src/index.js';

describe('Analyticsprocessor Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dataset.mockReturnThis();
    mocks.table.mockReturnThis();
  });

  it('should process a Pub/Sub message and send it to BigQuery', async () => {
    const payload = {
      eventId: 'uuid-1234',
      movieId: 'movie-99',
      userId: 'user-77',
      genre: ['Action', 'Thriller'],
      timestamp: '2026-04-24T14:00:00Z',
    };

    const mockCloudEvent = {
      data: {
        message: {
          data: Buffer.from(JSON.stringify(payload)).toString('base64'),
        },
      },
    };

    await analyticsprocessor(mockCloudEvent);

    expect(mocks.dataset).toHaveBeenCalledWith('reelpulse');
    expect(mocks.table).toHaveBeenCalledWith('movie_views');
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'uuid-1234',
        genre: 'Action, Thriller',
        userId: 'user-77',
        timestamp: expect.any(Date)
      })
    );
  });

  it('should handle missing userId by defaulting to "none"', async () => {
    const payload = {
      eventId: 'uuid-555',
      movieId: 'movie-1',
      genre: 'Comedy',
      timestamp: '2026-04-24T14:00:00Z',
    };

    const mockCloudEvent = {
      data: {
        message: {
          data: Buffer.from(JSON.stringify(payload)).toString('base64'),
        },
      },
    };

    await analyticsprocessor(mockCloudEvent);

    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'none',
        genre: '-',
        movieId: "movie-1",
        sessionId: "uuid-555",
        timestamp: new Date('2026-04-24T14:00:00Z')
      })
    );
  });
});
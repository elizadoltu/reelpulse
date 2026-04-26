import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  insert: vi.fn().mockResolvedValue([{}]),
  table: vi.fn().mockReturnThis(),
  dataset: vi.fn().mockReturnThis(),
  query: vi.fn().mockResolvedValue([[]]),
}));

vi.mock('@google-cloud/bigquery', () => {
  return {
    BigQuery: vi.fn().mockImplementation(() => ({
      dataset: mocks.dataset,
      table: mocks.table,
      insert: mocks.insert,
      query: mocks.query,
    })),
  };
});

import { analyticsProcessorHandler as analyticsprocessor } from '../src/analyzer.js';

describe('Analyticsprocessor Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dataset.mockReturnThis();
    mocks.table.mockReturnThis();
    mocks.query.mockResolvedValue([[]]);
  });

  it('should process a Pub/Sub message and send it to BigQuery', async () => {
    const payload = {
      eventId: 'uuid-1234',
      movieId: 'movie-99',
      userId: 'user-77',
      genres: ['Action', 'Thriller'],
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
    expect.arrayContaining([
      expect.objectContaining({
        insertId: 'uuid-1234', // The new idempotency key
        json: expect.objectContaining({ // The row data is now inside 'json'
          sessionId: 'uuid-1234',
          genre: 'Action, Thriller',
          userId: 'user-77',
          timestamp: expect.any(Date)
        })
      })
    ])
  );
  });

  it('should handle missing userId by defaulting to "none"', async () => {
    const payload = {
      eventId: 'uuid-555',
      movieId: 'movie-1',
      genres: 'Comedy',
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
    expect.arrayContaining([
      expect.objectContaining({
        insertId: 'uuid-555', // The new idempotency key
        json: expect.objectContaining({ // The row data is now inside 'json'
          sessionId: 'uuid-555',
          genre: '-',
          userId: 'none',
          movieId: "movie-1",
          timestamp: expect.any(Date)
        })
      })
    ])
  );
  });

  it('should skip insertion if event already exists', async () => {
    mocks.query.mockResolvedValueOnce([[{ exists: 1 }]]);

    const payload = {
      eventId: 'uuid-exists',
      movieId: 'movie-1',
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

    expect(mocks.query).toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
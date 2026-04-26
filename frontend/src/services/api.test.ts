import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { apiClient, submitReview, getMovies, getMovie, getReviewStatus, clearToken, setToken } from './api.js';

const mock = new MockAdapter(apiClient);

beforeEach(() => {
  mock.reset();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('submitReview', () => {
  it('POSTs to the correct URL and returns reviewId + status', async () => {
    const movieId = 'abc123';
    const text = 'This movie was absolutely fantastic!';
    const responsePayload = { reviewId: 'rev-1', status: 'pending', message: 'Under review' };

    mock.onPost(`/movies/${movieId}/reviews`).reply(202, responsePayload);

    const result = await submitReview(movieId, text);

    expect(mock.history.post).toHaveLength(1);
    expect(mock.history.post[0].url).toBe(`/movies/${movieId}/reviews`);
    expect(JSON.parse(mock.history.post[0].data as string)).toEqual({ text });
    expect(result).toEqual(responsePayload);
    expect(result.reviewId).toBe('rev-1');
    expect(result.status).toBe('pending');
  });
});

describe('401 interceptor', () => {
  it('clears the token from localStorage on 401 response', async () => {
    setToken('my-jwt-token');
    expect(localStorage.getItem('auth_token')).toBe('my-jwt-token');

    mock.onGet('/movies').reply(401, { message: 'Unauthorized' });

    // We replace window.location.href to avoid navigation errors in jsdom
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    });

    try {
      await getMovies(1);
    } catch {
      // expected to throw
    }

    expect(localStorage.getItem('auth_token')).toBeNull();

    Object.defineProperty(window, 'location', { writable: true, value: originalLocation });
  });
});

describe('getMovies', () => {
  it('sends page and pageSize query params', async () => {
    mock.onGet('/movies').reply(200, { data: [], page: 1, pageSize: 20, totalCount: 0 });

    await getMovies(1);

    expect(mock.history.get[0].params).toMatchObject({ page: 1, pageSize: 20 });
  });

  it('sends filter param when search term is provided', async () => {
    mock.onGet('/movies').reply(200, { data: [], page: 1, pageSize: 20, totalCount: 0 });

    await getMovies(1, 'Inception');

    expect(mock.history.get[0].params).toMatchObject({ filter: 'title:Inception' });
  });
});

describe('getReviewStatus', () => {
  it('GETs from the correct status URL', async () => {
    const payload = { reviewId: 'rev-1', status: 'processed', analysis: null, processedAt: null };
    mock.onGet('/movies/m1/reviews/rev-1/status').reply(200, payload);

    const result = await getReviewStatus('m1', 'rev-1');
    expect(result).toEqual(payload);
  });
});

describe('request interceptor', () => {
  it('attaches Bearer token when one is stored', async () => {
    setToken('test-token');
    mock.onGet('/movies/m1').reply(200, { _id: 'm1', title: 'Test', type: 'movie', year: 2020 });

    await getMovie('m1');

    expect(mock.history.get[0].headers?.Authorization).toBe('Bearer test-token');
  });

  it('does not attach Authorization header when no token', async () => {
    clearToken();
    mock.onGet('/movies/m1').reply(200, { _id: 'm1', title: 'Test', type: 'movie', year: 2020 });

    await getMovie('m1');

    expect(mock.history.get[0].headers?.Authorization).toBeUndefined();
  });
});

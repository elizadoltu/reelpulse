import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MovieDetail from './MovieDetail.js';
import * as api from '@/services/api.js';

vi.mock('@/services/api.js');

const mockGetMovie = vi.mocked(api.getMovie);

const fullMovie = {
  _id: 'm1',
  title: 'Inception',
  type: 'movie' as const,
  year: 2010,
  genres: ['Sci-Fi', 'Thriller'],
  plot: 'A thief who steals corporate secrets.',
  runtime: 148,
  rated: 'PG-13',
  imdb: { id: 'tt1375666', rating: 8.8, votes: 2000000 },
  directors: ['Christopher Nolan'],
};

function renderMovieDetail(id = 'm1') {
  return render(
    <MemoryRouter
      initialEntries={[`/movies/${id}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/movies/:id" element={<MovieDetail />} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MovieDetail', () => {
  it('renders movie data from the mocked API', async () => {
    mockGetMovie.mockResolvedValue(fullMovie);

    renderMovieDetail();

    await waitFor(() => {
      expect(screen.getByText('Inception')).toBeDefined();
      expect(screen.getByText('2010')).toBeDefined();
      expect(screen.getByText('148 min')).toBeDefined();
      expect(screen.getByText('PG-13')).toBeDefined();
      expect(screen.getByText('8.8 IMDb')).toBeDefined();
      expect(screen.getByText('Sci-Fi')).toBeDefined();
      expect(screen.getByText('Thriller')).toBeDefined();
      expect(screen.getByText(/A thief who steals/)).toBeDefined();
    });
  });

  it('shows loading skeletons while fetching', () => {
    mockGetMovie.mockReturnValue(new Promise(() => {}));

    renderMovieDetail();

    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows 404 state when movie is not found', async () => {
    const notFoundError = Object.assign(new Error('Not found'), {
      response: { status: 404 },
    });
    mockGetMovie.mockRejectedValue(notFoundError);

    renderMovieDetail('nonexistent');

    await waitFor(() => {
      expect(screen.getByText(/movie not found/i)).toBeDefined();
    });
  });

  it('renders the review form', async () => {
    mockGetMovie.mockResolvedValue(fullMovie);

    renderMovieDetail();

    await waitFor(() => {
      expect(screen.getByText(/write a review/i)).toBeDefined();
      expect(screen.getByPlaceholderText(/share your thoughts/i)).toBeDefined();
    });
  });

  it('renders the reviews section heading', async () => {
    mockGetMovie.mockResolvedValue(fullMovie);

    renderMovieDetail();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Reviews' })).toBeDefined();
    });
  });

  it('triggers analytics by calling getMovie on mount', async () => {
    mockGetMovie.mockResolvedValue(fullMovie);

    renderMovieDetail('m1');

    await waitFor(() => {
      expect(mockGetMovie).toHaveBeenCalledWith('m1');
    });
  });
});

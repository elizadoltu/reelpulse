import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MovieList from './MovieList.js';
import * as api from '@/services/api.js';

vi.mock('@/services/api.js');

const mockGetMovies = vi.mocked(api.getMovies);

const makeMovie = (id: string, title: string) => ({
  _id: id,
  title,
  type: 'movie' as const,
  year: 2020,
  genres: ['Drama'],
});

function renderMovieList() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <MovieList />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MovieList', () => {
  it('renders a list of movies from the mocked API', async () => {
    mockGetMovies.mockResolvedValue({
      data: [makeMovie('1', 'Inception'), makeMovie('2', 'The Matrix')],
      page: 1,
      pageSize: 20,
      totalCount: 2,
    });

    renderMovieList();

    await waitFor(() => {
      expect(screen.getByText('Inception')).toBeDefined();
      expect(screen.getByText('The Matrix')).toBeDefined();
    });
  });

  it('shows loading skeletons while fetching', () => {
    mockGetMovies.mockReturnValue(new Promise(() => {}));

    renderMovieList();

    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('search input debounces and calls API with the search term', async () => {
    mockGetMovies.mockResolvedValue({ data: [], page: 1, pageSize: 20, totalCount: 0 });

    renderMovieList();

    await waitFor(() => expect(mockGetMovies).toHaveBeenCalledTimes(1));

    const searchInput = screen.getByRole('searchbox');
    await userEvent.type(searchInput, 'Inc');

    // Within debounce window only 1 more call should be made
    await waitFor(
      () => {
        const calls = mockGetMovies.mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall[1]).toBe('Inc');
      },
      { timeout: 1000 },
    );
  });

  it('shows error state with a retry button when the API fails', async () => {
    mockGetMovies.mockRejectedValue(new Error('Network error'));

    renderMovieList();

    await waitFor(() => {
      expect(screen.getByText(/failed to load movies/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();
    });
  });

  it('retry button re-fetches movies', async () => {
    mockGetMovies.mockRejectedValueOnce(new Error('fail'));
    mockGetMovies.mockResolvedValue({
      data: [makeMovie('1', 'Inception')],
      page: 1,
      pageSize: 20,
      totalCount: 1,
    });

    renderMovieList();

    await waitFor(() => screen.getByRole('button', { name: /retry/i }));

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.getByText('Inception')).toBeDefined());
  });
});

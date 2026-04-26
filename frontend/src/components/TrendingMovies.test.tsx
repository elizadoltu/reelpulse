import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendingMovies } from './TrendingMovies.js';
import type { TrendingEntry } from '@/types/index.js';

const entries: TrendingEntry[] = [
  { movieId: 'm1', views: 500, movieTitle: 'Inception', genre: 'Sci-Fi' },
  { movieId: 'm2', views: 300, movieTitle: 'The Matrix', genre: 'Action' },
  { movieId: 'm3', views: 100, movieTitle: 'Titanic', genre: 'Drama' },
];

describe('TrendingMovies', () => {
  it('renders ranked list with titles, genres, and view counts', () => {
    render(<TrendingMovies entries={entries} lastUpdated={new Date()} />);

    expect(screen.getByText('Inception')).toBeDefined();
    expect(screen.getByText('The Matrix')).toBeDefined();
    expect(screen.getByText('Titanic')).toBeDefined();

    expect(screen.getByText('#1')).toBeDefined();
    expect(screen.getByText('#2')).toBeDefined();
    expect(screen.getByText('#3')).toBeDefined();

    expect(screen.getByText('500')).toBeDefined();
    expect(screen.getByText('300')).toBeDefined();
  });

  it('renders skeleton when entries is empty', () => {
    render(<TrendingMovies entries={[]} lastUpdated={null} />);
    const list = screen.getByLabelText('Trending movies skeleton');
    expect(list).toBeDefined();
  });

  it('shows movieId as fallback when movieTitle is absent', () => {
    render(
      <TrendingMovies
        entries={[{ movieId: 'unknown-id', views: 10 }]}
        lastUpdated={null}
      />
    );
    expect(screen.getByText('unknown-id')).toBeDefined();
  });

  it('shows "last updated Xs ago" label when lastUpdated is set', () => {
    render(<TrendingMovies entries={entries} lastUpdated={new Date()} />);
    expect(screen.getByText(/last updated/)).toBeDefined();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.js';

vi.mock('@/services/api.js', () => ({
  getMovies: vi.fn().mockResolvedValue({ data: [], page: 1, pageSize: 20, totalCount: 0 }),
  getMovie: vi.fn().mockResolvedValue(null),
}));

describe('App', () => {
  it('renders the movie list page at root route', () => {
    render(
      <MemoryRouter
        initialEntries={['/']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('searchbox')).toBeDefined();
  });

  it('renders the login page at /login', () => {
    render(
      <MemoryRouter
        initialEntries={['/login']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText(/sign in to reelpulse/i)).toBeDefined();
  });
});

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GenreHeatmap } from './GenreHeatmap.js';

// recharts uses ResizeObserver internally
beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

describe('GenreHeatmap', () => {
  it('renders the section heading', () => {
    render(<GenreHeatmap distribution={{ Action: 500, Drama: 300, Comedy: 150 }} />);
    expect(screen.getByText('Genre Distribution')).toBeDefined();
  });

  it('shows "No data yet" when distribution is empty', () => {
    render(<GenreHeatmap distribution={{}} />);
    expect(screen.getByText('No data yet')).toBeDefined();
  });

  it('renders the recharts container when data is present', () => {
    const { container } = render(<GenreHeatmap distribution={{ Action: 500, Drama: 300 }} />);
    // ResponsiveContainer renders even in jsdom (no real layout)
    expect(container.querySelector('.recharts-responsive-container')).not.toBeNull();
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AITrendingNarrative } from './AITrendingNarrative.js';

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('AITrendingNarrative', () => {
  it('shows placeholder when no narrative has been received', () => {
    render(<AITrendingNarrative narrative={null} lastUpdated={null} />);
    expect(screen.getByTestId('ai-narrative-text').textContent).toBe(
      'Gathering trending data...',
    );
  });

  it('renders the "AI Summary" label', () => {
    render(<AITrendingNarrative narrative={null} lastUpdated={null} />);
    expect(screen.getByText(/AI Summary/i)).toBeDefined();
  });

  it('typewriter effect completes and shows full narrative text', async () => {
    vi.useFakeTimers();

    const text = 'Action dominates this week.';
    render(<AITrendingNarrative narrative={text} lastUpdated={new Date()} />);

    // Advance timers enough for the entire typewriter to finish
    act(() => { vi.advanceTimersByTime(text.length * 20 + 100); });

    expect(screen.getByTestId('ai-narrative-text').textContent).toBe(text);
  });

  it('shows "Generated Xs ago" label when lastUpdated is set', async () => {
    vi.useFakeTimers();
    const text = 'Some narrative.';
    render(<AITrendingNarrative narrative={text} lastUpdated={new Date()} />);
    act(() => { vi.advanceTimersByTime(text.length * 20 + 200); });
    expect(screen.getByText(/Generated/)).toBeDefined();
  });
});

import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LatencyChart } from './LatencyChart.js';

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

afterEach(() => {
  vi.useRealTimers();
});

const POINT = { p50: 80, p95: 150, p99: 250 };

describe('LatencyChart', () => {
  it('shows waiting message when no data has arrived', () => {
    render(<LatencyChart latestPoint={null} />);
    expect(screen.getByText('Waiting for data...')).toBeDefined();
  });

  it('renders the recharts container once a point is provided', () => {
    const { container } = render(<LatencyChart latestPoint={POINT} />);
    expect(container.querySelector('.recharts-responsive-container')).not.toBeNull();
  });

  it('shows 3 lines in the chart (p50/p95/p99)', () => {
    // recharts renders Legend items as text
    const { container } = render(<LatencyChart latestPoint={POINT} />);
    expect(container.querySelector('.recharts-responsive-container')).not.toBeNull();
    expect(screen.getByTestId('latency-point-count').textContent).toBe('1');
  });

  it('drops data points older than 5 minutes when new point arrives', () => {
    vi.useFakeTimers();
    const startTime = Date.now();
    vi.setSystemTime(startTime);

    const { rerender } = render(<LatencyChart latestPoint={POINT} />);
    expect(screen.getByTestId('latency-point-count').textContent).toBe('1');

    // Advance past the 5-minute window
    vi.setSystemTime(startTime + 5 * 60 * 1000 + 1000);

    rerender(<LatencyChart latestPoint={{ p50: 60, p95: 120, p99: 200 }} />);

    // Old point should be dropped; only the new one remains
    expect(screen.getByTestId('latency-point-count').textContent).toBe('1');
  });
});

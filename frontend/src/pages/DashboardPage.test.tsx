import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage.js';
import type { WsMessage } from '@/types/index.js';

// ---------------------------------------------------------------------------
// Mock useWebSocket — vi.hoisted ensures the fn exists before mock factory runs
// ---------------------------------------------------------------------------
const { mockUseWebSocket } = vi.hoisted(() => ({
  mockUseWebSocket: vi.fn().mockReturnValue({
    status: 'disconnected' as const,
    lastMessage: null,
    send: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWebSocket.js', () => ({
  useWebSocket: mockUseWebSocket,
}));

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(performance.now());
    return 0;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

beforeEach(() => {
  mockUseWebSocket.mockReturnValue({ status: 'disconnected', lastMessage: null, send: vi.fn() });
  vi.clearAllMocks();
  mockUseWebSocket.mockReturnValue({ status: 'disconnected', lastMessage: null, send: vi.fn() });
});

function renderDashboard() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  it('renders all left-panel analytics components', () => {
    renderDashboard();
    expect(screen.getByText('Analytics Dashboard')).toBeDefined();
    expect(screen.getByText(/AI Summary/i)).toBeDefined();
    expect(screen.getByText('Trending Movies')).toBeDefined();
    expect(screen.getByText('Genre Distribution')).toBeDefined();
    expect(screen.getByText('Review Latency')).toBeDefined();
    expect(screen.getByText('active users')).toBeDefined();
  });

  it('renders the right panel heading', () => {
    renderDashboard();
    expect(screen.getByText('Recent Reviews')).toBeDefined();
  });

  it('shows WSStatusDot reflecting connection state', () => {
    renderDashboard();
    expect(screen.getByText('Disconnected')).toBeDefined();
  });

  it('appends incoming REVIEW_PROCESSED message to the review feed', () => {
    const reviewMsg: WsMessage = {
      type: 'REVIEW_PROCESSED',
      reviewId: 'r-1',
      movieId: 'm-1',
      movieTitle: 'The Matrix',
      analysis: {
        sentiment_score: 8,
        themes: { acting: 'positive', plot: 'positive', visuals: 'positive', soundtrack: 'not_mentioned', pacing: 'neutral' },
        spoiler_detected: false,
        summary: 'A groundbreaking sci-fi film.',
      },
    };

    mockUseWebSocket.mockReturnValue({ status: 'connected', lastMessage: reviewMsg, send: vi.fn() });

    act(() => { renderDashboard(); });

    expect(screen.getByText('The Matrix')).toBeDefined();
    expect(screen.getByText('A groundbreaking sci-fi film.')).toBeDefined();
  });
});

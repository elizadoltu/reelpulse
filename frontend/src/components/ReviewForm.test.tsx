import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReviewForm from './ReviewForm.js';

vi.mock('@/services/api.js', () => ({
  submitReview: vi.fn(),
}));

import { submitReview } from '@/services/api.js';

const mockSubmit = vi.mocked(submitReview);
const onSubmitted = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ReviewForm', () => {
  it('disables submit button when text is under 10 characters', () => {
    render(<ReviewForm movieId="m1" onSubmitted={onSubmitted} />);

    const btn = screen.getByRole('button', { name: /submit review/i });
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'short' } });
    expect(btn).toBeDisabled();
  });

  it('calls submitReview and invokes onSubmitted with result on valid submission', async () => {
    const result = { reviewId: 'rev-1', status: 'pending' as const, message: 'Under review' };
    mockSubmit.mockResolvedValue(result);

    render(<ReviewForm movieId="m1" onSubmitted={onSubmitted} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'This is a valid review text' },
    });

    const btn = screen.getByRole('button', { name: /submit review/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith('m1', 'This is a valid review text');
      expect(onSubmitted).toHaveBeenCalledWith(result);
    });
  });

  it('shows countdown toast when API responds with 429', async () => {
    const rateErr = Object.assign(new Error('rate limited'), {
      isAxiosError: true,
      response: { status: 429 },
    });
    mockSubmit.mockRejectedValue(rateErr);

    render(<ReviewForm movieId="m1" onSubmitted={onSubmitted} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'This is a long enough review text' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit review/i }));

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toMatch(
        /Too many submissions, please wait 10 seconds/i,
      );
    });
  });

  it('shows auth toast when API responds with 401', async () => {
    const authErr = Object.assign(new Error('unauthorized'), {
      isAxiosError: true,
      response: { status: 401 },
    });
    mockSubmit.mockRejectedValue(authErr);

    render(<ReviewForm movieId="m1" onSubmitted={onSubmitted} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'This is a valid review text' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit review/i }));

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toMatch(/please log in/i);
    });
  });
});

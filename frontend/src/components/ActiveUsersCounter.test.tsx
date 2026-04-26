import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActiveUsersCounter } from './ActiveUsersCounter.js';

beforeAll(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(performance.now());
    return 0;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

describe('ActiveUsersCounter', () => {
  it('displays the count when connected', () => {
    render(<ActiveUsersCounter count={42} connected={true} />);
    expect(screen.getByText('42')).toBeDefined();
    expect(screen.getByText('active users')).toBeDefined();
  });

  it('displays 0 when disconnected regardless of count prop', () => {
    render(<ActiveUsersCounter count={99} connected={false} />);
    expect(screen.getByText('0')).toBeDefined();
  });

  it('applies pulsing green dot when connected', () => {
    const { container } = render(<ActiveUsersCounter count={10} connected={true} />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot?.className).toContain('bg-green-500');
    expect(dot?.className).toContain('animate-pulse');
  });

  it('applies grey dot when disconnected', () => {
    const { container } = render(<ActiveUsersCounter count={10} connected={false} />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot?.className).toContain('bg-gray-500');
  });
});

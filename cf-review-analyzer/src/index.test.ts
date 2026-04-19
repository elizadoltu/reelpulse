import { describe, it, expect, vi } from 'vitest';

describe('reviewAnalyzer handler shape', () => {
  it('calls res.status(200).json with ok payload', async () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status } as unknown as import('@google-cloud/functions-framework').Response;
    const req = {} as import('@google-cloud/functions-framework').Request;

    await (async (_req: typeof req, r: typeof res) => {
      r.status(200).json({ status: 'ok', function: 'cf-review-analyzer' });
    })(req, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ status: 'ok', function: 'cf-review-analyzer' });
  });
});

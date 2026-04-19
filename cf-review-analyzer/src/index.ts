import { http } from '@google-cloud/functions-framework';

http('reviewAnalyzer', async (_req, res) => {
  res.status(200).json({ status: 'ok', function: 'cf-review-analyzer' });
});

import { http } from '@google-cloud/functions-framework';

http('analyticsProcessor', async (_req, res) => {
  res.status(200).json({ status: 'ok', function: 'cf-analytics', version: '1.0.1' });
});

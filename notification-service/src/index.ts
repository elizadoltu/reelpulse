import { buildApp } from './app.js';

const app = await buildApp();
const port = Number.parseInt(process.env.PORT ?? '8080', 10);

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

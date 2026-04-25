import { PubSub } from '@google-cloud/pubsub';
import { buildApp } from './app.js';
import type { PubSubSubscription } from './pubsub-subscriber.js';

let subscription: PubSubSubscription | undefined;

if (process.env.MOCK_PUBSUB !== 'true') {
  const projectId = process.env.GCP_PROJECT_ID;
  const subscriptionName =
    process.env.PUBSUB_SUBSCRIPTION_REVIEW_PROCESSED ?? 'review-processed-sub';
  const pubsub = new PubSub({ projectId });
  subscription = pubsub.subscription(subscriptionName) as unknown as PubSubSubscription;
}

const app = await buildApp({ subscription });
const port = Number.parseInt(process.env.PORT ?? '8080', 10);

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

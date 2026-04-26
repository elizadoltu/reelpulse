import { http, type Request, type Response } from '@google-cloud/functions-framework';
import { Firestore } from '@google-cloud/firestore';
import { PubSub } from '@google-cloud/pubsub';
import {
  analyzeReviewWithGemini,
  type ReviewAnalysis,
} from './gemini-analyzer.js';

export type ReviewSubmittedEvent = {
  eventId: string;
  reviewId: string;
  movieId: string;
  userId: string | null;
  text: string;
  timestamp: string;
};

type ReviewDocument = {
  status?: string;
};

type PubSubPushBody = {
  message?: {
    data?: string;
  };
};

type ReviewAnalyzerDeps = {
  getReview: (reviewId: string) => Promise<ReviewDocument | null>;
  analyzeReview: (event: ReviewSubmittedEvent) => Promise<ReviewAnalysis>;
  persistAnalysis: (
    reviewId: string,
    analysis: ReviewAnalysis,
    processedAt: string,
  ) => Promise<void>;
  publishReviewProcessed: (event: ReviewProcessedEvent) => Promise<void>;
  log?: Pick<Console, 'error' | 'info'>;
};

export type ReviewProcessedEvent = {
  type: 'REVIEW_PROCESSED';
  reviewId: string;
  movieId: string;
  userId: string | null;
  analysis: ReviewAnalysis;
};

function decodeReviewSubmittedEvent(body: PubSubPushBody): ReviewSubmittedEvent {
  const base64Data = body.message?.data;

  if (base64Data === undefined) {
    throw new Error('Missing Pub/Sub message data');
  }

  return JSON.parse(Buffer.from(base64Data, 'base64').toString('utf8')) as ReviewSubmittedEvent;
}

export function createReviewAnalyzerHandler(deps: ReviewAnalyzerDeps) {
  return async (req: Request, res: Response): Promise<void> => {
    let event: ReviewSubmittedEvent;

    try {
      event = decodeReviewSubmittedEvent(req.body as PubSubPushBody);
    } catch (err) {
      deps.log?.error('Failed to decode ReviewSubmittedEvent', err);
      res.status(400).json({ error: 'Invalid Pub/Sub message' });
      return;
    }

    try {
      const review = await deps.getReview(event.reviewId);

      if (review?.status === 'processed') {
        deps.log?.info(`Review ${event.reviewId} already processed, skipping`);
        res.status(200).json({ status: 'skipped', reviewId: event.reviewId });
        return;
      }

      if (review?.status !== 'pending') {
        res.status(404).json({ error: 'Review not found or not pending', reviewId: event.reviewId });
        return;
      }

      const analysis = await deps.analyzeReview(event);
      const processedAt = new Date().toISOString();

      await deps.persistAnalysis(event.reviewId, analysis, processedAt);

      try {
        await deps.publishReviewProcessed({
          type: 'REVIEW_PROCESSED',
          reviewId: event.reviewId,
          movieId: event.movieId,
          userId: event.userId,
          analysis,
        });
      } catch (err) {
        deps.log?.error(`Failed to publish ReviewProcessedEvent for ${event.reviewId}`, err);
      }

      res.status(200).json({ status: 'processed', reviewId: event.reviewId });
    } catch (err) {
      deps.log?.error(`Failed to process review ${event.reviewId}`, err);
      res.status(500).json({ error: 'Review processing failed', reviewId: event.reviewId });
    }
  };
}

const firestore = new Firestore({ projectId: process.env.GCP_PROJECT_ID });
const pubsub = new PubSub({ projectId: process.env.GCP_PROJECT_ID });
const reviewsCollection = process.env.FIRESTORE_COLLECTION ?? 'reviews';
const reviewProcessedTopic = process.env.PUBSUB_TOPIC_REVIEW_PROCESSED ?? 'review-processed';

async function getReview(reviewId: string): Promise<ReviewDocument | null> {
  const snapshot = await firestore.collection(reviewsCollection).doc(reviewId).get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as ReviewDocument;
}

async function persistAnalysis(
  reviewId: string,
  analysis: ReviewAnalysis,
  processedAt: string,
): Promise<void> {
  await firestore.collection(reviewsCollection).doc(reviewId).update({
    status: 'processed',
    analysis,
    processedAt,
  });
}

async function publishReviewProcessed(event: ReviewProcessedEvent): Promise<void> {
  await pubsub.topic(reviewProcessedTopic).publishMessage({
    data: Buffer.from(JSON.stringify(event)),
  });
}

export const reviewAnalyzerHandler = createReviewAnalyzerHandler({
  getReview,
  analyzeReview: analyzeReviewWithGemini,
  persistAnalysis,
  publishReviewProcessed,
  log: console,
});

http('reviewAnalyzer', reviewAnalyzerHandler);

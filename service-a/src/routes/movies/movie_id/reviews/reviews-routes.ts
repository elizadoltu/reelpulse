import type { FastifyInstance, RouteOptions } from 'fastify';
import type { MovieIdObjectSchemaType } from '../../../../schemas/movies/http.js';
import type {
  ReviewInputSchemaType,
  ReviewResponseSchemaType,
} from '../../../../schemas/reviews/data.js';
import { CreateMovieReviewSchema } from '../../../../schemas/reviews/http.js';
import type { UserSchemaType } from '../../../../schemas/users/data.js';
import type { ReviewSubmittedEvent } from '../../../../types/events.js';
import { API_ENDPOINTS } from '../../../../utils/constants/constants.js';
import { HttpMethods, HttpStatusCodes, RouteTags } from '../../../../utils/constants/enums.js';
import { genUnauthorizedError, registerEndpointRoutes } from '../../../../utils/routing-utils.js';

const endpoint = API_ENDPOINTS.MOVIE_REVIEWS;
const tags: RouteTags[] = [RouteTags.REVIEWS] as const;

const routes: RouteOptions[] = [
  {
    method: HttpMethods.POST,
    url: endpoint,
    schema: { ...CreateMovieReviewSchema, tags },
    handler: async function createMovieReview(request, reply) {
      const token = request.headers.authorization?.split('Bearer ')[1];

      if (token === undefined) {
        throw genUnauthorizedError();
      }

      const decodedToken = this.jwt.decode(token) as UserSchemaType;
      const userId = decodedToken?.email ?? null;

      const params = request.params as MovieIdObjectSchemaType;
      const movieId = params.movie_id;
      const { text } = request.body as ReviewInputSchemaType;

      await this.dataStore.fetchMovie(movieId);

      const reviewId = crypto.randomUUID();
      const submittedAt = new Date().toISOString();

      await this.firestore.collection('reviews').doc(reviewId).set({
        status: 'pending',
        movieId,
        userId,
        text,
        submittedAt,
      });

      const topicName = process.env.PUBSUB_TOPIC_REVIEW_SUBMITTED ?? 'review-submitted';
      const eventPayload: ReviewSubmittedEvent = {
        eventId: crypto.randomUUID(),
        reviewId,
        movieId,
        userId,
        text,
        timestamp: submittedAt,
      };

      void this.pubsub
        .topic(topicName)
        .publishMessage({ data: Buffer.from(JSON.stringify(eventPayload)) })
        .catch((err: Error) => {
          this.log.error({ reviewId, err: err.message }, 'failed to publish ReviewSubmittedEvent');
        });

      const responseBody: ReviewResponseSchemaType = {
        reviewId,
        status: 'pending',
        message: 'Review submitted for analysis',
      };

      reply.code(HttpStatusCodes.ACCEPTED).send(responseBody);
    },
  } as const,
] as const;

const movieReviewsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  await registerEndpointRoutes(fastify, endpoint, routes);
};

export default movieReviewsRoutes;

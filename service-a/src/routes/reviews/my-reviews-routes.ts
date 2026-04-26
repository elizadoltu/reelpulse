import type { FastifyInstance, RouteOptions } from 'fastify';
import type { UserSchemaType } from '../../schemas/users/data.js';
import { HttpMethods, HttpStatusCodes, RouteTags } from '../../utils/constants/enums.js';
import { genUnauthorizedError, registerEndpointRoutes } from '../../utils/routing-utils.js';

const endpoint = '/reviews/me';

interface ReviewDoc {
  movieId: string;
  status: string;
  analysis?: unknown;
  processedAt?: string | null;
}

const routes: RouteOptions[] = [
  {
    method: HttpMethods.GET,
    url: endpoint,
    schema: {
      tags: [RouteTags.REVIEWS],
      summary: 'Get the authenticated user\'s processed reviews (most recent 10)',
    },
    handler: async function getMyReviews(request, reply) {
      const token = request.headers.authorization?.split('Bearer ')[1];
      if (!token) throw genUnauthorizedError();

      const decoded = this.jwt.decode(token) as UserSchemaType | null;
      const email = decoded?.email;
      if (!email) throw genUnauthorizedError();

      const snap = await this.firestore
        .collection('reviews')
        .where('userId', '==', email)
        .limit(30)
        .get();

      const reviews = snap.docs
        .map((doc) => {
          const data = doc.data() as ReviewDoc;
          return {
            reviewId: doc.id,
            movieId: data.movieId,
            status: data.status,
            analysis: data.analysis ?? null,
            processedAt: data.processedAt ?? null,
          };
        })
        .filter((r) => r.status === 'processed')
        .slice(0, 10);

      reply.code(HttpStatusCodes.OK).send(reviews);
    },
  } as const,
] as const;

const myReviewsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  await registerEndpointRoutes(fastify, endpoint, routes);
};

export default myReviewsRoutes;

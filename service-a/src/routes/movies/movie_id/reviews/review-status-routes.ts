import type { FastifyInstance, RouteOptions } from 'fastify';
import type {
  ReviewAnalysisSchemaType,
  ReviewStatusParamsSchemaType,
  ReviewStatusResponseSchemaType,
} from '../../../../schemas/reviews/data.js';
import { GetReviewStatusSchema } from '../../../../schemas/reviews/http.js';
import { API_ENDPOINTS } from '../../../../utils/constants/constants.js';
import { HttpMethods, HttpStatusCodes, RouteTags } from '../../../../utils/constants/enums.js';
import { genNotFoundError, registerEndpointRoutes } from '../../../../utils/routing-utils.js';

type ReviewDocument = {
  status: string;
  analysis?: ReviewAnalysisSchemaType | null;
  processedAt?: string | null;
};

const endpoint = API_ENDPOINTS.MOVIE_REVIEW_STATUS;
const tags: RouteTags[] = [RouteTags.REVIEWS] as const;

const routes: RouteOptions[] = [
  {
    method: HttpMethods.GET,
    url: endpoint,
    schema: { ...GetReviewStatusSchema, tags },
    handler: async function getReviewStatus(request, reply) {
      const { review_id } = request.params as ReviewStatusParamsSchemaType;

      const snap = await this.firestore.collection('reviews').doc(review_id).get();

      if (!snap.exists) {
        throw genNotFoundError('review', review_id);
      }

      const data = snap.data() as ReviewDocument;

      const responseBody: ReviewStatusResponseSchemaType = {
        reviewId: review_id,
        status: data.status as 'pending' | 'processed',
        analysis: data.analysis ?? null,
        processedAt: data.processedAt ?? null,
      };

      reply.code(HttpStatusCodes.OK).send(responseBody);
    },
  } as const,
] as const;

const reviewStatusRoutes = async (fastify: FastifyInstance): Promise<void> => {
  await registerEndpointRoutes(fastify, endpoint, routes);
};

export default reviewStatusRoutes;

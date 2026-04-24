import type { FastifySchema } from 'fastify';
import { HttpMediaTypes, HttpStatusCodes, SecuritySchemes } from '../../utils/constants/enums.js';
import { createErrorResponseSchemas } from '../../utils/routing-utils';
import { MovieIdObjectSchema } from '../movies/http';
import { ReviewInputSchema, ReviewResponseSchema } from './data';

const CreateMovieReviewSchema: FastifySchema = {
  summary: 'Submit a review for a movie',
  params: MovieIdObjectSchema,
  body: ReviewInputSchema,
  security: [{ [SecuritySchemes.BEARER_AUTH]: [] }],
  response: {
    [HttpStatusCodes.ACCEPTED]: {
      description: 'Review submitted for analysis',
      content: {
        [HttpMediaTypes.JSON]: {
          schema: ReviewResponseSchema,
        },
      },
    },
    ...createErrorResponseSchemas([
      HttpStatusCodes.BAD_REQUEST,
      HttpStatusCodes.UNAUTHORIZED,
      HttpStatusCodes.NOT_FOUND,
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ]),
  },
};

export { CreateMovieReviewSchema };

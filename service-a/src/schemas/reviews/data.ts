import { type Static, Type } from '@sinclair/typebox';

const ReviewInputSchema = Type.Object({
  text: Type.String({
    minLength: 10,
    maxLength: 2000,
    description: 'The review text',
    examples: ['This movie was absolutely fantastic and I loved every minute of it!'],
  }),
});

const ReviewResponseSchema = Type.Object({
  reviewId: Type.String({ description: 'The unique identifier of the submitted review' }),
  status: Type.Literal('pending'),
  message: Type.String(),
});

const ReviewAnalysisSchema = Type.Object({
  sentiment_score: Type.Number({ description: 'Sentiment score of the review' }),
  themes: Type.Array(Type.String(), { description: 'Detected themes in the review' }),
  spoiler_detected: Type.Boolean({ description: 'Whether the review contains spoilers' }),
  summary: Type.String({ description: 'AI-generated summary of the review' }),
});

const ReviewStatusResponseSchema = Type.Object({
  reviewId: Type.String({ description: 'The unique identifier of the review' }),
  status: Type.Union([Type.Literal('pending'), Type.Literal('processed')]),
  analysis: Type.Union([ReviewAnalysisSchema, Type.Null()]),
  processedAt: Type.Union([
    Type.String({ description: 'ISO8601 timestamp of processing completion' }),
    Type.Null(),
  ]),
});

const ReviewStatusParamsSchema = Type.Object({
  movie_id: Type.String({ description: 'The unique identifier of the movie' }),
  review_id: Type.String({ description: 'The unique identifier of the review' }),
});

type ReviewInputSchemaType = Static<typeof ReviewInputSchema>;
type ReviewResponseSchemaType = Static<typeof ReviewResponseSchema>;
type ReviewAnalysisSchemaType = Static<typeof ReviewAnalysisSchema>;
type ReviewStatusResponseSchemaType = Static<typeof ReviewStatusResponseSchema>;
type ReviewStatusParamsSchemaType = Static<typeof ReviewStatusParamsSchema>;

export {
  ReviewAnalysisSchema,
  ReviewInputSchema,
  ReviewResponseSchema,
  ReviewStatusParamsSchema,
  ReviewStatusResponseSchema,
  type ReviewAnalysisSchemaType,
  type ReviewInputSchemaType,
  type ReviewResponseSchemaType,
  type ReviewStatusParamsSchemaType,
  type ReviewStatusResponseSchemaType,
};

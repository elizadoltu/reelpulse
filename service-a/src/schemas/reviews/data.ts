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

type ReviewInputSchemaType = Static<typeof ReviewInputSchema>;
type ReviewResponseSchemaType = Static<typeof ReviewResponseSchema>;

export {
  ReviewInputSchema,
  ReviewResponseSchema,
  type ReviewInputSchemaType,
  type ReviewResponseSchemaType,
};

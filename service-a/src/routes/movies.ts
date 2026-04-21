import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';

type MovieParams = { id: string };

type Movie = { id: string; title: string; genre: string };

const movieStore: Movie[] = [
  { id: '1', title: 'Inception', genre: 'sci-fi' },
  { id: '2', title: 'The Dark Knight', genre: 'action' },
  { id: '3', title: 'Interstellar', genre: 'sci-fi' },
  { id: '4', title: 'Parasite', genre: 'thriller' },
  { id: '5', title: 'Everything Everywhere All at Once', genre: 'sci-fi' },
];

const moviesPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const topicName = process.env.PUBSUB_TOPIC_MOVIE_EVENTS ?? 'movie-events';

  app.get<{ Params: MovieParams }>('/movies/:id', async (request, reply) => {
    const { id } = request.params;
    const movie = movieStore.find((m) => m.id === id);

    if (!movie) {
      return reply.status(404).send({ error: 'Movie not found' });
    }

    const userId: string | null = null;
    const event = {
      eventId: randomUUID(),
      movieId: id,
      userId,
      genre: movie.genre,
      timestamp: new Date().toISOString(),
    };

    void app.pubsub
      .topic(topicName)
      .publishMessage({ data: Buffer.from(JSON.stringify(event)) })
      .catch((err: Error) => {
        request.log.error(
          { eventId: event.eventId, err: err.message },
          'failed to publish MovieViewedEvent',
        );
      });

    return movie;
  });
};

export default moviesPlugin;

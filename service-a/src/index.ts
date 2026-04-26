import type { FastifyInstance } from 'fastify';
import buildInstance from './app';
import autoloadOptions from './swappable-options/autoload-options';
import { cacheOptions } from './swappable-options/cache-options';
import { serverOptions } from './swappable-options/server-options';
import * as grpc from '@grpc/grpc-js';
import { db, connectDB } from './utils/grpc_db.js';
import {
  MovieServiceService,
  MovieServiceServer,
  GetMovieTitleRequest,
  GetMovieTitleResponse,
} from './generated/reelpulse.js';
import { ObjectId } from 'mongodb';

const fastifyApp: FastifyInstance = buildInstance(serverOptions, autoloadOptions, cacheOptions);

const port = Number(process.env.PORT) || Number(process.env.APP_PORT) || 3001;

fastifyApp.listen({ host: '0.0.0.0', port }).catch((err: Error) => {
  fastifyApp.log.error(err);
  process.exit(1);
});

const movieServerImpl: MovieServiceServer = {
  getMovieTitle: async (
    call: grpc.ServerUnaryCall<GetMovieTitleRequest, GetMovieTitleResponse>,
    callback: grpc.sendUnaryData<GetMovieTitleResponse>,
  ) => {
    const { movieId } = call.request;

    console.log(`[gRPC Server] Request received for Movie ID: ${movieId}`);

    if (!ObjectId.isValid(movieId)) {
      console.warn(`[gRPC] Received invalid ID format: ${movieId}`);
      return callback(null, {
        movieId: movieId,
        title: 'Invalid ID format',
        found: false,
      });
    }

    const movie = await db
      .collection('movies')
      .findOne({ _id: new ObjectId(movieId) }, { projection: { title: 1 } });

    const title = movie?.title;

    if (title) {
      callback(null, {
        movieId,
        title,
        found: true,
      });
    } else {
      callback(null, {
        movieId,
        title: 'unknown',
        found: false,
      });
    }
  },
};

async function start() {
  await connectDB();
  const server = new grpc.Server();

  server.addService(MovieServiceService, movieServerImpl);

  const PORT = '0.0.0.0:50051';

  server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(`Error starting server: ${err.message}`);
      return;
    }
    console.log(`✅ gRPC Server active on port ${port}`);
  });
}

start();

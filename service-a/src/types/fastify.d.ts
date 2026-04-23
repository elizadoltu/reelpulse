import type { FastifyMongoNestedObject, FastifyMongoObject } from '@fastify/mongodb';
import type { EnvSchemaType } from '../schemas/dotenv';
import type { MovieCommentSchemaType, MovieSchemaType } from '../schemas/movies/data';
import type { PaginatedSearchSchemaType, ResourceSchemaType } from '../schemas/movies/http';
import type { UserSchemaType } from '../schemas/users/data';

interface AbstractCacheObject {
  get(
    key: string,
    cb: (err: Error | null, value: { item: unknown; stored: number; ttl: number } | null) => void,
  ): void;
  set(key: string, val: unknown, ttl: number, cb: (err: Error | null) => void): void;
}

interface JwtHelper {
  sign(payload: unknown, options?: { expiresIn?: string | number }): string;
  decode<T = unknown>(token: string): T | null;
  verify<T = unknown>(token: string): Promise<T>;
}

interface DataStore {
  checkUser: (email: string, password: string) => Promise<ResourceSchemaType<UserSchemaType>>;
  registerUser: (user: UserSchemaType) => Promise<void>;
  countMovies: (searchParams: PaginatedSearchSchemaType) => Promise<number>;
  countMovieComments: (movieId: string, searchParams: PaginatedSearchSchemaType) => Promise<number>;
  fetchMovies: (searchParams: PaginatedSearchSchemaType) => Promise<MovieSchemaType[]>;
  fetchMovieComments: (
    movieId: string,
    searchParams: PaginatedSearchSchemaType,
  ) => Promise<Array<ResourceSchemaType<MovieCommentSchemaType>>>;
  fetchMovie: (id: string) => Promise<ResourceSchemaType<MovieSchemaType>>;
  createMovie: (movie: MovieSchemaType) => Promise<string>;
  createMovieComment: (comment: MovieCommentSchemaType) => Promise<void>;
  replaceMovie: (id: string, replacement: MovieSchemaType) => Promise<void>;
  updateMovie: (id: string, update: MovieSchemaType) => Promise<void>;
  deleteMovie: (id: string) => Promise<void>;
}

declare module 'fastify' {
  interface FastifySchema {
    tags?: readonly string[] | string[];
    summary?: string;
    security?: unknown[];
  }

  interface FastifyInstance {
    config: EnvSchemaType;
    mongo: FastifyMongoObject & FastifyMongoNestedObject;
    dataStore: DataStore;
    cache: AbstractCacheObject;
    cacheSegment: string;
    jwt: JwtHelper;
    etagMaxLife: number;
    getEnvs(): EnvSchemaType;
    getDefaultRoute(): (request: FastifyRequest, reply: FastifyReply) => void;
    setDefaultRoute(handler: (request: FastifyRequest, reply: FastifyReply) => void): void;
    swagger(opts?: { yaml?: boolean }): Record<string, unknown> | string;
    swaggerCSP: Record<string, string[]>;
  }

  interface FastifyRequest {
    jwtVerify<T = unknown>(): Promise<T>;
  }

  interface FastifyReply {
    expires(date: Date): this;
  }
}

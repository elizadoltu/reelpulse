export const HttpMethods = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  OPTIONS: 'OPTIONS',
  HEAD: 'HEAD',
} as const;
export type HttpMethods = (typeof HttpMethods)[keyof typeof HttpMethods];

export const HttpStatusCodes = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  NOT_MODIFIED: 304,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;
export type HttpStatusCodes = (typeof HttpStatusCodes)[keyof typeof HttpStatusCodes];

export const MediaTypes = {
  MOVIE: 'movie',
  SERIES: 'series',
} as const;
export type MediaTypes = (typeof MediaTypes)[keyof typeof MediaTypes];

export const HttpMediaTypes = {
  TEXT_PLAIN: 'text/plain',
  JSON: 'application/json',
  HAL_JSON: 'application/hal+json',
} as const;
export type HttpMediaTypes = (typeof HttpMediaTypes)[keyof typeof HttpMediaTypes];

export const FetchTypes = {
  RESOURCE: 'resource',
  COLLECTION: 'collection',
} as const;
export type FetchTypes = (typeof FetchTypes)[keyof typeof FetchTypes];

export const ResourceTypes = {
  MOVIE: 'movie',
  MOVIE_COMMENT: 'comment',
  USER: 'user',
} as const;
export type ResourceTypes = (typeof ResourceTypes)[keyof typeof ResourceTypes];

export const SecuritySchemes = {
  BEARER_AUTH: 'BearerAuth',
} as const;
export type SecuritySchemes = (typeof SecuritySchemes)[keyof typeof SecuritySchemes];

export const IsolatedResourceTypes = {
  LOGIN: 'login',
  HEALTH: 'health',
} as const;
export type IsolatedResourceTypes =
  (typeof IsolatedResourceTypes)[keyof typeof IsolatedResourceTypes];

export const ResourceCollections = {
  MOVIES: 'movies',
  MOVIE_COMMENTS: 'comments',
  USERS: 'users',
} as const;
export type ResourceCollections = (typeof ResourceCollections)[keyof typeof ResourceCollections];

export const RouteTags = {
  ENTRY_POINT: 'API Entry Point',
  AUTH: 'User Registration/Authentication/Authorization',
  CACHE: 'Cacheable Operations',
  COMMENTS: 'Movie Comment Collection',
  DIAGNOSTICS: 'Diagnostics',
  MOVIE: 'Movie Resources',
  MOVIES: 'Movie Collection',
  REVIEWS: 'Movie Review Collection',
  USERS: 'User Collection',
  OPTIONS: 'OPTIONS',
} as const;
export type RouteTags = (typeof RouteTags)[keyof typeof RouteTags];

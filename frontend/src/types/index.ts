export interface MovieImdb {
  id: string | number;
  rating: number;
  votes: number;
}

export interface MovieAwards {
  wins: number;
  nominations: number;
  text: string;
}

export interface Movie {
  _id: string;
  title: string;
  type: 'movie' | 'series';
  year: number;
  genres?: string[];
  plot?: string;
  fullplot?: string;
  poster?: string;
  rated?: string;
  released?: string;
  runtime?: number;
  cast?: string[];
  directors?: string[];
  writers?: string[];
  languages?: string[];
  countries?: string[];
  imdb?: Partial<MovieImdb>;
  awards?: MovieAwards;
}

export interface PaginatedCollection<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface ReviewSubmitResponse {
  reviewId: string;
  status: 'pending';
  message: string;
}

export type ThemeValue = 'positive' | 'negative' | 'neutral' | 'not_mentioned';

export interface ReviewAnalysis {
  sentiment_score: number; // 0–10 (Gemini output scale)
  themes: Record<string, ThemeValue>;
  spoiler_detected: boolean;
  summary: string;
}

export interface MyReview {
  reviewId: string;
  movieId: string;
  status: 'pending' | 'processed';
  analysis: ReviewAnalysis | null;
  processedAt: string | null;
}

export interface ReviewStatus {
  reviewId: string;
  status: 'pending' | 'processed';
  analysis: ReviewAnalysis | null;
  processedAt: string | null;
}

export interface MovieComment {
  _id?: string;
  name?: string;
  email?: string;
  movie_id?: string;
  date?: string;
  text?: string;
}

export interface LoginResponse {
  token: string;
}

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

export interface TrendingEntry {
  movieId: string;
  views: number;
  movieTitle?: string;
  genre?: string;
}

export interface AnalyticsUpdate {
  type: 'ANALYTICS_UPDATE';
  trending: TrendingEntry[];
  genres: string[];
  genreDistribution: Record<string, number>;
  aiNarrative: string;
  activeUsers: number;
  latencyPercentiles: { p50: number; p95: number; p99: number };
}

export interface LatencyDataPoint {
  timestamp: number;
  p50: number;
  p95: number;
  p99: number;
}

export type WsMessage =
  | { type: 'IDENTIFIED' }
  | { type: 'REVIEW_PROCESSED'; reviewId: string; movieId: string; analysis: ReviewAnalysis; movieTitle?: string }
  | AnalyticsUpdate;

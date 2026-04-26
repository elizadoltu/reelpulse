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

export interface ReviewAnalysis {
  sentiment_score: number;
  themes: string[];
  spoiler_detected: boolean;
  summary: string;
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

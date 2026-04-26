import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type {
  LoginResponse,
  Movie,
  MovieComment,
  MyReview,
  PaginatedCollection,
  ReviewStatus,
  ReviewSubmitResponse,
} from '@/types/index.js';

const BASE_URL = import.meta.env.VITE_API_URL as string;
const API_PREFIX = '/api/v1';
const TOKEN_KEY = 'auth_token';

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}${API_PREFIX}`,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      globalThis.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/login', { email, password });
  return data;
}

export async function getMovies(
  page: number,
  search?: string,
): Promise<PaginatedCollection<Movie>> {
  const params: Record<string, string | number> = { page, pageSize: 20 };
  // FilterStringSchema only allows [a-zA-Z0-9_]+ in the value — strip everything else
  const cleanSearch = search?.trim().replaceAll(/\W/g, '') ?? '';
  if (cleanSearch) {
    params.filter = `title:${cleanSearch}`;
  }
  const { data } = await apiClient.get<PaginatedCollection<Movie>>('/movies', { params });
  return data;
}

export async function getMovie(id: string): Promise<Movie> {
  const { data } = await apiClient.get<Movie>(`/movies/${id}`);
  return data;
}

export async function submitReview(
  movieId: string,
  text: string,
): Promise<ReviewSubmitResponse> {
  const { data } = await apiClient.post<ReviewSubmitResponse>(
    `/movies/${movieId}/reviews`,
    { text },
  );
  return data;
}

export async function getReviewStatus(
  movieId: string,
  reviewId: string,
): Promise<ReviewStatus> {
  const { data } = await apiClient.get<ReviewStatus>(
    `/movies/${movieId}/reviews/${reviewId}/status`,
  );
  return data;
}

export async function getComments(
  movieId: string,
  page = 1,
): Promise<PaginatedCollection<MovieComment>> {
  const { data } = await apiClient.get<PaginatedCollection<MovieComment>>(
    `/movies/${movieId}/comments`,
    { params: { page, pageSize: 20 } },
  );
  return data;
}

export async function getMyReviews(): Promise<MyReview[]> {
  const { data } = await apiClient.get<MyReview[]>('/reviews/me');
  return data;
}

export interface MovieViewedEvent {
  eventId: string;
  movieId: string;
  userId: string | null;
  genres: string[];
  timestamp: string;
}

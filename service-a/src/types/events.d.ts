export interface MovieViewedEvent {
  eventId: string;
  movieId: string;
  userId: string | null;
  genres: string[];
  timestamp: string;
}

export interface ReviewSubmittedEvent {
  eventId: string;
  reviewId: string;
  movieId: string;
  userId: string | null;
  text: string;
  timestamp: string;
}

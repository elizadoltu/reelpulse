import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Clock, Calendar, Film } from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Skeleton } from '@/components/ui/skeleton.js';
import ReviewForm from '@/components/ReviewForm.js';
import ReviewList from '@/components/ReviewList.js';
import { getMovie } from '@/services/api.js';
import type { Movie, ReviewSubmitResponse } from '@/types/index.js';

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-6">
        <Skeleton className="h-64 w-44 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [newReview, setNewReview] = useState<ReviewSubmitResponse | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    getMovie(id)
      .then(setMovie)
      .catch((err: unknown) => {
        const status =
          err != null &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { status?: number } }).response?.status;
        if (status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <DetailSkeleton />;

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Film className="mb-4 h-16 w-16 text-muted-foreground" />
        <h2 className="mb-2 text-xl font-semibold">Movie not found</h2>
        <p className="mb-6 text-muted-foreground">
          This movie doesn't exist or has been removed.
        </p>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to movies
        </Button>
      </div>
    );
  }

  if (!movie) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-6 -ml-2" onClick={() => navigate('/')}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        All movies
      </Button>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="h-64 w-44 shrink-0 overflow-hidden rounded-lg bg-muted self-start">
          {movie.poster ? (
            <img
              src={movie.poster}
              alt={movie.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Film className="h-12 w-12" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{movie.title}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {movie.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {movie.year}
                </span>
              )}
              {movie.runtime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {movie.runtime} min
                </span>
              )}
              {movie.rated && <Badge variant="outline">{movie.rated}</Badge>}
              {movie.imdb?.rating != null && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {movie.imdb.rating.toFixed(1)} IMDb
                </span>
              )}
            </div>
          </div>

          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {movie.genres.map((g) => (
                <Badge key={g} variant="secondary">
                  {g}
                </Badge>
              ))}
            </div>
          )}

          {(movie.plot || movie.fullplot) && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {movie.fullplot ?? movie.plot}
            </p>
          )}

          {movie.directors && movie.directors.length > 0 && (
            <p className="text-sm">
              <span className="text-muted-foreground">Directed by </span>
              {movie.directors.join(', ')}
            </p>
          )}
        </div>
      </div>

      <div className="mt-10 space-y-6">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Write a review</h2>
          <ReviewForm movieId={movie._id} onSubmitted={setNewReview} />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Reviews</h2>
          <ReviewList movieId={movie._id} newReview={newReview} />
        </section>
      </div>
    </div>
  );
}

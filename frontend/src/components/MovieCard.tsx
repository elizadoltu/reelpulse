import { useNavigate } from 'react-router-dom';
import { Film, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.js';
import { Badge } from '@/components/ui/badge.js';
import type { Movie } from '@/types/index.js';

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-colors hover:border-muted-foreground/40"
      onClick={() => navigate(`/movies/${movie._id}`)}
    >
      <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
        {movie.poster ? (
          <img
            src={movie.poster}
            alt={movie.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Film className="h-12 w-12" />
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <p className="truncate font-medium leading-tight">{movie.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{movie.year}</p>
        {movie.imdb?.rating != null && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-yellow-400">
            <Star className="h-3 w-3 fill-current" />
            <span>{movie.imdb.rating.toFixed(1)}</span>
          </div>
        )}
        {movie.genres && movie.genres.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {movie.genres.slice(0, 2).map((g) => (
              <Badge key={g} variant="secondary" className="text-[10px]">
                {g}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

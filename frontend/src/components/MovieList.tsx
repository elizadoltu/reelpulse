import { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input.js';
import { Button } from '@/components/ui/button.js';
import { Skeleton } from '@/components/ui/skeleton.js';
import MovieCard from '@/components/MovieCard.js';
import { useDebounce } from '@/hooks/useDebounce.js';
import { getMovies } from '@/services/api.js';
import type { Movie } from '@/types/index.js';

const PAGE_SIZE = 20;

function MovieCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[2/3] w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  );
}

export default function MovieList() {
  const [search, setSearch] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const fetchMovies = useCallback(async (currentPage: number, searchTerm: string) => {
    try {
      const data = await getMovies(currentPage, searchTerm);
      if (currentPage === 1) {
        setMovies(data.data);
      } else {
        setMovies((prev) => [...prev, ...data.data]);
      }
      setTotalCount(data.totalCount);
      setError(null);
    } catch {
      setError('Failed to load movies. Please try again.');
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setMovies([]);
    setLoading(true);
    fetchMovies(1, debouncedSearch).finally(() => setLoading(false));
  }, [debouncedSearch, fetchMovies]);

  async function handleLoadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    await fetchMovies(nextPage, debouncedSearch);
    setPage(nextPage);
    setLoadingMore(false);
  }

  const hasMore = movies.length < totalCount;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <h1 className="text-2xl font-bold">Movies</h1>
        <span className="text-sm text-muted-foreground">
          {totalCount > 0 && `${totalCount} titles`}
        </span>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Search movies"
        />
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              fetchMovies(1, debouncedSearch).finally(() => setLoading(false));
            }}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          {debouncedSearch ? `No results for "${debouncedSearch}"` : 'No movies found.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {movies.map((movie) => (
              <MovieCard key={movie._id} movie={movie} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

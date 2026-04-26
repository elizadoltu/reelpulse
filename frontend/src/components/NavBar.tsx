import { Link, useLocation } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Movies' },
  { to: '/dashboard', label: 'Dashboard' },
];

export function NavBar() {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-7xl items-center gap-6 px-4">
        <span className="font-bold tracking-tight">ReelPulse</span>
        <nav className="flex gap-4" aria-label="Main navigation">
          {LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`text-sm transition-colors hover:text-foreground ${
                pathname === to ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

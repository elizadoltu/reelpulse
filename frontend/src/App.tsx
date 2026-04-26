import { Routes, Route, useLocation } from 'react-router-dom';
import MovieList from '@/components/MovieList.js';
import MovieDetail from '@/components/MovieDetail.js';
import LoginPage from '@/pages/LoginPage.js';
import AnalyticsPage from '@/pages/AnalyticsPage.js';
import DashboardPage from '@/pages/DashboardPage.js';
import { NavBar } from '@/components/NavBar.js';

function AppLayout() {
  const { pathname } = useLocation();
  const showNav = pathname !== '/login';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showNav && <NavBar />}
      <Routes>
        <Route path="/" element={<MovieList />} />
        <Route path="/movies/:id" element={<MovieDetail />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </div>
  );
}

function App() {
  return <AppLayout />;
}

export default App;

import { Routes, Route } from 'react-router-dom';
import MovieList from '@/components/MovieList.js';
import MovieDetail from '@/components/MovieDetail.js';
import LoginPage from '@/pages/LoginPage.js';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Routes>
        <Route path="/" element={<MovieList />} />
        <Route path="/movies/:id" element={<MovieDetail />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </div>
  );
}

export default App;

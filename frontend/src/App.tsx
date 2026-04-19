import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Routes>
        <Route path="/" element={<div className="p-8 text-2xl font-bold">ReelPulse</div>} />
      </Routes>
    </div>
  );
}

export default App;

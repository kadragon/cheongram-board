import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminGames from './pages/admin/AdminGames';
import AdminRentals from './pages/admin/AdminRentals';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="games" element={<AdminGames />} />
        <Route path="rentals" element={<AdminRentals />} />
      </Route>
    </Routes>
  );
}

export default App;

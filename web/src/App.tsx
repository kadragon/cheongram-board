// Trace: SPEC-auth-email-password-1, REQ-FE-004

import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminGames from './pages/admin/AdminGames';
import AdminRentals from './pages/admin/AdminRentals';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="games" element={<AdminGames />} />
          <Route path="rentals" element={<AdminRentals />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;

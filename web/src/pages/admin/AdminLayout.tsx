// Trace: SPEC-auth-email-password-1, REQ-FE-005

import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, email } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className={`bg-white shadow-md ${isSidebarOpen ? 'block' : 'hidden'} md:block w-64 flex flex-col`}>
        <div className="p-4">
          <h1 className="text-2xl font-bold">Admin</h1>
          {email && (
            <p className="text-sm text-gray-600 mt-1 truncate">{email}</p>
          )}
        </div>
        <nav className="mt-4 flex-1">
          <ul>
            <li className={`px-4 py-2 hover:bg-gray-200 ${isActive('/admin') ? 'bg-gray-100' : ''}`}>
              <Link to="/admin">Dashboard</Link>
            </li>
            <li className={`px-4 py-2 hover:bg-gray-200 ${isActive('/admin/games') ? 'bg-gray-100' : ''}`}>
              <Link to="/admin/games">Games</Link>
            </li>
            <li className={`px-4 py-2 hover:bg-gray-200 ${isActive('/admin/rentals') ? 'bg-gray-100' : ''}`}>
              <Link to="/admin/rentals">Rentals</Link>
            </li>
          </ul>
        </nav>
        <div className="p-4 border-t">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-md md:hidden">
          <div className="flex justify-between items-center p-4">
            <h1 className="text-2xl font-bold">Admin</h1>
            <Button variant="ghost" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

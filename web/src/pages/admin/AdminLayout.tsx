import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className={`bg-white shadow-md ${isSidebarOpen ? 'block' : 'hidden'} md:block w-64`}>
        <div className="p-4">
          <h1 className="text-2xl font-bold">Admin</h1>
        </div>
        <nav className="mt-4">
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

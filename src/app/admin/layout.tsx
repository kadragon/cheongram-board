"use client";

import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className={`bg-white shadow-md ${isSidebarOpen ? "block" : "hidden"} md:block w-64`}>
        <div className="p-4">
          <h1 className="text-2xl font-bold">Admin</h1>
        </div>
        <nav className="mt-4">
          <ul>
            <li className="px-4 py-2 hover:bg-gray-200">
              <a href="/admin/games">Games</a>
            </li>
            <li className="px-4 py-2 hover:bg-gray-200">
              <a href="/admin/rentals">Rentals</a>
            </li>
          </ul>
        </nav>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-md md:hidden">
          <div className="flex justify-between items-center p-4">
            <h1 className="text-2xl font-bold">Admin</h1>
            <Button variant="ghost" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
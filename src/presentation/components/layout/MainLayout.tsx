import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useSidebar } from '../../contexts/SidebarContext';

export const MainLayout: React.FC = () => {
  const { collapsed } = useSidebar();
  const sideW = collapsed ? 'ml-16' : 'ml-64';

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className={`${sideW} transition-all duration-300`}>
        <Header />
        <main className="pt-16 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

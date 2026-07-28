import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import useAuthStore from '../context/authStore';
import { cn } from '../utils/cn';

const ROLE_BG = {
  admin: {
    bg: 'bg-[#070710]',
    orb1: 'bg-violet-600/10',
    orb2: 'bg-purple-700/8',
  },
  manager: {
    bg: 'bg-[#050c15]',
    orb1: 'bg-blue-600/10',
    orb2: 'bg-cyan-700/8',
  },
  tenant: {
    bg: 'bg-[#050f0a]',
    orb1: 'bg-emerald-600/10',
    orb2: 'bg-teal-700/8',
  },
};

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebarOpen', sidebarOpen);
  }, [sidebarOpen]);

  const user = useAuthStore((state) => state.user);
  const role = user?.role || 'tenant';
  const roleBg = ROLE_BG[role] || ROLE_BG.tenant;

  return (
    <div className={cn(
      'flex h-screen overflow-hidden relative transition-colors duration-300',
      'bg-background text-foreground',
      `theme-${role}`
    )}>
      {/* Global Background Orbs */}
      <div className={cn('fixed w-[600px] h-[600px] -top-64 -right-64 rounded-full blur-[120px] pointer-events-none opacity-50 dark:opacity-100', roleBg.orb1)} />
      <div className={cn('fixed w-[400px] h-[400px] -bottom-32 -left-32 rounded-full blur-[100px] pointer-events-none opacity-50 dark:opacity-100', roleBg.orb2)} />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative">
        {/* Navbar Container */}
        <div className="absolute top-0 left-0 right-0 z-30 p-4 pointer-events-none">
          <div className="max-w-7xl mx-auto pointer-events-auto">
            <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-[92px]">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

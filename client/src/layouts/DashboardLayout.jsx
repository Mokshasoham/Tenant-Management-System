import React, { useState } from 'react';
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const user = useAuthStore((state) => state.user);
  const role = user?.role || 'tenant';
  const roleBg = ROLE_BG[role] || ROLE_BG.tenant;

  return (
    <div className={cn('flex h-screen overflow-hidden text-white relative', roleBg.bg)}>
      {/* Global Background Orbs */}
      <div className={cn('fixed w-[600px] h-[600px] -top-64 -right-64 rounded-full blur-[120px] pointer-events-none', roleBg.orb1)} />
      <div className={cn('fixed w-[400px] h-[400px] -bottom-32 -left-32 rounded-full blur-[100px] pointer-events-none', roleBg.orb2)} />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative">
        {/* Navbar */}
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page Content */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

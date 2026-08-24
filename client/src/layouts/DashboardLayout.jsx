import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import ScrollToTopButton from '../components/common/ScrollToTopButton';
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

  const navigate = useNavigate();
  const location = useLocation();

  const showBackButton = window.history.state && 
                         window.history.state.idx > 0 && 
                         location.pathname !== '/dashboard' && 
                         location.pathname !== '/';

  const mainContentRef = useRef(null);

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
        <main ref={mainContentRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-[92px]">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
            {showBackButton && (
              <div className="mb-6 flex justify-start">
                <button
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 rounded-2xl border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 flex items-center gap-2 text-xs font-black uppercase tracking-wider shadow-sm select-none"
                >
                  <ArrowLeft className="w-4 h-4 text-primary" />
                  <span>Back</span>
                </button>
              </div>
            )}
            {children}
          </div>
        </main>

        {/* Floating Scroll to Top Button for Portal Views */}
        <ScrollToTopButton containerRef={mainContentRef} />
      </div>
    </div>
  );
}

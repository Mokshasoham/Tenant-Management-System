import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Building2, Menu, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { useTheme } from '../context/ThemeContext';
import ThemeSwitch from './ThemeSwitch';
import DraggableNavPill from './DraggableNavPill';

export default function PublicNavbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu upon route change
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    const navItems = [
        { label: 'Home', path: '/' },
        { label: 'Properties', path: '/properties' },
        { label: 'How It Works', path: '/how-it-works' },
        { label: 'Features', path: '/features' },
        { label: 'For Tenants', path: '/for-tenants' },
        { label: 'For Managers', path: '/for-managers' },
    ];

    const isActive = (path) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        const cleanPath = path.replace(/^\//, '');
        return location.pathname === path ||
               location.pathname.startsWith(`/${cleanPath}`) ||
               location.pathname.startsWith(`/public/${cleanPath}`);
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-3.5 transition-all duration-300 pointer-events-none">
            <div className="max-w-7xl mx-auto pointer-events-auto">
                {/* ══════════════════════════════════════════════════════
                    PREMIUM LIQUID GLASS / FROSTED GLASS NAVBAR CONTAINER
                    - Highly translucent dark navy glass in dark mode
                    - Hero background image clearly shines through
                    - Specular bevels, rim refractions & ambient aura
                    - Smooth transition between resting and scrolled states
                ══════════════════════════════════════════════════════ */}
                <div
                    className={cn(
                        "relative rounded-[1.75rem] px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between transition-all duration-500 overflow-hidden",
                        scrolled
                            ? "border-slate-200/80 dark:border-emerald-500/25"
                            : "border-white/60 dark:border-white/[0.14]"
                    )}
                    style={{
                        background: isDark
                            ? scrolled
                                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.09) 0%, rgba(10, 20, 36, 0.52) 42%, rgba(6, 14, 26, 0.60) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(10, 20, 36, 0.30) 42%, rgba(6, 14, 26, 0.38) 100%)'
                            : scrolled
                                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(245, 248, 250, 0.65) 50%, rgba(230, 240, 236, 0.70) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.65) 0%, rgba(245, 248, 250, 0.40) 50%, rgba(230, 240, 236, 0.45) 100%)',
                        backdropFilter: scrolled ? 'blur(16px) saturate(190%)' : 'blur(13px) saturate(180%)',
                        WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(190%)' : 'blur(13px) saturate(180%)',
                        boxShadow: isDark
                            ? scrolled
                                ? 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.28), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.3), 0 16px 40px -10px rgba(0, 0, 0, 0.5), 0 0 24px -2px rgba(16, 185, 129, 0.14)'
                                : 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.22), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.25), 0 12px 32px -8px rgba(0, 0, 0, 0.35), 0 0 20px -2px rgba(16, 185, 129, 0.08)'
                            : scrolled
                                ? 'inset 0 1px 2px 0 rgba(255, 255, 255, 0.85), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.06), 0 16px 40px -10px rgba(0, 0, 0, 0.12), 0 0 24px -2px rgba(16, 185, 129, 0.08)'
                                : 'inset 0 1px 2px 0 rgba(255, 255, 255, 0.80), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.04), 0 12px 32px -8px rgba(0, 0, 0, 0.08), 0 0 18px -2px rgba(16, 185, 129, 0.05)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                    }}
                >
                    {/* Liquid Glass Optical Layer 1: Specular top edge sheen */}
                    <div className="absolute inset-0 rounded-[1.75rem] bg-gradient-to-b from-white/[0.12] dark:from-white/[0.08] via-transparent to-transparent pointer-events-none" />

                    {/* Liquid Glass Optical Layer 2: Radial aperture reflection */}
                    <div className="absolute inset-0 rounded-[1.75rem] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12)_0%,transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.07)_0%,transparent_60%)] pointer-events-none" />

                    {/* Liquid Glass Optical Layer 3: Subtle emerald prism refraction line */}
                    <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/40 dark:via-emerald-400/30 to-transparent pointer-events-none" />

                    {/* Brand Logo */}
                    <Link to="/" className="flex items-center gap-3 group select-none relative z-10">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 group-hover:shadow-emerald-500/40 transition-all border border-emerald-400/30">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col text-left">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-sans">TMS</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            </div>
                            <span className="text-[8px] font-black tracking-[0.2em] text-emerald-600 dark:text-emerald-400 uppercase leading-none">
                                Smart Rental Management
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation Links with Draggable Selection Pill */}
                    <div className="hidden lg:flex items-center relative z-10">
                        <DraggableNavPill navItems={navItems} />
                    </div>

                    {/* Desktop Action Buttons + Theme Switch */}
                    <div className="hidden sm:flex items-center gap-3 relative z-10">
                        <ThemeSwitch />
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-700 dark:text-white/90 hover:text-slate-900 dark:hover:text-white bg-white/40 dark:bg-white/[0.07] hover:bg-white/70 dark:hover:bg-white/[0.14] transition-all duration-300 border border-slate-200/60 dark:border-white/[0.12] backdrop-blur-md shadow-sm cursor-pointer"
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/register')}
                            className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 flex items-center gap-1.5 cursor-pointer border border-emerald-400/30"
                        >
                            <span>Get Started</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Mobile Controls (Theme Switch + Hamburger) */}
                    <div className="sm:hidden flex items-center gap-2 relative z-10">
                        <ThemeSwitch />
                        <button
                            type="button"
                            className="p-2 rounded-xl text-slate-700 dark:text-white/90 hover:bg-slate-100/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            onClick={() => setIsOpen(!isOpen)}
                            aria-label="Toggle navigation menu"
                        >
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>

                    {/* Desktop/Tablet Hamburger Button for Medium Screens */}
                    <div className="hidden sm:flex lg:hidden items-center gap-2 relative z-10">
                        <button
                            type="button"
                            className="p-2 rounded-xl text-slate-700 dark:text-white/90 hover:bg-slate-100/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            onClick={() => setIsOpen(!isOpen)}
                            aria-label="Toggle navigation menu"
                        >
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Dropdown Menu (Frosted Liquid Glass) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="lg:hidden fixed top-[4.5rem] left-4 right-4 z-50 border shadow-2xl rounded-[2rem] p-5 pointer-events-auto"
                        style={{
                            background: isDark
                                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(10, 20, 36, 0.85) 45%, rgba(6, 14, 26, 0.92) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(245, 248, 250, 0.85) 50%, rgba(230, 240, 236, 0.88) 100%)',
                            backdropFilter: 'blur(20px) saturate(190%)',
                            WebkitBackdropFilter: 'blur(20px) saturate(190%)',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(226, 232, 240, 0.8)',
                            boxShadow: isDark
                                ? 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.2), 0 20px 50px -10px rgba(0, 0, 0, 0.6), 0 0 30px -4px rgba(16, 185, 129, 0.15)'
                                : 'inset 0 1px 2px 0 rgba(255, 255, 255, 0.9), 0 20px 50px -10px rgba(0, 0, 0, 0.15), 0 0 25px -4px rgba(16, 185, 129, 0.08)',
                        }}
                    >
                        <div className="flex flex-col gap-2">
                            {navItems.map((item) => {
                                const active = isActive(item.path);
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setIsOpen(false)}
                                        className={cn(
                                            "w-full text-left px-4 py-3 rounded-xl text-sm font-extrabold transition-all flex items-center justify-between",
                                            active
                                                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 dark:bg-emerald-500/20"
                                                : "text-slate-700 dark:text-white/80 hover:bg-slate-100/50 dark:hover:bg-white/5"
                                        )}
                                    >
                                        <span>{item.label}</span>
                                        {active && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                                    </Link>
                                );
                            })}
                            <div className="h-px bg-slate-200/60 dark:bg-white/10 my-2" />
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => { setIsOpen(false); navigate('/login'); }}
                                    className="w-full py-3 rounded-xl text-xs font-extrabold text-slate-800 dark:text-white bg-white/40 dark:bg-white/[0.07] border border-slate-200/60 dark:border-white/[0.12]"
                                >
                                    Sign In
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsOpen(false); navigate('/register'); }}
                                    className="w-full py-3 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1"
                                >
                                    <span>Get Started</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}

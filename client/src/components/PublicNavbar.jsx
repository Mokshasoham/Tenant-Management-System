import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Building2, Menu, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import ThemeSwitch from './ThemeSwitch';

export default function PublicNavbar() {
    const navigate = useNavigate();
    const location = useLocation();
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
        { label: 'Properties', path: '/public/properties' },
        { label: 'How It Works', path: '/public/how-it-works' },
        { label: 'Features', path: '/public/features' },
        { label: 'For Tenants', path: '/public/for-tenants' },
        { label: 'For Managers', path: '/public/for-managers' },
    ];

    const isActive = (path) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-3.5 transition-all duration-300 pointer-events-none">
            <div className="max-w-7xl mx-auto pointer-events-auto">
                <div
                    className={cn(
                        "rounded-[1.75rem] px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between transition-all duration-500",
                        scrolled
                            ? "bg-[#F5F8F7]/90 dark:bg-[#060B13]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-emerald-500/20 shadow-lg dark:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.7),0_0_24px_rgba(16,185,129,0.12)]"
                            : "bg-white/80 dark:bg-[#060B13]/60 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 shadow-md dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                    )}
                >
                    {/* Brand Logo */}
                    <Link to="/" className="flex items-center gap-3 group select-none">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 group-hover:shadow-emerald-500/40 transition-all">
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

                    {/* Desktop Navigation Links */}
                    <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
                        {navItems.map((item) => {
                            const active = isActive(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all relative",
                                        active
                                            ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15"
                                            : "text-slate-600 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                                    )}
                                >
                                    {item.label}
                                    {active && (
                                        <motion.div
                                            layoutId="activeNavIndicator"
                                            className="absolute bottom-0 left-3 right-3 h-0.5 bg-emerald-500 rounded-full"
                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Desktop Action Buttons + Theme Switch */}
                    <div className="hidden sm:flex items-center gap-3">
                        <ThemeSwitch />
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-700 dark:text-white/90 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/10 cursor-pointer"
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/register')}
                            className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>Get Started</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Mobile Controls (Theme Switch + Hamburger) */}
                    <div className="sm:hidden flex items-center gap-2">
                        <ThemeSwitch />
                        <button
                            type="button"
                            className="p-2 rounded-xl text-slate-700 dark:text-white/90 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            onClick={() => setIsOpen(!isOpen)}
                            aria-label="Toggle navigation menu"
                        >
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>

                    {/* Desktop/Tablet Hamburger Button for Medium Screens */}
                    <div className="hidden sm:flex lg:hidden items-center gap-2">
                        <button
                            type="button"
                            className="p-2 rounded-xl text-slate-700 dark:text-white/90 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            onClick={() => setIsOpen(!isOpen)}
                            aria-label="Toggle navigation menu"
                        >
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="lg:hidden fixed top-[4.5rem] left-4 right-4 z-50 bg-white/95 dark:bg-[#060B13]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl rounded-[2rem] p-5 pointer-events-auto"
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
                                                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15"
                                                : "text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/5"
                                        )}
                                    >
                                        <span>{item.label}</span>
                                        {active && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                                    </Link>
                                );
                            })}
                            <div className="h-px bg-slate-200 dark:bg-white/10 my-2" />
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => { setIsOpen(false); navigate('/login'); }}
                                    className="w-full py-3 rounded-xl text-xs font-extrabold text-slate-800 dark:text-white bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10"
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

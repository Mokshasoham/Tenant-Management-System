import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    Building2, ArrowRight, Compass, FileText, CreditCard,
    Wrench, MessageSquare, Sparkles, Heart, Layers,
    LogIn, UserPlus, Home, Activity, ShieldCheck
} from 'lucide-react';
import { cn } from '../utils/cn';

export default function PublicFooter({ showCta = true }) {
    const navigate = useNavigate();
    const location = useLocation();

    const isLinkActive = (path) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        const cleanPath = path.replace(/^\//, '');
        return location.pathname === path ||
               location.pathname.startsWith(`/${cleanPath}`) ||
               location.pathname.startsWith(`/public/${cleanPath}`);
    };

    const journeySteps = [
        { key: 'discover', step: '01', label: 'DISCOVER', desc: 'Verified Listings', icon: Compass },
        { key: 'lease', step: '02', label: 'LEASE', desc: 'Digital Contracts', icon: FileText },
        { key: 'pay', step: '03', label: 'PAY', desc: 'Integrated INR (₹)', icon: CreditCard },
        { key: 'operate', step: '04', label: 'OPERATE', desc: 'Workforce & Maintenance', icon: Wrench },
        { key: 'connect', step: '05', label: 'CONNECT', desc: 'Scoped Messaging', icon: MessageSquare },
    ];

    const navGroups = [
        {
            title: 'Platform',
            links: [
                { label: 'Home', path: '/', icon: Home },
                { label: 'Properties', path: '/properties', icon: Building2 },
                { label: 'How It Works', path: '/how-it-works', icon: Compass },
                { label: 'Features', path: '/features', icon: Sparkles },
            ]
        },
        {
            title: 'Solutions',
            links: [
                { label: 'For Tenants', path: '/for-tenants', icon: Heart },
                { label: 'For Managers', path: '/for-managers', icon: Layers },
            ]
        },
        {
            title: 'Tenant',
            links: [
                { label: 'Find a Property', path: '/properties', icon: Building2 },
                { label: 'Tenant Experience', path: '/for-tenants', icon: Heart },
                { label: 'How Renting Works', path: '/how-it-works', icon: Compass },
            ]
        },
        {
            title: 'Manager',
            links: [
                { label: 'Manage Properties', path: '/for-managers', icon: Building2 },
                { label: 'Property Operations', path: '/for-managers', icon: Activity },
                { label: 'Manager Experience', path: '/for-managers', icon: Layers },
            ]
        },
        {
            title: 'Access',
            links: [
                { label: 'Sign In', path: '/login', icon: LogIn },
                { label: 'Get Started', path: '/register', icon: UserPlus },
            ]
        }
    ];

    return (
        <div className="relative z-10 w-full overflow-hidden text-left font-sans select-none transition-colors duration-300">
            {/* ══════════════════════════════════════════════════════
                1. SOPHISTICATED COMMAND-CENTER CTA PANEL
            ══════════════════════════════════════════════════════ */}
            {showCta && (
                <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-16 pb-20">
                    <div className="relative rounded-[3rem] p-8 sm:p-14 lg:p-16 overflow-hidden bg-gradient-to-b from-white via-slate-50 to-emerald-50/30 dark:from-[#0A111E] dark:via-[#060B13] dark:to-[#04070D] border border-slate-200/90 dark:border-white/10 shadow-[0_20px_50px_rgba(16,185,129,0.08)] dark:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.08)] transition-all duration-300">
                        {/* Background Architectural Mesh / Glow Texture */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent dark:from-emerald-500/15 dark:via-teal-500/5 dark:to-transparent pointer-events-none" />
                        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                        {/* Subtle Grid Lines */}
                        <div
                            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                            style={{
                                backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
                                backgroundSize: '40px 40px'
                            }}
                        />

                        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
                            {/* Command Center Tag */}
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-[11px] font-black uppercase tracking-[0.2em] shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>TMS Command Center</span>
                            </div>

                            {/* Headline */}
                            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1] font-sans">
                                Ready to manage <br className="hidden sm:inline" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400">
                                    renting differently?
                                </span>
                            </h2>

                            {/* Supporting Text */}
                            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
                                Discover verified homes or bring your entire rental operation into one connected platform.
                            </p>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => navigate('/properties')}
                                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <span>Explore Properties</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/register')}
                                    className="px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white/10 dark:hover:bg-white/20 border border-slate-900 dark:border-white/20 font-black text-xs uppercase tracking-widest backdrop-blur-xl transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                                >
                                    Get Started
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ══════════════════════════════════════════════════════
                2. MAIN LUXURY ENTERPRISE FOOTER
            ══════════════════════════════════════════════════════ */}
            <footer className="relative bg-slate-50 dark:bg-[#03060B] border-t border-slate-200 dark:border-white/10 pt-16 pb-12 px-4 sm:px-6 lg:px-8 text-left transition-colors duration-300">
                {/* Background Ambient Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-emerald-500/5 dark:from-emerald-950/20 via-transparent to-transparent pointer-events-none" />

                <div className="max-w-7xl mx-auto space-y-16 relative z-10">

                    {/* ══════════════════════════════════════════════════
                        HORIZONTAL PRODUCT JOURNEY PIPELINE
                    ══════════════════════════════════════════════════ */}
                    <div className="p-6 sm:p-8 rounded-[2.5rem] bg-white dark:bg-[#070D18]/90 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-lg dark:shadow-2xl">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
                                    Unified Platform Ecosystem
                                </span>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    TMS connects the entire rental journey.
                                </h3>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Zero fragmentation • 100% digital</span>
                            </div>
                        </div>

                        {/* Interactive Horizontal Connected Pipeline */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-6">
                            {journeySteps.map((step) => {
                                const Icon = step.icon;
                                return (
                                    <div
                                        key={step.key}
                                        className="relative p-4 rounded-2xl bg-slate-50/80 hover:bg-emerald-50/50 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border border-slate-200/80 hover:border-emerald-500/40 dark:border-white/5 dark:hover:border-emerald-500/30 transition-all group"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">
                                                <Icon className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-[10px] font-black font-mono text-emerald-600 dark:text-emerald-400">
                                                {step.step}
                                            </span>
                                        </div>
                                        <p className="text-xs font-black tracking-wider text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                            {step.label}
                                        </p>
                                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                            {step.desc}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════
                        MAIN NAVIGATION & BRAND GRID
                    ══════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">

                        {/* Left Brand Area (4 Cols) */}
                        <div className="lg:col-span-4 space-y-5">
                            <Link to="/" className="flex items-center gap-3 group select-none inline-flex">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 group-hover:scale-105 group-hover:shadow-emerald-500/40 transition-all">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col text-left">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-sans">TMS</span>
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                    <span className="text-[9px] font-black tracking-[0.25em] text-emerald-600 dark:text-emerald-400 uppercase leading-none">
                                        Smart Rental Management
                                    </span>
                                </div>
                            </Link>

                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-sm">
                                A connected rental platform for discovering properties, managing leases, handling payments, and running property operations.
                            </p>

                            {/* Status / Trust Badge */}
                            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3.5 py-1.5 rounded-xl shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>BUILT FOR MODERN RENTAL OPERATIONS</span>
                            </div>
                        </div>

                        {/* 5 Distinct Navigation Groups (8 Cols) */}
                        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8">
                            {navGroups.map((group) => (
                                <div key={group.title} className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-white/10">
                                        <span className="w-1 h-3 rounded-full bg-emerald-500" />
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white/90">
                                            {group.title}
                                        </h4>
                                    </div>

                                    <ul className="space-y-2.5">
                                        {group.links.map((link) => {
                                            const active = isLinkActive(link.path);
                                            const LinkIcon = link.icon;
                                            return (
                                                <li key={`${group.title}-${link.label}`}>
                                                    <Link
                                                        to={link.path}
                                                        className={cn(
                                                            "group flex items-center justify-between text-xs font-bold transition-all py-1 cursor-pointer",
                                                            active
                                                                ? "text-emerald-600 dark:text-emerald-400 font-black translate-x-1"
                                                                : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:translate-x-1.5"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <LinkIcon className={cn(
                                                                "w-3.5 h-3.5 transition-colors shrink-0",
                                                                active ? "text-emerald-500" : "text-slate-400 dark:text-slate-500 group-hover:text-emerald-500"
                                                            )} />
                                                            <span>{link.label}</span>
                                                        </div>
                                                        <ArrowRight className={cn(
                                                            "w-3 h-3 text-emerald-500 transition-all duration-200 shrink-0",
                                                            active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                                                        )} />
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>

                    </div>

                    {/* ══════════════════════════════════════════════════
                        BOTTOM BAR
                    ══════════════════════════════════════════════════ */}
                    <div className="pt-8 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-500">
                        <p>© 2026 TMS (Tenant Management System). All rights reserved.</p>
                        <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500 text-[11px] font-medium">
                            <span>Privacy</span>
                            <span>•</span>
                            <span>Terms</span>
                            <span>•</span>
                            <span>Security</span>
                        </div>
                        <p className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            Built for modern rental living
                        </p>
                    </div>

                </div>
            </footer>
        </div>
    );
}

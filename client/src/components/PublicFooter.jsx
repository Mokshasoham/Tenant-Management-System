import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Building2, ArrowRight, ShieldCheck, Compass, FileText,
    CreditCard, Wrench, MessageSquare, Sparkles, CheckCircle2,
    Activity, Lock, Layers
} from 'lucide-react';
import { cn } from '../utils/cn';

export default function PublicFooter({ showCta = true }) {
    const navigate = useNavigate();

    const journeySteps = [
        { key: 'discover', label: 'DISCOVER', desc: 'Verified Listings', icon: Compass },
        { key: 'lease', label: 'LEASE', desc: 'Digital Contracts', icon: FileText },
        { key: 'pay', label: 'PAY', desc: 'Integrated INR (₹)', icon: CreditCard },
        { key: 'operate', label: 'OPERATE', desc: 'Workforce & Maintenance', icon: Wrench },
        { key: 'connect', label: 'CONNECT', desc: 'Scoped Messaging', icon: MessageSquare },
    ];

    return (
        <div className="relative z-10 w-full overflow-hidden text-left font-sans select-none">
            {/* ══════════════════════════════════════════════════════
                1. SOPHISTICATED COMMAND-CENTER CTA PANEL
            ══════════════════════════════════════════════════════ */}
            {showCta && (
                <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-16 pb-20">
                    <div className="relative rounded-[3rem] p-8 sm:p-14 lg:p-16 overflow-hidden bg-gradient-to-b from-[#0A111E] via-[#060B13] to-[#04070D] border border-slate-200/80 dark:border-white/10 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.08)]">
                        {/* Background Architectural Mesh / Glow Texture */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/15 via-teal-500/5 to-transparent pointer-events-none" />
                        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                        {/* Subtle Grid Lines */}
                        <div
                            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                            style={{
                                backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
                                backgroundSize: '40px 40px'
                            }}
                        />

                        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
                            {/* Command Center Tag */}
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[11px] font-black uppercase tracking-[0.2em] shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>TMS Command Center</span>
                            </div>

                            {/* Headline */}
                            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] drop-shadow-sm font-sans">
                                Ready to manage <br className="hidden sm:inline" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                                    renting differently?
                                </span>
                            </h2>

                            {/* Supporting Text */}
                            <p className="text-sm sm:text-base text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
                                Discover verified homes or bring your entire rental operation into one connected platform.
                            </p>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => navigate('/public/properties')}
                                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <span>Explore Properties</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/register')}
                                    className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white font-black text-xs uppercase tracking-widest backdrop-blur-xl transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 cursor-pointer"
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
            <footer className="relative bg-[#03060B] border-t border-white/10 pt-16 pb-12 px-4 sm:px-6 lg:px-8 text-left transition-colors duration-300">
                {/* Background Ambient Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-emerald-950/20 via-transparent to-transparent pointer-events-none" />

                <div className="max-w-7xl mx-auto space-y-16 relative z-10">

                    {/* ══════════════════════════════════════════════════
                        HORIZONTAL PRODUCT JOURNEY STATEMENT
                    ══════════════════════════════════════════════════ */}
                    <div className="p-6 sm:p-8 rounded-[2.5rem] bg-[#070D18]/90 backdrop-blur-2xl border border-white/10 shadow-2xl">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">
                                    Unified Platform Ecosystem
                                </span>
                                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                    TMS connects the entire rental journey.
                                </h3>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Zero fragmentation • 100% digital</span>
                            </div>
                        </div>

                        {/* Interactive Horizontal Flow */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-6">
                            {journeySteps.map((step, idx) => {
                                const Icon = step.icon;
                                return (
                                    <div
                                        key={step.key}
                                        className="relative p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-emerald-500/30 transition-all group"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">
                                                <Icon className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-[9px] font-black font-mono text-slate-500">
                                                0{idx + 1}
                                            </span>
                                        </div>
                                        <p className="text-xs font-black tracking-wider text-white group-hover:text-emerald-400 transition-colors">
                                            {step.label}
                                        </p>
                                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">
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
                                        <span className="text-2xl font-black tracking-tight text-white font-sans">TMS</span>
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                    <span className="text-[9px] font-black tracking-[0.25em] text-emerald-400 uppercase leading-none">
                                        Smart Rental Management
                                    </span>
                                </div>
                            </Link>

                            <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed max-w-sm">
                                A connected rental platform for discovering properties, managing leases, handling payments, and running property operations.
                            </p>

                            {/* Trust Badge */}
                            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>Built for modern rental operations</span>
                            </div>
                        </div>

                        {/* 5 Navigation Groups (8 Cols) */}
                        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8">

                            {/* Column 1: PLATFORM */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">
                                    Platform
                                </h4>
                                <ul className="space-y-2.5 text-xs font-bold text-slate-400">
                                    <li>
                                        <Link to="/" className="hover:text-emerald-400 transition-colors">Home</Link>
                                    </li>
                                    <li>
                                        <Link to="/public/properties" className="hover:text-emerald-400 transition-colors">Properties</Link>
                                    </li>
                                    <li>
                                        <Link to="/public/how-it-works" className="hover:text-emerald-400 transition-colors">How It Works</Link>
                                    </li>
                                    <li>
                                        <Link to="/public/features" className="hover:text-emerald-400 transition-colors">Features</Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Column 2: SOLUTIONS */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">
                                    Solutions
                                </h4>
                                <ul className="space-y-2.5 text-xs font-bold text-slate-400">
                                    <li>
                                        <Link to="/public/for-tenants" className="hover:text-emerald-400 transition-colors">For Tenants</Link>
                                    </li>
                                    <li>
                                        <Link to="/public/for-managers" className="hover:text-emerald-400 transition-colors">For Managers</Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Column 3: TENANT */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">
                                    Tenant
                                </h4>
                                <ul className="space-y-2.5 text-xs font-bold text-slate-400">
                                    <li>
                                        <Link to="/public/properties" className="hover:text-emerald-400 transition-colors">Find a Property</Link>
                                    </li>
                                    <li>
                                        <Link to="/public/for-tenants" className="hover:text-emerald-400 transition-colors">Tenant Experience</Link>
                                    </li>
                                    <li>
                                        <Link to="/public/how-it-works" className="hover:text-emerald-400 transition-colors">How Renting Works</Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Column 4: MANAGER */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">
                                    Manager
                                </h4>
                                <ul className="space-y-2.5 text-xs font-bold text-slate-400">
                                    <li>
                                        <Link to="/public/for-managers" className="hover:text-emerald-400 transition-colors">Manage Properties</Link>
                                    </li>
                                    <li>
                                        <Link to="/public/for-managers" className="hover:text-emerald-400 transition-colors">Property Operations</Link>
                                    </li>
                                    <li>
                                        <Link to="/public/for-managers" className="hover:text-emerald-400 transition-colors">Manager Experience</Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Column 5: ACCESS */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">
                                    Access
                                </h4>
                                <ul className="space-y-2.5 text-xs font-bold text-slate-400">
                                    <li>
                                        <Link to="/login" className="hover:text-emerald-400 transition-colors">Sign In</Link>
                                    </li>
                                    <li>
                                        <Link to="/register" className="hover:text-emerald-400 transition-colors">Get Started</Link>
                                    </li>
                                </ul>
                            </div>

                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════
                        BOTTOM BAR
                    ══════════════════════════════════════════════════ */}
                    <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-500">
                        <p>© 2026 TMS (Tenant Management System). All rights reserved.</p>
                        <p className="flex items-center gap-1 text-slate-400">
                            Built for modern rental living
                        </p>
                    </div>

                </div>
            </footer>
        </div>
    );
}

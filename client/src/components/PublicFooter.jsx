import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, ShieldCheck, Heart } from 'lucide-react';

export default function PublicFooter() {
    const navigate = useNavigate();

    return (
        <footer className="relative bg-white dark:bg-[#04070D] border-t border-slate-200 dark:border-white/10 pt-16 pb-12 px-4 sm:px-6 lg:px-8 text-left transition-colors duration-300">
            <div className="max-w-7xl mx-auto space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                    {/* Brand Column */}
                    <div className="lg:col-span-2 space-y-4">
                        <Link to="/" className="flex items-center gap-3 group select-none inline-flex">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-all">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-sans">TMS</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                </div>
                                <span className="text-[8px] font-black tracking-[0.2em] text-emerald-600 dark:text-emerald-400 uppercase leading-none">
                                    Smart Rental Management
                                </span>
                            </div>
                        </Link>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-sm">
                            Next-generation rental management connecting verified tenants and property managers through digital leasing, instant payments, and centralized operations.
                        </p>
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl w-fit">
                            <ShieldCheck className="w-3.5 h-3.5" /> 100% Verified Platform
                        </div>
                    </div>

                    {/* Column: Platform */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Platform</h4>
                        <ul className="space-y-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <li>
                                <Link to="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">Home</Link>
                            </li>
                            <li>
                                <Link to="/public/properties" className="hover:text-slate-900 dark:hover:text-white transition-colors">Browse Properties</Link>
                            </li>
                            <li>
                                <Link to="/public/how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors">How It Works</Link>
                            </li>
                            <li>
                                <Link to="/public/features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Platform Features</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column: Solutions */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Solutions</h4>
                        <ul className="space-y-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <li>
                                <Link to="/public/for-tenants" className="hover:text-slate-900 dark:hover:text-white transition-colors">For Tenants</Link>
                            </li>
                            <li>
                                <Link to="/public/for-managers" className="hover:text-slate-900 dark:hover:text-white transition-colors">For Property Managers</Link>
                            </li>
                            <li>
                                <Link to="/public/properties" className="hover:text-slate-900 dark:hover:text-white transition-colors">Find a Rental</Link>
                            </li>
                            <li>
                                <Link to="/public/how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors">Move-in Journey</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column: Access */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Access</h4>
                        <ul className="space-y-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <li>
                                <Link to="/login" className="hover:text-slate-900 dark:hover:text-white transition-colors">Sign In</Link>
                            </li>
                            <li>
                                <Link to="/register" className="hover:text-slate-900 dark:hover:text-white transition-colors">Create Free Account</Link>
                            </li>
                            <li>
                                <Link to="/public/for-managers" className="hover:text-slate-900 dark:hover:text-white transition-colors">Manager Portal Preview</Link>
                            </li>
                            <li>
                                <Link to="/public/for-tenants" className="hover:text-slate-900 dark:hover:text-white transition-colors">Tenant App Preview</Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-500">
                    <p>© 2026 TMS (Tenant Management System). All rights reserved.</p>
                    <p className="flex items-center gap-1">
                        Engineered for modern rental living
                    </p>
                </div>
            </div>
        </footer>
    );
}

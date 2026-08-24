import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Building2, BarChart3, Users, CreditCard, Wrench,
    FileText, ShieldCheck, ArrowRight, CheckCircle2,
    Sparkles, Clock, TrendingUp, DollarSign, Calculator, Lock
} from 'lucide-react';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';
import PageTransition from '../../components/PageTransition';
import { cn } from '../../utils/cn';

export default function ForManagersPage() {
    const navigate = useNavigate();

    // ROI Calculator State
    const [unitsCount, setUnitsCount] = useState(15);
    const hoursSavedPerMonth = unitsCount * 3.5; // ~3.5 hours saved per unit/month on manual rent chasing & paper leases
    const estimatedExtraRevenue = Math.round(unitsCount * 2500); // reduced vacancy duration value

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 dark:bg-[#060B13] text-slate-900 dark:text-white antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-300">
                <PublicNavbar />

                {/* Hero Section */}
                <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-left">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-7 space-y-6">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest">
                                <Building2 className="w-4 h-4 text-blue-500" /> Property Operations & Portfolio SaaS
                            </div>

                            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
                                Run your entire rental portfolio <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-400 to-teal-400">
                                    from one command center.
                                </span>
                            </h1>

                            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium max-w-xl leading-relaxed">
                                Automate tenant screening, rent reconciliation in ₹ (INR), digital lease agreements, and technician dispatch across all your residential and commercial properties.
                            </p>

                            <div className="flex flex-wrap items-center gap-4 pt-2">
                                <button
                                    onClick={() => navigate('/register')}
                                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <span>Start Managing Properties</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => navigate('/public/features')}
                                    className="px-7 py-4 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                                >
                                    Explore Manager Features
                                </button>
                            </div>

                            <div className="flex items-center gap-6 pt-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                    <span>Zero Onboarding Fees</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                    <span>Real-Time P&L Tracking</span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Operations Hub Dashboard Preview */}
                        <div className="lg:col-span-5">
                            <div className="p-7 rounded-[2.5rem] bg-white dark:bg-[#0A101C] border border-slate-200 dark:border-white/10 shadow-2xl space-y-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black text-xs">
                                            TMS
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-900 dark:text-white">Operations Hub Preview</p>
                                            <p className="text-[10px] text-slate-400 font-bold">Illustrative Portfolio Dashboard</p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                        Executive Live
                                    </span>
                                </div>

                                {/* Metric Quad */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                        <p className="text-[10px] font-black uppercase text-slate-400">Managed Units</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white mt-1">24 Units</p>
                                        <p className="text-[9px] text-emerald-500 font-bold mt-0.5">94% Occupancy</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                        <p className="text-[10px] font-black uppercase text-slate-400">Monthly Collections</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white mt-1">₹8.4L</p>
                                        <p className="text-[9px] text-emerald-500 font-bold mt-0.5">100% Reconciled</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                        <p className="text-[10px] font-black uppercase text-slate-400">Active Tenants</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white mt-1">86 Tenants</p>
                                        <p className="text-[9px] text-blue-500 font-bold mt-0.5">Verified KYC</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                        <p className="text-[10px] font-black uppercase text-slate-400">Open Tickets</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white mt-1">3 Tickets</p>
                                        <p className="text-[9px] text-amber-500 font-bold mt-0.5">Technicians Assigned</p>
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <span>Automated Lease Renewal Rate:</span>
                                    <span className="font-black text-blue-600 dark:text-blue-400">91.4%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Manager Value Pillars */}
                <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-left border-t border-slate-200 dark:border-white/10">
                    <div className="space-y-3 mb-16 max-w-2xl">
                        <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Manager Capabilities</span>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            Built to scale property businesses of any size.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Building2,
                                title: "Portfolio Centralization",
                                desc: "Manage single flats, multi-unit apartment complexes, and commercial properties under one unified command interface."
                            },
                            {
                                icon: CreditCard,
                                title: "Automated Rent Reconciliation",
                                desc: "Say goodbye to tracking bank transfers manually. Automatic payment matching in ₹ (INR) with real-time overdue alerts."
                            },
                            {
                                icon: Users,
                                title: "Fast Applicant Screening",
                                desc: "Review prospective tenant profiles, move-in dates, and KYC verification before issuing one-click approvals."
                            },
                            {
                                icon: FileText,
                                title: "Digital Lease & Renewal Engine",
                                desc: "Generate standardized legally compliant agreements, collect digital signatures, and automate renewal notices."
                            },
                            {
                                icon: Wrench,
                                title: "Workforce & Technician Dispatch",
                                desc: "Assign repair jobs to in-house technicians, monitor resolution SLA times, and keep tenants updated automatically."
                            },
                            {
                                icon: BarChart3,
                                title: "P&L Financial Reports",
                                desc: "Access real-time occupancy rates, monthly collection summaries, expense tracking, and export tax-ready statements."
                            }
                        ].map((p, i) => {
                            const Icon = p.icon;
                            return (
                                <div
                                    key={i}
                                    className="p-7 rounded-[2rem] bg-white dark:bg-[#0A101C] border border-slate-200 dark:border-white/10 hover:border-blue-500/40 transition-all shadow-lg space-y-4"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                        {p.title}
                                    </h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                        {p.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Interactive ROI & Time Savings Calculator */}
                <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-left">
                    <div className="p-8 sm:p-12 rounded-[3rem] bg-white dark:bg-[#0A101C] border border-slate-200 dark:border-white/10 shadow-2xl space-y-8">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                <Calculator className="w-4 h-4" /> Operational Efficiency Estimator
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                Estimate your time & operational savings.
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                See how much time TMS saves your team across rent collection, paperwork, and maintenance dispatch.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            {/* Units Slider */}
                            <div className="space-y-4">
                                <div className="flex justify-between text-xs font-black">
                                    <span className="text-slate-500">Number of Managed Units</span>
                                    <span className="text-blue-500">{unitsCount} Units</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="100"
                                    step="1"
                                    value={unitsCount}
                                    onChange={(e) => setUnitsCount(Number(e.target.value))}
                                    className="w-full accent-blue-500 cursor-pointer"
                                />
                                <p className="text-[10px] text-slate-400">
                                    Based on automated rent reconciliation, digital lease drafting, and maintenance ticketing.
                                </p>
                            </div>

                            {/* Savings Metrics */}
                            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/20 space-y-4">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-xs font-bold text-slate-500">Admin Hours Saved:</span>
                                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                        ~{Math.round(hoursSavedPerMonth)} hrs<span className="text-xs font-normal text-slate-400">/mo</span>
                                    </span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-xs font-bold text-slate-500">Rent Collection Time:</span>
                                    <span className="text-sm font-black text-emerald-500">Near Instant (Auto)</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-xs font-bold text-slate-500">Lease Turnaround:</span>
                                    <span className="text-sm font-black text-indigo-500">&lt; 15 Minutes</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <PublicFooter />
            </div>
        </PageTransition>
    );
}

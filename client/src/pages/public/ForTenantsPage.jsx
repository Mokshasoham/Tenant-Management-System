import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Heart, ShieldCheck, CreditCard, FileText, Wrench,
    MessageSquare, ArrowRight, CheckCircle2, Sparkles,
    Search, MapPin, Calculator, Clock, Star, Lock
} from 'lucide-react';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';
import PageTransition from '../../components/PageTransition';
import { cn } from '../../utils/cn';

export default function ForTenantsPage() {
    const navigate = useNavigate();

    // Move-in cost estimator state
    const [monthlyRent, setMonthlyRent] = useState(25000);
    const [depositMonths, setDepositMonths] = useState(2);

    const securityDeposit = monthlyRent * depositMonths;
    const firstMonthTotal = Number(monthlyRent) + securityDeposit;

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 dark:bg-[#060B13] text-slate-900 dark:text-white antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-300">
                <PublicNavbar />

                {/* Hero Section */}
                <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-left">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-7 space-y-6">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest">
                                <Heart className="w-4 h-4 text-emerald-500" /> Tenant Experience
                            </div>

                            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
                                Your next home, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500">
                                    without the rental chaos.
                                </span>
                            </h1>

                            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium max-w-xl leading-relaxed">
                                No fake listings, no aggressive brokers, and no stacks of physical paperwork. Discover verified homes, sign digital leases, pay rent in ₹ (INR), and get maintenance sorted with ease.
                            </p>

                            <div className="flex flex-wrap items-center gap-4 pt-2">
                                <button
                                    onClick={() => navigate('/public/properties')}
                                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <span>Find Your Home</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => navigate('/register')}
                                    className="px-7 py-4 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                                >
                                    Create Free Tenant Account
                                </button>
                            </div>

                            <div className="flex items-center gap-6 pt-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span>100% Free for Tenants</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span>Zero Brokerage Fees</span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Tenant Dashboard Mockup Preview */}
                        <div className="lg:col-span-5">
                            <div className="p-7 rounded-[2.5rem] bg-white dark:bg-[#0A101C] border border-slate-200 dark:border-white/10 shadow-2xl space-y-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-xs">
                                            TMS
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-900 dark:text-white">Tenant Hub Preview</p>
                                            <p className="text-[10px] text-slate-400 font-bold">Ocean Pearl Residency • Unit 4B</p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                        Active Tenancy
                                    </span>
                                </div>

                                {/* Mockup Lease Box */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400 font-bold">Upcoming Rent Due</span>
                                        <span className="text-emerald-500 font-black">22nd of Every Month</span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-2xl font-black text-slate-900 dark:text-white">₹25,000</span>
                                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-md">Auto-Receipt Active</span>
                                    </div>
                                </div>

                                {/* Maintenance Ticket Preview */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-black text-slate-900 dark:text-white">Maintenance Request</span>
                                        <span className="text-[10px] font-black text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded-md">In Progress</span>
                                    </div>
                                    <p className="text-xs text-slate-500">AC filter service & coolant check</p>
                                    <p className="text-[10px] text-emerald-500 font-bold">Technician assigned • Arriving today</p>
                                </div>

                                <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs font-bold text-slate-500">
                                    <span>Verified Tenant Badge: Active</span>
                                    <span className="text-emerald-500">Trust Score 95/100</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 6 Tenant Pillars */}
                <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-left border-t border-slate-200 dark:border-white/10">
                    <div className="space-y-3 mb-16 max-w-2xl">
                        <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Tenant Benefits</span>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            Built around how you actually want to rent.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: ShieldCheck,
                                title: "100% Verified Listings",
                                desc: "Every property is audited for genuine photos, true rent pricing, and verified manager ownership before being listed."
                            },
                            {
                                icon: FileText,
                                title: "Digital Lease Signing",
                                desc: "Sign standardized residential lease agreements from your smartphone. Access your legally-binding contracts anytime."
                            },
                            {
                                icon: CreditCard,
                                title: "1-Click Rent Payments",
                                desc: "Pay rent using Razorpay with UPI, debit cards, or net banking. Download instant PDF receipts for HRA tax exemption."
                            },
                            {
                                icon: Wrench,
                                title: "Easy Maintenance Tickets",
                                desc: "Raise maintenance requests with photos in 30 seconds. Track technician dispatch and repair status live."
                            },
                            {
                                icon: MessageSquare,
                                title: "Direct Manager Chat",
                                desc: "Communicate directly with your assigned property manager through secure, relationship-isolated messaging."
                            },
                            {
                                icon: Star,
                                title: "Verified Tenant Trust Score",
                                desc: "Build a stellar rental track record with on-time payments to unlock priority booking across all future TMS homes."
                            }
                        ].map((b, i) => {
                            const Icon = b.icon;
                            return (
                                <div
                                    key={i}
                                    className="p-7 rounded-[2rem] bg-white dark:bg-[#0A101C] border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 transition-all shadow-lg space-y-4"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                        {b.title}
                                    </h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                        {b.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Interactive Move-In Cost Calculator */}
                <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-left">
                    <div className="p-8 sm:p-12 rounded-[3rem] bg-white dark:bg-[#0A101C] border border-slate-200 dark:border-white/10 shadow-2xl space-y-8">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                <Calculator className="w-4 h-4" /> Move-In Cost Estimator
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                Calculate your estimated upfront move-in budget.
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                Plan your move with complete financial transparency in ₹ (INR).
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            {/* Sliders */}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-black">
                                        <span className="text-slate-500">Monthly Rent</span>
                                        <span className="text-emerald-500">₹{Number(monthlyRent).toLocaleString('en-IN')} / mo</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10000"
                                        max="150000"
                                        step="2000"
                                        value={monthlyRent}
                                        onChange={(e) => setMonthlyRent(Number(e.target.value))}
                                        className="w-full accent-emerald-500 cursor-pointer"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-black">
                                        <span className="text-slate-500">Security Deposit Multiple</span>
                                        <span className="text-emerald-500">{depositMonths} Months</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="6"
                                        step="1"
                                        value={depositMonths}
                                        onChange={(e) => setDepositMonths(Number(e.target.value))}
                                        className="w-full accent-emerald-500 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Summary Card */}
                            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 space-y-4">
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">First Month Rent:</span>
                                        <span className="font-bold text-slate-900 dark:text-white">₹{Number(monthlyRent).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">Security Deposit ({depositMonths} mo):</span>
                                        <span className="font-bold text-slate-900 dark:text-white">₹{securityDeposit.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">Brokerage Fee:</span>
                                        <span className="font-black text-emerald-500">₹0 (Zero Fees)</span>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-baseline">
                                    <span className="text-xs font-black uppercase text-slate-400">Total Move-in Cost</span>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                                        ₹{firstMonthTotal.toLocaleString('en-IN')}
                                    </span>
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

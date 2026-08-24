import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Compass, CheckCircle2, FileText, CreditCard, Wrench,
    MessageSquare, ShieldCheck, ArrowRight, Sparkles, Building2,
    Users, Clock, UserCheck, Check, Search, Scale, ChevronRight
} from 'lucide-react';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';
import PageTransition from '../../components/PageTransition';
import { cn } from '../../utils/cn';

export default function HowItWorksPage() {
    const navigate = useNavigate();
    const [journey, setJourney] = useState('tenant'); // 'tenant' | 'manager'

    const tenantSteps = [
        {
            num: "01",
            title: "Discover & Explore",
            subtitle: "Find your ideal rental",
            desc: "Search through verified listings with high-resolution photos, exact pricing in ₹ INR, detailed floor plans, and authentic amenity lists.",
            icon: Search,
            badge: "Discovery",
            color: "from-emerald-500 to-teal-600",
            previewTitle: "Filter by BHK, City & Budget",
            previewDetails: "100% verified listings with zero fake photos."
        },
        {
            num: "02",
            title: "Compare & Shortlist",
            subtitle: "Make data-backed decisions",
            desc: "Select up to 3 properties and compare rent, security deposit, square footage, and amenities side-by-side.",
            icon: Scale,
            badge: "Evaluation",
            color: "from-teal-500 to-cyan-600",
            previewTitle: "Side-by-Side Comparison",
            previewDetails: "Compare rent, deposit & amenities in 1-click."
        },
        {
            num: "03",
            title: "Submit Booking Request",
            subtitle: "Lock in your move-in dates",
            desc: "Select your desired move-in date, lease duration, and submit your official booking request directly to the property manager.",
            icon: Building2,
            badge: "Application",
            color: "from-cyan-500 to-blue-600",
            previewTitle: "Direct Manager Booking",
            previewDetails: "No middleman brokers or hidden commission."
        },
        {
            num: "04",
            title: "KYC & Verification",
            subtitle: "Digital identity verification",
            desc: "Upload identification documents securely to earn a Verified Tenant badge and speed up manager approval.",
            icon: ShieldCheck,
            badge: "Trust & Safety",
            color: "from-blue-500 to-indigo-600",
            previewTitle: "Verified Tenant Trust Score",
            previewDetails: "Fast, encrypted KYC document submission."
        },
        {
            num: "05",
            title: "Digital Lease Signing",
            subtitle: "Paperless legal contract",
            desc: "Review legal terms, standard clauses, and sign your official digital lease agreement online without printer or courier hassles.",
            icon: FileText,
            badge: "Leasing",
            color: "from-indigo-500 to-purple-600",
            previewTitle: "Standardized Digital Lease",
            previewDetails: "Legally compliant digital execution."
        },
        {
            num: "06",
            title: "Seamless Rent Payments",
            subtitle: "Secure digital transactions",
            desc: "Pay your security deposit and monthly rent via Razorpay UPI, card, or net banking. Instant auto-generated PDF receipts for tax savings.",
            icon: CreditCard,
            badge: "Payments",
            color: "from-purple-500 to-pink-600",
            previewTitle: "Instant Rent Receipts (₹)",
            previewDetails: "Download tax receipts for HRA claims."
        },
        {
            num: "07",
            title: "Move-In & Stay Connected",
            subtitle: "Effortless living experience",
            desc: "Raise maintenance requests with photo attachments, track technician dispatch, and chat directly with your assigned property manager.",
            icon: Wrench,
            badge: "Tenancy",
            color: "from-emerald-500 to-teal-600",
            previewTitle: "In-App Maintenance & Chat",
            previewDetails: "Technician tracking & relationship-scoped chat."
        }
    ];

    const managerSteps = [
        {
            num: "01",
            title: "List & Configure Property",
            subtitle: "Publish your units",
            desc: "Upload photos, set monthly rent in ₹, define deposit amounts, and specify amenities across your residential and commercial units.",
            icon: Building2,
            badge: "Listing",
            color: "from-blue-500 to-indigo-600",
            previewTitle: "Complete Unit Setup",
            previewDetails: "Upload media, geo-location & amenities."
        },
        {
            num: "02",
            title: "Property Verification",
            subtitle: "Earn verified trust score",
            desc: "Submit property documentation to receive an official Verified Property Badge, boosting inquiry conversion and applicant quality.",
            icon: ShieldCheck,
            badge: "Verification",
            color: "from-indigo-500 to-cyan-600",
            previewTitle: "Verified Listing Badge",
            previewDetails: "Maximize credibility and tenant inquiries."
        },
        {
            num: "03",
            title: "Screen Booking Requests",
            subtitle: "Review tenant applications",
            desc: "Receive booking requests with complete tenant profile information, requested move-in dates, and KYC verification status.",
            icon: Users,
            badge: "Screening",
            color: "from-cyan-500 to-teal-600",
            previewTitle: "Applicant Screening Queue",
            previewDetails: "Review applicants with full transparency."
        },
        {
            num: "04",
            title: "One-Click Approval",
            subtitle: "Accept qualified tenants",
            desc: "Approve or decline applicants with optional feedback notes. Approved bookings instantly trigger the automated lease workflow.",
            icon: UserCheck,
            badge: "Approval",
            color: "from-teal-500 to-emerald-600",
            previewTitle: "Instant Decision Engine",
            previewDetails: "Approve and transition directly to lease."
        },
        {
            num: "05",
            title: "Automated Lease Generation",
            subtitle: "Zero manual contract drafting",
            desc: "TMS automatically generates customized lease agreements populated with property details, rent terms, and tenant information.",
            icon: FileText,
            badge: "Lease Engine",
            color: "from-emerald-500 to-green-600",
            previewTitle: "Auto-Generated Contracts",
            previewDetails: "Automated clause & signature workflow."
        },
        {
            num: "06",
            title: "Automated Rent Collection",
            subtitle: "Track collections & overdue rent",
            desc: "Monitor monthly collections, track pending payments, and view automated reconciliation across all managed units in real time.",
            icon: CreditCard,
            badge: "Financials",
            color: "from-purple-500 to-violet-600",
            previewTitle: "Real-Time Payment Tracking",
            previewDetails: "P&L analytics & payment logs in ₹."
        },
        {
            num: "07",
            title: "Maintenance & Workforce Dispatch",
            subtitle: "Centralized operations",
            desc: "Receive maintenance tickets with photos, assign verified technicians from your workforce, and monitor resolution turnaround times.",
            icon: Wrench,
            badge: "Operations",
            color: "from-amber-500 to-orange-600",
            previewTitle: "Technician Assignment Engine",
            previewDetails: "Track maintenance tickets from open to resolved."
        }
    ];

    const currentSteps = journey === 'tenant' ? tenantSteps : managerSteps;

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 dark:bg-[#060B13] text-slate-900 dark:text-white antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-300">
                <PublicNavbar />

                {/* Header */}
                <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest">
                        <Compass className="w-4 h-4" /> End-to-End Tenancy Lifecycle
                    </div>
                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight max-w-4xl mx-auto">
                        How TMS transforms rental living & operations.
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
                        From discovery and digital leasing to instant rent collections and maintenance dispatch, explore the complete step-by-step journey.
                    </p>

                    {/* Dual Journey Switcher */}
                    <div className="flex items-center justify-center pt-4">
                        <div className="p-1.5 rounded-2xl bg-white dark:bg-[#0A101C] border border-slate-200 dark:border-white/10 shadow-lg flex items-center gap-2">
                            <button
                                onClick={() => setJourney('tenant')}
                                className={cn(
                                    "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer",
                                    journey === 'tenant'
                                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                <Compass className="w-4 h-4" />
                                <span>Tenant Journey</span>
                            </button>
                            <button
                                onClick={() => setJourney('manager')}
                                className={cn(
                                    "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer",
                                    journey === 'manager'
                                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                <Building2 className="w-4 h-4" />
                                <span>Manager Journey</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Interactive Timeline Journey */}
                <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-left pb-28">
                    <div className="relative border-l-2 border-slate-200 dark:border-white/10 ml-4 sm:ml-8 pl-6 sm:pl-10 space-y-12">
                        {currentSteps.map((step, idx) => {
                            const Icon = step.icon;
                            return (
                                <motion.div
                                    key={step.num}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: idx * 0.08 }}
                                    className="relative group"
                                >
                                    {/* Timeline Node Icon */}
                                    <div className={cn(
                                        "absolute -left-[35px] sm:-left-[51px] top-1.5 w-10 h-10 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-black text-xs shadow-lg",
                                        step.color
                                    )}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    {/* Step Content Card */}
                                    <div className="p-6 sm:p-8 rounded-[2.5rem] bg-white dark:bg-[#0A101C] border border-slate-200 dark:border-white/10 shadow-xl space-y-4 hover:border-emerald-500/40 transition-all">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                                                {step.badge}
                                            </span>
                                            <span className="text-xs font-black text-slate-400 font-mono">
                                                STEP {step.num}
                                            </span>
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                                {step.title}
                                            </h3>
                                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                                                {step.subtitle}
                                            </p>
                                        </div>

                                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                            {step.desc}
                                        </p>

                                        {/* Micro Preview Pill */}
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-black text-slate-900 dark:text-white">{step.previewTitle}</p>
                                                <p className="text-[10px] text-slate-500 font-medium">{step.previewDetails}</p>
                                            </div>
                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                                Automated ✓
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>

                <PublicFooter />
            </div>
        </PageTransition>
    );
}

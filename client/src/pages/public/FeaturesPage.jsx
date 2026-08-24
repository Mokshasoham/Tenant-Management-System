import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Sparkles, Building2, FileText, CreditCard, Wrench,
    MessageSquare, ShieldCheck, BarChart3, Bell, ArrowRight,
    CheckCircle2, Layers, Zap, Lock, Eye, Clock
} from 'lucide-react';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';
import PageTransition from '../../components/PageTransition';
import { cn } from '../../utils/cn';

export default function FeaturesPage() {
    const navigate = useNavigate();
    const [activePillar, setActivePillar] = useState(0);

    const pillars = [
        {
            id: 'discovery',
            title: 'Property Discovery & Search',
            badge: 'Discovery Engine',
            tagline: 'Precision search across verified rental inventory.',
            description: 'Find homes with accurate data, transparent pricing in ₹ INR, detailed floor plans, geo-coordinates, and authentic photo galleries.',
            icon: Building2,
            color: 'from-emerald-500 to-teal-600',
            capabilities: [
                'Multi-criteria filters: location, BHK, furnishing, and rent budget',
                'Verified property badges backed by physical inspection',
                'Direct booking requests without broker middlemen',
                'Interactive side-by-side property comparison'
            ],
            mockup: {
                title: 'Ocean Pearl Residency',
                subtitle: 'Verified Luxury Apartment • Bangalore',
                tag: 'VERIFIED LISTING',
                stat1: { label: 'Monthly Rent', value: '₹37,999' },
                stat2: { label: 'Bedrooms', value: '3 BHK' },
                stat3: { label: 'Security Deposit', value: '₹75,000' }
            }
        },
        {
            id: 'leases',
            title: 'Automated Digital Lease Engine',
            badge: 'Legal Automation',
            tagline: 'Standardized, paperless lease execution in minutes.',
            description: 'Eliminate manual drafting, notarization delays, and physical couriers. Generate legally compliant rental agreements with digital signing.',
            icon: FileText,
            color: 'from-blue-500 to-indigo-600',
            capabilities: [
                'Instant lease generation upon manager booking approval',
                'Standardized legal clauses and automated rent schedules',
                'Paperless digital signing for tenants and managers',
                'Automated renewal campaigns and notice period management'
            ],
            mockup: {
                title: 'Standard Residential Lease Agreement',
                subtitle: '11-Month Fixed Term • Legally Compliant',
                tag: 'SIGNED & ACTIVE',
                stat1: { label: 'Lease Status', value: 'Active' },
                stat2: { label: 'Duration', value: '11 Months' },
                stat3: { label: 'Lock-in Period', value: '3 Months' }
            }
        },
        {
            id: 'payments',
            title: 'Rent Collection & Payments',
            badge: 'Financial Engine',
            tagline: 'Seamless rent collection in ₹ (INR) with automated receipts.',
            description: 'Integrated digital payment gateway supporting UPI, debit/credit cards, and net banking. Automatic PDF receipt generation for HRA tax exemption.',
            icon: CreditCard,
            color: 'from-purple-500 to-pink-600',
            capabilities: [
                'Integrated Razorpay checkout supporting all Indian payment methods',
                'Instant auto-generated PDF receipts with GST/tax breakdown',
                'Automated pending payment tracking and manager reconciliation',
                'Transparent security deposit ledger and move-out settlements'
            ],
            mockup: {
                title: 'Rent Payment Ledger',
                subtitle: 'August 2026 Monthly Rent Collection',
                tag: 'PAID & VERIFIED',
                stat1: { label: 'Amount Paid', value: '₹18,685' },
                stat2: { label: 'Payment Method', value: 'UPI / Net Banking' },
                stat3: { label: 'Receipt #', value: 'TMS-REC-8921' }
            }
        },
        {
            id: 'maintenance',
            title: 'Maintenance & Workforce Dispatch',
            badge: 'Operations Hub',
            tagline: 'End-to-end maintenance resolution with technician tracking.',
            description: 'Tenants log issues with photo attachments. Managers assign verified in-house or external technicians with SLA tracking and live status updates.',
            icon: Wrench,
            color: 'from-amber-500 to-orange-600',
            capabilities: [
                'Multi-category tickets: plumbing, electrical, carpentry, appliance',
                'Technician assignment engine and workload scheduling',
                'Real-time status updates: Open, In Progress, Resolved',
                'Photo proof attachments and cost tracking'
            ],
            mockup: {
                title: 'Kitchen Plumbing Repair',
                subtitle: 'Assigned: Technician Moksha Panda',
                tag: 'IN PROGRESS',
                stat1: { label: 'Priority', value: 'High' },
                stat2: { label: 'Response SLA', value: '< 2 Hours' },
                stat3: { label: 'Status', value: 'Technician Dispatched' }
            }
        },
        {
            id: 'messaging',
            title: 'Scoped In-App Messaging',
            badge: 'Secure Communication',
            tagline: 'Direct tenant-manager chat bound to active tenancies.',
            description: 'Relationship-isolated messaging ensures communication is strictly limited to verified tenants and managers connected through booked properties.',
            icon: MessageSquare,
            color: 'from-teal-500 to-emerald-600',
            capabilities: [
                'Property-bound conversation threads with context badges',
                'Zero directory leakage — prevents unauthorized cross-contacting',
                'Real-time WebSocket message delivery and read indicators',
                'Attachment sharing for bills, receipts, and maintenance photos'
            ],
            mockup: {
                title: 'Manager–Tenant Direct Chat',
                subtitle: 'Context: Ocean Pearl Residency • Active Booking',
                tag: 'SECURE THREAD',
                stat1: { label: 'Participants', value: 'Tenant ↔ Manager' },
                stat2: { label: 'Delivery', value: 'Instant WebSocket' },
                stat3: { label: 'Privacy', value: 'Property-Scoped' }
            }
        },
        {
            id: 'verification',
            title: 'Trust & Property Verification',
            badge: 'Trust Platform',
            tagline: 'Multi-layer physical and document verification.',
            description: 'Properties undergo physical inspection, title validation, and safety checks before earning the Verified Property Trust Badge.',
            icon: ShieldCheck,
            color: 'from-blue-600 to-cyan-600',
            capabilities: [
                'Digital document and title deed authenticity verification',
                'On-site inspection checklist and photo verification',
                'Tenant KYC identity checks for enhanced safety',
                'Public trust score badge and authenticated review records'
            ],
            mockup: {
                title: 'Property Verification Audit',
                subtitle: 'Physical Inspection & Document Authentication',
                tag: 'VERIFIED BADGE ISSUED',
                stat1: { label: 'Trust Score', value: '98 / 100' },
                stat2: { label: 'Inspection', value: 'Passed ✓' },
                stat3: { label: 'Title Audit', value: 'Verified ✓' }
            }
        },
        {
            id: 'analytics',
            title: 'Portfolio Analytics & Reports',
            badge: 'Business Intelligence',
            tagline: 'Real-time metrics on occupancy, collections, and operations.',
            description: 'Managers gain deep visibility into their rental business with occupancy rate percentages, revenue trends, overdue rent alerts, and expense summaries.',
            icon: BarChart3,
            color: 'from-indigo-600 to-purple-600',
            capabilities: [
                'Real-time unit occupancy % and vacancy duration metrics',
                'Monthly collections tracking and 12-month revenue forecasting',
                'Maintenance ticket resolution times and category breakdowns',
                'Exportable financial reports for tax reconciliation'
            ],
            mockup: {
                title: 'Executive Portfolio Summary',
                subtitle: 'Live Operations & Financial Dashboard',
                tag: 'REAL-TIME DATA',
                stat1: { label: 'Occupancy Rate', value: '94%' },
                stat2: { label: 'Active Leases', value: '23 Units' },
                stat3: { label: 'Collection Rate', value: '99.2%' }
            }
        },
        {
            id: 'notifications',
            title: 'Real-Time Event Notifications',
            badge: 'Live Push',
            tagline: 'Stay updated on bookings, rent due dates, and maintenance.',
            description: 'Instant notification alerts delivered via in-app bell dropdown and real-time push events so you never miss a critical tenancy milestone.',
            icon: Bell,
            color: 'from-pink-500 to-rose-600',
            capabilities: [
                'Instant booking request alerts for property managers',
                'Rent due reminders and payment confirmation notices for tenants',
                'Technician assignment and maintenance status updates',
                'Categorized notification center with unread count tracking'
            ],
            mockup: {
                title: 'Notification Center',
                subtitle: 'High-Priority Tenancy Alerts',
                tag: 'REAL-TIME PUSH',
                stat1: { label: 'New Bookings', value: 'Instant' },
                stat2: { label: 'Rent Reminders', value: 'Automated' },
                stat3: { label: 'Resolution Alerts', value: 'Active' }
            }
        }
    ];

    const currentPillar = pillars[activePillar];
    const PillarIcon = currentPillar.icon;

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 dark:bg-[#060B13] text-slate-900 dark:text-white antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-300">
                <PublicNavbar />

                {/* Hero Header */}
                <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest">
                        <Sparkles className="w-4 h-4" /> Platform Capabilities
                    </div>
                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight max-w-4xl mx-auto">
                        Everything you need to rent, lease, and manage properties.
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
                        Explore the modular architecture powering seamless leasing, automated rent collection, workforce dispatch, and verified rental operations.
                    </p>
                </section>

                {/* Feature Selector Tabs */}
                <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                    <div className="flex flex-wrap items-center justify-center gap-2 p-2 rounded-[2rem] bg-white dark:bg-[#0A101C] border border-slate-200 dark:border-white/10 shadow-xl">
                        {pillars.map((pillar, i) => {
                            const Icon = pillar.icon;
                            const isSelected = activePillar === i;
                            return (
                                <button
                                    key={pillar.id}
                                    onClick={() => setActivePillar(i)}
                                    className={cn(
                                        "px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer",
                                        isSelected
                                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25"
                                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{pillar.title.split(' ')[0]}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Active Pillar Deep Dive Showcase */}
                <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-left">
                    <div className="p-8 sm:p-12 lg:p-16 rounded-[3rem] bg-white dark:bg-[#0A101C] border border-slate-200 dark:border-white/10 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        {/* Left: Content Breakdown */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg", currentPillar.color)}>
                                    <PillarIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block">
                                        {currentPillar.badge}
                                    </span>
                                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">
                                        {currentPillar.title}
                                    </h2>
                                </div>
                            </div>

                            <p className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-300">
                                {currentPillar.tagline}
                            </p>

                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                {currentPillar.description}
                            </p>

                            <div className="space-y-3 pt-2">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Core Capabilities</p>
                                <ul className="space-y-2.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                                    {currentPillar.capabilities.map((cap, cIdx) => (
                                        <li key={cIdx} className="flex items-start gap-2.5">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                            <span>{cap}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Right: UI Mockup Preview */}
                        <div className="lg:col-span-5">
                            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-100 to-slate-200/50 dark:from-slate-900/90 dark:to-slate-950 border border-slate-300 dark:border-white/15 shadow-2xl space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        {currentPillar.mockup.tag}
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-slate-400">Product Preview</span>
                                </div>

                                <div className="space-y-1">
                                    <h4 className="text-xl font-black text-slate-900 dark:text-white">
                                        {currentPillar.mockup.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 font-bold">
                                        {currentPillar.mockup.subtitle}
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 gap-3 pt-2">
                                    <div className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{currentPillar.mockup.stat1.label}</p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{currentPillar.mockup.stat1.value}</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{currentPillar.mockup.stat2.label}</p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{currentPillar.mockup.stat2.value}</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{currentPillar.mockup.stat3.label}</p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{currentPillar.mockup.stat3.value}</p>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs font-bold text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <Lock className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>Authenticated & Encrypted</span>
                                    </div>
                                    <span className="text-emerald-500">TMS 2.0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* All 8 Grid Overview Section */}
                <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-left border-t border-slate-200 dark:border-white/10">
                    <div className="space-y-2 mb-12 max-w-xl">
                        <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Complete Suite</span>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                            Engineered for high reliability.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {pillars.map((p, pIdx) => {
                            const Icon = p.icon;
                            return (
                                <div
                                    key={p.id}
                                    onClick={() => setActivePillar(pIdx)}
                                    className="p-6 rounded-[2rem] bg-white dark:bg-[#0A101C] border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 transition-all shadow-md space-y-3 cursor-pointer group"
                                >
                                    <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md", p.color)}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                                        {p.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 line-clamp-2">
                                        {p.tagline}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center pb-28">
                    <div className="p-10 rounded-[3rem] bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 space-y-6">
                        <h3 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
                            Experience the modern standard of rental management.
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium max-w-xl mx-auto">
                            Start exploring verified rental properties or list your entire portfolio with zero upfront setup fees.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <button
                                onClick={() => navigate('/public/properties')}
                                className="px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all"
                            >
                                Browse Properties →
                            </button>
                            <button
                                onClick={() => navigate('/register')}
                                className="px-8 py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider shadow-lg transition-all"
                            >
                                Get Started Free
                            </button>
                        </div>
                    </div>
                </section>

                <PublicFooter />
            </div>
        </PageTransition>
    );
}

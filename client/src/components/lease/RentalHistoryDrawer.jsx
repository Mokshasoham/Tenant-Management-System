import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    History, X, ChevronRight, ChevronLeft, Building2, Calendar,
    CreditCard, ShieldCheck, FileText, Download, AlertTriangle,
    RotateCcw, Sparkles, MapPin, User, CheckCircle2, Clock,
    Copy, Check, ExternalLink, Bed, Bath, Maximize2, Compass,
    Mail, Phone, Shield
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { resolveMediaUrl } from '../../utils/propertyHelper';
import { leaseService } from '../../services/api';

const STATUS_BADGE_STYLES = {
    expired: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    completed: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30',
    terminated: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    cancelled: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
};

const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return 'N/A';
    }
};

const formatMonthYear = (dateStr) => {
    if (!dateStr) return 'Past Stay';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'Past Stay';
        return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    } catch {
        return 'Past Stay';
    }
};

const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

// Luxury Architectural Fallback Placeholder
function ArchitecturalPlaceholder({ propertyType = 'Residence', className = '' }) {
    return (
        <div className={cn(
            "w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden select-none",
            className
        )}>
            {/* Subtle architectural grid pattern */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2 relative z-10 shadow-inner">
                <Building2 className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/80 relative z-10">
                {propertyType}
            </span>
        </div>
    );
}

export default function RentalHistoryDrawer({ open, onClose }) {
    const [leases, setLeases] = useState([]);
    const [propertiesCount, setPropertiesCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedLease, setSelectedLease] = useState(null);
    const [copiedId, setCopiedId] = useState(false);
    const drawerRef = useRef(null);

    // Fetch history whenever drawer opens
    const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await leaseService.getMyLeaseHistory();
            const data = res?.data || res || [];
            const list = Array.isArray(data) ? data : (data.data || []);
            setLeases(list);
            setPropertiesCount(data.propertiesCount || new Set(list.map(l => l.property?._id || l.property).filter(Boolean)).size);
        } catch (err) {
            console.error('Failed to fetch rental history:', err);
            setError('Could not load your rental journey. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchHistory();
            setSelectedLease(null);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    // Handle ESC key: collapses detail view first, or closes drawer
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!open) return;
            if (e.key === 'Escape') {
                if (selectedLease) {
                    setSelectedLease(null);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, selectedLease, onClose]);

    // Copy Lease ID helper
    const handleCopyLeaseId = (idStr) => {
        if (!idStr) return;
        navigator.clipboard.writeText(idStr);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    // Group leases by Year for Timeline structure
    const groupedByYear = useMemo(() => {
        const groups = {};
        for (const l of leases) {
            const refDate = l.endDate ? new Date(l.endDate) : (l.startDate ? new Date(l.startDate) : new Date(l.createdAt || Date.now()));
            const year = isNaN(refDate.getTime()) ? 'Previous' : refDate.getFullYear().toString();
            if (!groups[year]) groups[year] = [];
            groups[year].push(l);
        }
        return Object.keys(groups)
            .sort((a, b) => Number(b) - Number(a))
            .map(year => ({ year, items: groups[year] }));
    }, [leases]);

    // Most recent historical stay
    const mostRecentLease = leases.length > 0 ? leases[0] : null;

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="rental-journey-title">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/65 backdrop-blur-md transition-opacity"
            />

            {/* Slide-out Drawer Panel */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10 pointer-events-none">
                <motion.div
                    ref={drawerRef}
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="w-screen max-w-xl bg-card border-l border-border/80 shadow-2xl flex flex-col pointer-events-auto overflow-hidden"
                >
                    {/* Top Drawer Header */}
                    <div className="px-6 py-5 border-b border-border/80 flex items-center justify-between bg-gradient-to-r from-card via-muted/30 to-card">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
                                <History className="w-5 h-5 animate-spin-slow" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
                                        Resident Portfolio
                                    </span>
                                </div>
                                <h2 id="rental-journey-title" className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
                                    Rental Journey
                                </h2>
                                <p className="text-xs text-muted-foreground font-medium">
                                    Your previous homes, stays &amp; rental agreements
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close rental journey"
                            className="p-2.5 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-transparent hover:border-border transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Main Scrollable Drawer Content */}
                    <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                        {/* Loading State Skeleton */}
                        {loading && (
                            <div className="space-y-5 animate-pulse">
                                {/* Summary Skeleton */}
                                <div className="p-5 rounded-3xl border border-border bg-muted/20 space-y-3">
                                    <div className="h-4 bg-muted rounded w-1/3" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="h-16 bg-muted/60 rounded-2xl" />
                                        <div className="h-16 bg-muted/60 rounded-2xl" />
                                    </div>
                                </div>
                                {/* Card Skeletons */}
                                {[1, 2].map(n => (
                                    <div key={n} className="rounded-3xl border border-border bg-card overflow-hidden space-y-3">
                                        <div className="h-36 bg-muted/80 w-full" />
                                        <div className="p-4 space-y-3">
                                            <div className="h-4 bg-muted rounded w-3/4" />
                                            <div className="flex justify-between">
                                                <div className="h-4 bg-muted rounded w-1/4" />
                                                <div className="h-4 bg-muted rounded w-1/3" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error State */}
                        {!loading && error && (
                            <div className="p-8 rounded-3xl border border-rose-500/20 bg-rose-500/10 text-center space-y-4 my-8 shadow-xl">
                                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/30">
                                    <AlertTriangle className="w-7 h-7" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-base font-black text-rose-600 dark:text-rose-400">
                                        Unable to load your rental journey
                                    </h3>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                        Something went wrong while retrieving your historical records. Please try again.
                                    </p>
                                </div>
                                <button
                                    onClick={fetchHistory}
                                    className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all inline-flex items-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Try Again</span>
                                </button>
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && !error && leases.length === 0 && (
                            <div className="text-center py-20 px-6 space-y-5 my-auto">
                                <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto shadow-xl shadow-emerald-500/10">
                                    <Compass className="w-10 h-10" />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
                                        Your Journey Starts Here
                                    </span>
                                    <h3 className="text-lg font-black text-foreground">No Completed Stays Yet</h3>
                                    <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                                        Your previous homes and tenancy records will appear here as chapters in your rental journey once you conclude a lease.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ======================================================== */}
                        {/* 1. HERO / JOURNEY SUMMARY SECTION (when on timeline)     */}
                        {/* ======================================================== */}
                        {!loading && !error && leases.length > 0 && !selectedLease && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-5 rounded-3xl border border-border/80 bg-gradient-to-br from-card via-muted/30 to-card shadow-sm space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                            Your Tenancy Portfolio
                                        </span>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black tracking-wider uppercase">
                                        {leases.length} {leases.length === 1 ? 'Chapter' : 'Chapters'} · {propertiesCount} {propertiesCount === 1 ? 'Property' : 'Properties'}
                                    </span>
                                </div>

                                {/* Metric Counters */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-sm">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">
                                            Previous Stays
                                        </span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-2xl font-black text-foreground">{leases.length}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground">homes</span>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-sm">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">
                                            Properties
                                        </span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{propertiesCount}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground">locations</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Most Recent Stay Spotlight */}
                                {mostRecentLease && (
                                    <div
                                        onClick={() => setSelectedLease(mostRecentLease)}
                                        className="p-3.5 rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                                    >
                                        <div className="min-w-0 flex-1 space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                                    Most Recent Stay
                                                </span>
                                            </div>
                                            <p className="text-xs font-black text-foreground truncate">
                                                {mostRecentLease.property?.name || 'Previous Residence'}
                                            </p>
                                            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(mostRecentLease.rentAmount)} / mo
                                                <span className="text-muted-foreground font-normal ml-1">· Ended {formatMonthYear(mostRecentLease.endDate)}</span>
                                            </p>
                                        </div>
                                        <div className="px-2.5 py-1 rounded-xl bg-card border border-border text-[10px] font-black uppercase tracking-wider text-foreground group-hover:text-emerald-500 flex items-center gap-1 shrink-0 transition-colors">
                                            <span>Inspect</span>
                                            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ======================================================== */}
                        {/* 2. DETAIL VIEW FOR SELECTED LEASE                        */}
                        {/* ======================================================== */}
                        {!loading && !error && selectedLease && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                {/* Top Navigation Bar */}
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => setSelectedLease(null)}
                                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 cursor-pointer group"
                                    >
                                        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                                        <span>Back to Timeline</span>
                                    </button>

                                    <a
                                        href={`/api/leases/${selectedLease._id}/generate-pdf`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/80 hover:bg-muted border border-border text-foreground text-[11px] font-black uppercase tracking-wider transition-all"
                                        title="Download Agreement PDF"
                                    >
                                        <Download className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>PDF</span>
                                    </a>
                                </div>

                                {/* Panoramic Property Profile Hero */}
                                <div className="relative rounded-3xl overflow-hidden border border-border/80 bg-muted h-52 sm:h-56 shadow-lg">
                                    {selectedLease.property?.coverImage || selectedLease.property?.images?.[0] ? (
                                        <img
                                            src={resolveMediaUrl(selectedLease.property?.coverImage || selectedLease.property?.images?.[0])}
                                            alt={selectedLease.property?.name || 'Property'}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <ArchitecturalPlaceholder propertyType={selectedLease.property?.type || 'Residence'} />
                                    )}

                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 flex flex-col justify-end p-5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-black/60 text-emerald-400 border border-white/10 backdrop-blur-md">
                                                {selectedLease.property?.type || 'Apartment'}
                                            </span>
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border backdrop-blur-md",
                                                STATUS_BADGE_STYLES[selectedLease.status] || STATUS_BADGE_STYLES.completed
                                            )}>
                                                {selectedLease.status}
                                            </span>
                                        </div>

                                        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                                            {selectedLease.property?.name || 'Property Details'}
                                        </h3>
                                        <p className="text-xs text-white/80 flex items-center gap-1.5 mt-0.5 truncate">
                                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            <span>
                                                {selectedLease.property?.address || ''}
                                                {selectedLease.property?.city ? `, ${selectedLease.property.city}` : ''}
                                                {selectedLease.property?.state ? `, ${selectedLease.property.state}` : ''}
                                            </span>
                                        </p>

                                        {/* Property specs if present */}
                                        {(selectedLease.property?.bedrooms || selectedLease.property?.squareFeet) && (
                                            <div className="flex items-center gap-3 mt-2 text-[11px] font-bold text-white/70">
                                                {selectedLease.property?.bedrooms && (
                                                    <span className="flex items-center gap-1">
                                                        <Bed className="w-3 h-3" /> {selectedLease.property.bedrooms} Beds
                                                    </span>
                                                )}
                                                {selectedLease.property?.bathrooms && (
                                                    <span className="flex items-center gap-1">
                                                        <Bath className="w-3 h-3" /> {selectedLease.property.bathrooms} Baths
                                                    </span>
                                                )}
                                                {selectedLease.property?.squareFeet && (
                                                    <span className="flex items-center gap-1">
                                                        <Maximize2 className="w-3 h-3" /> {selectedLease.property.squareFeet} sq.ft
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Financial Highlights Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">
                                            Monthly Rent
                                        </span>
                                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(selectedLease.rentAmount)}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">
                                            Security Deposit
                                        </span>
                                        <p className="text-xl font-black text-foreground">
                                            {formatCurrency(selectedLease.depositAmount ?? selectedLease.securityDeposit ?? 0)}
                                        </p>
                                    </div>
                                </div>

                                {/* Complete Tenancy Lifecycle Record */}
                                <div className="p-5 rounded-3xl border border-border bg-card space-y-3.5 shadow-sm">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-emerald-500" /> Tenancy Duration &amp; Lifecycle
                                    </h4>
                                    <div className="space-y-2.5 text-xs">
                                        <div className="flex justify-between py-1.5 border-b border-border/60">
                                            <span className="text-muted-foreground font-medium">Start Date:</span>
                                            <span className="font-bold text-foreground">{formatDate(selectedLease.startDate)}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-border/60">
                                            <span className="text-muted-foreground font-medium">End Date:</span>
                                            <span className="font-bold text-foreground">{formatDate(selectedLease.endDate)}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-border/60">
                                            <span className="text-muted-foreground font-medium">Term / Duration:</span>
                                            <span className="font-bold text-foreground">{selectedLease.terms || selectedLease.duration || 'Standard Tenancy'}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-border/60">
                                            <span className="text-muted-foreground font-medium">Lifecycle Status:</span>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border",
                                                STATUS_BADGE_STYLES[selectedLease.status] || STATUS_BADGE_STYLES.completed
                                            )}>
                                                {selectedLease.status}
                                            </span>
                                        </div>
                                        {selectedLease.signedAt && (
                                            <div className="flex justify-between py-1.5 border-b border-border/60">
                                                <span className="text-muted-foreground font-medium">Signed Date:</span>
                                                <span className="font-bold text-foreground">{formatDate(selectedLease.signedAt)}</span>
                                            </div>
                                        )}
                                        {selectedLease.signedBy && (
                                            <div className="flex justify-between py-1.5">
                                                <span className="text-muted-foreground font-medium">Signed By:</span>
                                                <span className="font-bold text-foreground">{selectedLease.signedBy}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Record Identifiers Card */}
                                <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">
                                            Lease Identifier
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyLeaseId(selectedLease.leaseNumber || selectedLease._id)}
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                        >
                                            {copiedId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                            <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
                                        </button>
                                    </div>
                                    <p className="font-mono text-xs font-bold text-foreground break-all select-all">
                                        {selectedLease.leaseNumber || selectedLease._id}
                                    </p>
                                </div>

                                {/* Security Deposit Settlement (Strictly Scoped by Lease ID) */}
                                {selectedLease.settlement && (
                                    <div className="p-5 rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-card to-card space-y-3.5 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Security Deposit Settlement
                                            </h4>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                                {selectedLease.settlement.refundStatus || selectedLease.settlement.status || 'Settled'}
                                            </span>
                                        </div>

                                        <div className="space-y-2.5 text-xs">
                                            <div className="flex justify-between py-1 border-b border-border/60">
                                                <span className="text-muted-foreground font-medium">Deposit Held:</span>
                                                <span className="font-bold text-foreground">
                                                    {formatCurrency(selectedLease.settlement.depositAmount)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-border/60">
                                                <span className="text-muted-foreground font-medium">Refund Amount:</span>
                                                <span className="font-black text-emerald-600 dark:text-emerald-400">
                                                    {formatCurrency(selectedLease.settlement.refundAmount)}
                                                </span>
                                            </div>
                                            {selectedLease.settlement.totalDeduction > 0 && (
                                                <div className="flex justify-between py-1 border-b border-border/60">
                                                    <span className="text-muted-foreground font-medium">Total Deductions:</span>
                                                    <span className="font-bold text-rose-500">
                                                        - {formatCurrency(selectedLease.settlement.totalDeduction)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Deduction Line Items (if present) */}
                                        {Array.isArray(selectedLease.settlement.deductions) && selectedLease.settlement.deductions.length > 0 && (
                                            <div className="pt-2 border-t border-border/60 space-y-1.5">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 block">
                                                    Deductions Itemization:
                                                </span>
                                                {selectedLease.settlement.deductions.map((ded, idx) => (
                                                    <div key={idx} className="flex justify-between text-[11px] text-muted-foreground">
                                                        <span>{ded.reason || ded.description || ded.category || 'Maintenance adjustment'}:</span>
                                                        <span className="font-bold text-rose-500">- {formatCurrency(ded.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Property Manager / Primary Contact Record */}
                                {selectedLease.property?.manager && (
                                    <div className="p-4.5 rounded-2xl border border-border bg-muted/20 flex items-center gap-3.5">
                                        <div className="w-11 h-11 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0 shadow-sm">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-0.5">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
                                                Historical Property Manager
                                            </span>
                                            <p className="text-xs font-black text-foreground truncate">
                                                {selectedLease.property.manager.name || `${selectedLease.property.manager.firstName || ''} ${selectedLease.property.manager.lastName || ''}`.trim() || 'Property Manager'}
                                            </p>
                                            {selectedLease.property.manager.email && (
                                                <p className="text-[11px] text-muted-foreground truncate">
                                                    {selectedLease.property.manager.email}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Full Width Download PDF CTA */}
                                <a
                                    href={`/api/leases/${selectedLease._id}/generate-pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Download Signed Agreement (PDF)</span>
                                </a>
                            </motion.div>
                        )}

                        {/* ======================================================== */}
                        {/* 3. CHRONOLOGICAL TIMELINE CARDS LIST                     */}
                        {/* ======================================================== */}
                        {!loading && !error && !selectedLease && groupedByYear.map(({ year, items }) => (
                            <div key={year} className="space-y-4">
                                {/* Year Divider Badge */}
                                <div className="flex items-center gap-3 select-none">
                                    <span className="px-3.5 py-1 rounded-full bg-muted/80 border border-border text-[11px] font-black text-muted-foreground tracking-wider">
                                        {year}
                                    </span>
                                    <div className="h-px bg-border/80 flex-1" />
                                </div>

                                {/* Timeline Rail with Luxury Real Estate Showcase Cards */}
                                <div className="relative pl-6 border-l-2 border-emerald-500/30 space-y-5 ml-3">
                                    {items.map(lease => {
                                        const prop = lease.property || {};
                                        const rawCover = prop.coverImage || prop.images?.[0] || prop.media?.find(m => m.mediaType === 'image')?.url;
                                        const coverUrl = resolveMediaUrl(rawCover);
                                        const statusStyle = STATUS_BADGE_STYLES[lease.status] || STATUS_BADGE_STYLES.completed;

                                        return (
                                            <div
                                                key={lease._id}
                                                className="relative group"
                                            >
                                                {/* Glowing Timeline Node Dot */}
                                                <div className="absolute -left-[31px] top-5 w-4 h-4 rounded-full bg-card border-2 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-transform duration-200 group-hover:scale-125 flex items-center justify-center">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                </div>

                                                {/* Luxury Real Estate Showcase Card */}
                                                <div
                                                    onClick={() => setSelectedLease(lease)}
                                                    className="rounded-3xl border border-border/80 bg-card/90 dark:bg-slate-900/80 backdrop-blur-md hover:border-emerald-500/40 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 overflow-hidden cursor-pointer group-hover:-translate-y-1"
                                                >
                                                    {/* Wide Aspect Ratio Image Banner */}
                                                    <div className="h-36 sm:h-40 w-full relative overflow-hidden bg-muted">
                                                        {coverUrl ? (
                                                            <img
                                                                src={coverUrl}
                                                                alt={prop.name || 'Property'}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <ArchitecturalPlaceholder propertyType={prop.type || 'Residence'} />
                                                        )}

                                                        {/* Dark Gradient Overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10 flex flex-col justify-between p-3.5 sm:p-4">
                                                            {/* Top Badges Row */}
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-black/60 text-emerald-300 border border-white/15 backdrop-blur-md">
                                                                    {prop.type || 'Apartment'}
                                                                </span>
                                                                <span className={cn(
                                                                    "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border backdrop-blur-md",
                                                                    statusStyle
                                                                )}>
                                                                    {lease.status}
                                                                </span>
                                                            </div>

                                                            {/* Bottom Image Details */}
                                                            <div className="space-y-0.5">
                                                                <h4 className="text-base sm:text-lg font-black text-white tracking-tight drop-shadow-md truncate group-hover:text-emerald-300 transition-colors">
                                                                    {prop.name || 'Rental Agreement'}
                                                                </h4>
                                                                <p className="text-xs text-white/80 flex items-center gap-1.5 truncate">
                                                                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                                                                    <span>
                                                                        {prop.address || ''}{prop.city ? `, ${prop.city}` : ''}
                                                                    </span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Card Body Information */}
                                                    <div className="p-4 sm:p-4.5 space-y-3">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div>
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 block">
                                                                    Monthly Rent
                                                                </span>
                                                                <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                                                                    {formatCurrency(lease.rentAmount)}
                                                                    <span className="text-[10px] font-normal text-muted-foreground ml-1">/ month</span>
                                                                </p>
                                                            </div>

                                                            <div className="text-right">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 block">
                                                                    Tenancy Stay
                                                                </span>
                                                                <p className="text-xs font-bold text-foreground flex items-center justify-end gap-1">
                                                                    <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                                                                    <span>{formatDate(lease.startDate)} → {formatDate(lease.endDate)}</span>
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Footer Bar */}
                                                        <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
                                                            <span className="font-mono text-[10px] font-bold text-muted-foreground/70">
                                                                #{lease.leaseNumber || lease._id.slice(-6).toUpperCase()}
                                                            </span>

                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedLease(lease);
                                                                }}
                                                                className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500 transition-colors"
                                                            >
                                                                <span>View Details</span>
                                                                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

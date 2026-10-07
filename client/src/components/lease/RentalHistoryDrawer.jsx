import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    History, X, ChevronRight, ChevronLeft, Building2, Calendar,
    CreditCard, ShieldCheck, FileText, Download, AlertTriangle,
    RotateCcw, Sparkles, MapPin, User, CheckCircle2, Clock
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { resolveMediaUrl, DEFAULT_PLACEHOLDER_SVG } from '../../utils/propertyHelper';
import { leaseService } from '../../services/api';

const STATUS_BADGE_STYLES = {
    expired: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    completed: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
    terminated: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    cancelled: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
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

const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export default function RentalHistoryDrawer({ open, onClose }) {
    const [leases, setLeases] = useState([]);
    const [propertiesCount, setPropertiesCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedLease, setSelectedLease] = useState(null);
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
            setError('Could not load rental history. Please try again.');
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

    // Handle ESC key to close
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

    // Group leases by Year for Timeline structure
    const groupedByYear = useMemo(() => {
        const groups = {};
        for (const l of leases) {
            const refDate = l.endDate ? new Date(l.endDate) : (l.startDate ? new Date(l.startDate) : new Date(l.createdAt || Date.now()));
            const year = isNaN(refDate.getTime()) ? 'Previous' : refDate.getFullYear().toString();
            if (!groups[year]) groups[year] = [];
            groups[year].push(l);
        }
        // Sort years descending
        return Object.keys(groups)
            .sort((a, b) => Number(b) - Number(a))
            .map(year => ({ year, items: groups[year] }));
    }, [leases]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="rental-history-title">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            />

            {/* Slide-out Drawer Panel */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
                <motion.div
                    ref={drawerRef}
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="w-screen max-w-md sm:max-w-lg bg-card border-l border-border shadow-2xl flex flex-col pointer-events-auto"
                >
                    {/* Top Drawer Header */}
                    <div className="px-6 py-5 border-b border-border/80 flex items-center justify-between bg-muted/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-sm">
                                <History className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 id="rental-history-title" className="text-base font-black text-foreground tracking-tight flex items-center gap-2">
                                    Rental History
                                </h2>
                                <p className="text-xs text-muted-foreground/80 font-medium">
                                    Your previous stays &amp; rental agreements
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close rental history"
                            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-transparent hover:border-border transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Summary Metric Ribbon */}
                    {!loading && !error && leases.length > 0 && !selectedLease && (
                        <div className="px-6 py-3 bg-muted/40 border-b border-border flex items-center justify-between text-xs font-bold text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-black text-[10px] uppercase tracking-wider">
                                    {leases.length} Previous {leases.length === 1 ? 'Lease' : 'Leases'}
                                </span>
                                {propertiesCount > 0 && (
                                    <span className="text-[11px] font-semibold text-muted-foreground/80">
                                        · {propertiesCount} {propertiesCount === 1 ? 'Property' : 'Properties'}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-black">
                                Chronological
                            </span>
                        </div>
                    )}

                    {/* Main Scrollable Drawer Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Loading State Skeleton */}
                        {loading && (
                            <div className="space-y-4">
                                {[1, 2, 3].map(n => (
                                    <div key={n} className="p-4.5 rounded-2xl border border-border bg-muted/20 animate-pulse space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
                                            <div className="space-y-1.5 flex-1">
                                                <div className="w-3/4 h-3.5 bg-muted rounded" />
                                                <div className="w-1/2 h-2.5 bg-muted rounded" />
                                            </div>
                                        </div>
                                        <div className="w-full h-8 bg-muted/60 rounded-xl" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error State */}
                        {!loading && error && (
                            <div className="p-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-center space-y-3 my-6">
                                <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                                <h3 className="text-sm font-black text-rose-600 dark:text-rose-400">
                                    {error}
                                </h3>
                                <button
                                    onClick={fetchHistory}
                                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Try Again</span>
                                </button>
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && !error && leases.length === 0 && (
                            <div className="text-center py-16 px-4 space-y-4 my-auto">
                                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto shadow-sm">
                                    <History className="w-8 h-8 opacity-80" />
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-base font-black text-foreground">No Past Leases Yet</h3>
                                    <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                                        Your previous rental agreements will appear here once you complete or transition out of a tenancy.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Detail View for Selected Historical Lease */}
                        {!loading && !error && selectedLease && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <button
                                    onClick={() => setSelectedLease(null)}
                                    className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer group"
                                >
                                    <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                                    <span>Back to Timeline</span>
                                </button>

                                {/* Property Cover Banner */}
                                <div className="relative rounded-2xl overflow-hidden border border-border bg-muted h-44 shadow-md">
                                    <img
                                        src={resolveMediaUrl(selectedLease.property?.coverImage || selectedLease.property?.images?.[0]) || DEFAULT_PLACEHOLDER_SVG}
                                        alt={selectedLease.property?.name || 'Property'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.currentTarget.src = DEFAULT_PLACEHOLDER_SVG; }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
                                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-black/60 text-emerald-400 w-fit mb-1 border border-white/10">
                                            {selectedLease.property?.type || 'Rental Home'}
                                        </span>
                                        <h3 className="text-lg font-black text-white truncate">
                                            {selectedLease.property?.name || 'Property Details'}
                                        </h3>
                                        <p className="text-xs text-white/80 truncate">
                                            {selectedLease.property?.address}, {selectedLease.property?.city || 'India'}
                                        </p>
                                    </div>
                                </div>

                                {/* Lease Key Metrics Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3.5 rounded-2xl border border-border bg-muted/30 space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">Monthly Rent</span>
                                        <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(selectedLease.rentAmount)}
                                        </p>
                                    </div>
                                    <div className="p-3.5 rounded-2xl border border-border bg-muted/30 space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">Security Deposit</span>
                                        <p className="text-base font-black text-foreground">
                                            {formatCurrency(selectedLease.depositAmount ?? selectedLease.securityDeposit ?? 0)}
                                        </p>
                                    </div>
                                </div>

                                {/* Tenancy Lifecycle Info */}
                                <div className="p-4.5 rounded-2xl border border-border bg-card space-y-3 shadow-sm">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Tenancy Duration
                                    </h4>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between py-1 border-b border-border/60">
                                            <span className="text-muted-foreground">Start Date:</span>
                                            <span className="font-bold text-foreground">{formatDate(selectedLease.startDate)}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-border/60">
                                            <span className="text-muted-foreground">End Date:</span>
                                            <span className="font-bold text-foreground">{formatDate(selectedLease.endDate)}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-border/60">
                                            <span className="text-muted-foreground">Term / Duration:</span>
                                            <span className="font-bold text-foreground">{selectedLease.terms || selectedLease.duration || '12 Months'}</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                            <span className="text-muted-foreground">Lifecycle Status:</span>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border",
                                                STATUS_BADGE_STYLES[selectedLease.status] || STATUS_BADGE_STYLES.completed
                                            )}>
                                                {selectedLease.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Deposit Settlement Breakdown (if present) */}
                                {selectedLease.settlement && (
                                    <div className="p-4.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                            <ShieldCheck className="w-3.5 h-3.5" /> Deposit Settlement
                                        </h4>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Refund Status:</span>
                                                <span className="font-black capitalize text-emerald-600 dark:text-emerald-400">
                                                    {selectedLease.settlement.refundStatus || 'Processed'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Refund Amount:</span>
                                                <span className="font-black text-emerald-600 dark:text-emerald-400">
                                                    {formatCurrency(selectedLease.settlement.refundAmount)}
                                                </span>
                                            </div>
                                            {selectedLease.settlement.totalDeduction > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Deductions:</span>
                                                    <span className="font-bold text-rose-500">
                                                        - {formatCurrency(selectedLease.settlement.totalDeduction)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Manager Information (Historical Context) */}
                                {selectedLease.property?.manager && (
                                    <div className="p-4 rounded-2xl border border-border bg-muted/20 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">Property Manager</span>
                                            <p className="text-xs font-black text-foreground truncate">
                                                {selectedLease.property.manager.name || `${selectedLease.property.manager.firstName || ''} ${selectedLease.property.manager.lastName || ''}`.trim() || 'Property Manager'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Secure PDF Download Link */}
                                <a
                                    href={`/api/leases/${selectedLease._id}/generate-pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-3 px-4 rounded-xl bg-muted hover:bg-muted/80 border border-border text-foreground text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    <Download className="w-4 h-4 text-emerald-500" />
                                    <span>Download Signed Agreement (PDF)</span>
                                </a>
                            </motion.div>
                        )}

                        {/* Chronological Timeline Cards List */}
                        {!loading && !error && !selectedLease && groupedByYear.map(({ year, items }) => (
                            <div key={year} className="space-y-4">
                                {/* Year Divider Badge */}
                                <div className="flex items-center gap-3 select-none">
                                    <span className="px-3 py-1 rounded-full bg-muted/80 border border-border text-[11px] font-black text-muted-foreground tracking-wider">
                                        {year}
                                    </span>
                                    <div className="h-px bg-border flex-1" />
                                </div>

                                {/* Timeline Rail with Lease Cards */}
                                <div className="relative pl-5 border-l-2 border-emerald-500/20 space-y-4 ml-3">
                                    {items.map(lease => {
                                        const prop = lease.property || {};
                                        const rawCover = prop.coverImage || prop.images?.[0] || prop.media?.find(m => m.mediaType === 'image')?.url;
                                        const coverUrl = resolveMediaUrl(rawCover) || DEFAULT_PLACEHOLDER_SVG;
                                        const statusStyle = STATUS_BADGE_STYLES[lease.status] || STATUS_BADGE_STYLES.completed;

                                        return (
                                            <div
                                                key={lease._id}
                                                className="relative group"
                                            >
                                                {/* Timeline Node Dot */}
                                                <div className="absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full bg-card border-2 border-emerald-500 shadow-sm transition-transform group-hover:scale-125" />

                                                {/* Card Container */}
                                                <div
                                                    onClick={() => setSelectedLease(lease)}
                                                    className="p-4 sm:p-4.5 rounded-2xl border border-border bg-card/80 hover:bg-card hover:border-emerald-500/40 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer space-y-3 group-hover:-translate-y-0.5"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        {/* Thumbnail */}
                                                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-border/80 bg-muted shrink-0 shadow-sm">
                                                            <img
                                                                src={coverUrl}
                                                                alt={prop.name || 'Property'}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                onError={(e) => { e.currentTarget.src = DEFAULT_PLACEHOLDER_SVG; }}
                                                            />
                                                        </div>

                                                        {/* Details */}
                                                        <div className="min-w-0 flex-1 space-y-0.5">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <h4 className="text-sm font-black text-foreground truncate group-hover:text-emerald-500 transition-colors">
                                                                    {prop.name || 'Rental Agreement'}
                                                                </h4>
                                                                <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0", statusStyle)}>
                                                                    {lease.status}
                                                                </span>
                                                            </div>

                                                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                                                {formatCurrency(lease.rentAmount)} <span className="text-[10px] font-medium text-muted-foreground">/ month</span>
                                                            </p>

                                                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 font-medium pt-0.5">
                                                                <Calendar className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                                                                <span className="truncate">
                                                                    {formatDate(lease.startDate)} — {formatDate(lease.endDate)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Footer Info & Action */}
                                                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                                                        <span className="text-[10px] font-bold text-muted-foreground/60">
                                                            Lease #{lease.leaseNumber || lease._id.slice(-6).toUpperCase()}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedLease(lease);
                                                            }}
                                                            className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
                                                        >
                                                            <span>View Details</span>
                                                            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                                                        </button>
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

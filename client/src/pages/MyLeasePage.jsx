import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { leaseService, paymentService } from '../services/api';
import {
    Home, Calendar, CreditCard, FileText, CheckCircle2, Clock,
    AlertTriangle, Building2, Wifi, Car, Droplets, Zap, Wind,
    Wallet, ArrowRight, RefreshCw, Info, Shield, Hash, Phone,
    Mail, MapPin, Bed, Bath, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '../utils/cn';

const AMENITY_ICON = {
    wifi: Wifi, parking: Car, water: Droplets,
    electricity: Zap, ac: Wind, default: Home,
};

const STATUS_CONFIG = {
    active: { label: 'Active', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25', dot: 'bg-emerald-500 animate-pulse dark:bg-emerald-400' },
    pending: { label: 'Pending', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25', dot: 'bg-amber-500 animate-pulse dark:bg-amber-400' },
    expired: { label: 'Expired', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/25', dot: 'bg-rose-500 dark:bg-rose-400' },
    terminated: { label: 'Terminated', color: 'text-muted-foreground/40', bg: 'bg-muted border-border', dot: 'bg-muted-foreground/20' },
};

const PAY_STATUS = {
    paid: { label: 'Paid', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    pending: { label: 'Due', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    overdue: { label: 'Overdue', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    partially_paid: { label: 'Partial', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
};

function LeaseProgressBar({ startDate, endDate }) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const pct = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
    const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                <span>{new Date(startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="text-emerald-600 dark:text-emerald-400">{pct}% complete · {daysLeft} days left</span>
                <span>{new Date(endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 relative"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.4, duration: 1.4, ease: 'easeOut' }}
                >
                    <div className="absolute right-0 top-0 h-full w-4 bg-white/20 rounded-full blur-sm" />
                </motion.div>
            </div>
        </div>
    );
}

export default function MyLeasePage() {
    const navigate = useNavigate();
    const [lease, setLease] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAllPayments, setShowAllPayments] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [leaseRes, payRes] = await Promise.allSettled([
                    leaseService.getMyLease(),
                    paymentService.getMyPayments(),
                ]);
                if (leaseRes.status === 'fulfilled') setLease(leaseRes.value?.data?.data || leaseRes.value?.data || null);
                if (payRes.status === 'fulfilled') setPayments(payRes.value?.data?.data || payRes.value?.data || []);
            } catch (e) { console.error('Error fetching lease data:', e); }
            setLoading(false);
        })();
    }, []);

    const statusCfg = STATUS_CONFIG[lease?.status] || STATUS_CONFIG.pending;
    const paidPayments = payments.filter(p => p.status === 'paid');
    const pendingPay = payments.find(p => ['pending', 'overdue'].includes(p.status));
    const totalPaid = paidPayments.reduce((s, p) => s + (p.amountPaid || p.amount || 0), 0);
    const visiblePay = showAllPayments ? payments : payments.slice(0, 6);

    return (
        <div className="space-y-5 pb-10">
            {/* Page Header */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-6 rounded-full bg-emerald-500" />
                        <p className="text-[10px] font-black uppercase tracking-[.25em] text-emerald-600 dark:text-emerald-400">My Tenancy</p>
                    </div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">Lease &amp; Rent 🏠</h1>
                    <p className="text-muted-foreground/40 text-sm mt-0.5">All your tenancy details in one place</p>
                </div>
                {pendingPay && (
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => navigate('/pay-now')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20">
                        <Wallet className="w-4 h-4" /> Pay Rent Now
                    </motion.button>
                )}
            </motion.div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center h-52">
                    <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                </div>
            )}

            {/* No Lease */}
            {!loading && !lease && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center gap-6 py-24 rounded-[2rem] border-2 border-dashed border-border bg-card/50">
                    <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center">
                        <Home className="w-10 h-10 text-muted-foreground/20" />
                    </div>
                    <div className="text-center">
                        <p className="font-black text-foreground text-xl">No Active Lease Found</p>
                        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">Your property manager hasn't set up your lease yet or your email doesn't match.</p>
                    </div>
                    <button onClick={() => navigate('/messages')}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-black hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                        <Mail className="w-4 h-4" /> Message Manager
                    </button>
                </motion.div>
            )}

            {!loading && lease && (
                <>
                    {/* ── Lease Hero Card ── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="relative overflow-hidden rounded-[2.5rem] border border-emerald-500/20 p-6 md:p-10 shadow-2xl"
                        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}>

                        {/* Orbs */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

                        <div className="relative z-10">
                            {/* Top row */}
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className={cn('flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest backdrop-blur-md', statusCfg.bg, statusCfg.color)}>
                                            <span className={cn('w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]', statusCfg.dot)} />
                                            {statusCfg.label}
                                        </span>
                                        {lease.leaseNumber && (
                                            <span className="flex items-center gap-1 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] bg-white/5 px-3 py-1.5 rounded-full">
                                                <Hash className="w-3 h-3" />{lease.leaseNumber}
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-4xl font-black text-white tracking-tight leading-tight">{lease.property?.name || 'Your Property'}</h2>
                                    <p className="flex items-center gap-2 text-emerald-100/60 text-sm mt-3 font-medium">
                                        <div className="p-1.5 rounded-lg bg-white/10"><MapPin className="w-3.5 h-3.5" /></div> {lease.property?.address || '—'}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0 flex flex-col items-end">
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Monthly Rent</p>
                                    <p className="text-6xl font-black text-white drop-shadow-2xl">₹{(lease.rentAmount || 0).toLocaleString('en-IN')}</p>
                                    {lease.depositAmount > 0 && (
                                        <div className="mt-3 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Deposit: ₹{lease.depositAmount.toLocaleString('en-IN')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="mb-6">
                                <LeaseProgressBar startDate={lease.startDate} endDate={lease.endDate} />
                            </div>

                            {/* Key dates grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: 'Start Date', value: new Date(lease.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), icon: Calendar },
                                    { label: 'End Date', value: new Date(lease.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), icon: Calendar },
                                    { label: 'Frequency', value: 'Monthly', icon: RefreshCw },
                                    { label: 'Protection', value: 'Lease Guard', icon: Shield },
                                ].map((item) => {
                                    return (
                                        <div key={item.label} className="p-4 rounded-2xl bg-muted border border-border hover:bg-muted/80 transition-all group">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transform group-hover:scale-110 transition-transform">
                                                    <item.icon className="w-3.5 h-3.5" />
                                                </div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">{item.label}</p>
                                            </div>
                                            <p className="text-sm font-black text-foreground">{item.value}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Property Details + Utilities ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Unit details */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm font-black text-foreground uppercase tracking-wider">Unit Details</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: 'Property Type', value: lease.property?.type || '—' },
                                    { label: 'Bedrooms', value: lease.property?.bedrooms != null ? `${lease.property.bedrooms} Bed` : '—' },
                                    { label: 'Bathrooms', value: lease.property?.bathrooms != null ? `${lease.property.bathrooms} Bath` : '—' },
                                    { label: 'Floor Level', value: lease.property?.floor ? `${lease.property.floor} Floor` : 'Main Level' },
                                ].map(r => (
                                    <div key={r.label} className="flex items-center justify-between py-3.5 border-b border-border/50 last:border-0">
                                        <span className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">{r.label}</span>
                                        <span className="text-sm font-black text-foreground capitalize">{r.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Amenities */}
                            {lease.property?.amenities?.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-border">
                                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4 text-center">Included Amenities</p>
                                    <div className="flex flex-wrap gap-2.5">
                                        {lease.property.amenities.map(a => {
                                            const Icon = AMENITY_ICON[a.toLowerCase()] || AMENITY_ICON.default;
                                            return (
                                                <span key={a} className="flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-xs font-black text-emerald-700 dark:text-emerald-400 capitalize hover:bg-emerald-500/10 transition-colors">
                                                    <Icon className="w-3.5 h-3.5" /> {a}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* Utilities included */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                            className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-black text-foreground uppercase tracking-wider">Utilities &amp; Terms</p>
                            </div>

                            {/* Utilities object */}
                            {lease.utilities && Object.keys(lease.utilities).length > 0 ? (
                                <div className="space-y-3.5 mb-6">
                                    {Object.entries(lease.utilities).map(([key, val]) => (
                                        <div key={key} className="flex items-center justify-between">
                                            <span className="text-[10px] text-muted-foreground/40 font-black capitalize uppercase tracking-widest">{key}</span>
                                            <span className={cn('text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm',
                                                val ? 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/10' : 'text-muted-foreground/30 bg-muted border border-border')}>
                                                {val ? 'Included' : 'Not included'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground/40 mb-6 font-medium italic">No utility details recorded</p>
                            )}

                            {/* Terms */}
                            {lease.terms && (
                                <div className="pt-6 border-t border-border">
                                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-3">Lease Terms</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">{lease.terms}</p>
                                </div>
                            )}

                            {/* Payment summary */}
                            <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center hover:bg-emerald-500/10 transition-all group">
                                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">{paidPayments.length}</p>
                                    <p className="text-[9px] font-black text-emerald-600/50 dark:text-emerald-400/50 uppercase tracking-[0.2em] mt-2">Payments Made</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-center hover:bg-blue-500/10 transition-all group">
                                    <p className="text-3xl font-black text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">₹{Math.round(totalPaid / 1000)}K</p>
                                    <p className="text-[9px] font-black text-blue-600/50 dark:text-blue-400/50 uppercase tracking-[0.2em] mt-2">Total Paid</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* ── Tenant Details ── */}
                    {lease.tenant && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                            className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2.5 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-black text-foreground uppercase tracking-wider">Tenant on Record</p>
                            </div>
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-black flex-shrink-0 shadow-lg shadow-emerald-500/20">
                                    {lease.tenant.firstName?.[0]}{lease.tenant.lastName?.[0]}
                                </div>
                                <div className="flex-1">
                                    <p className="text-lg font-black text-foreground">{lease.tenant.firstName} {lease.tenant.lastName}</p>
                                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                                        {lease.tenant.email && (
                                            <span className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                                <div className="p-1 rounded bg-muted"><Mail className="w-3.5 h-3.5" /></div> {lease.tenant.email}
                                            </span>
                                        )}
                                        {lease.tenant.phone && (
                                            <span className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                                <div className="p-1 rounded bg-muted"><Phone className="w-3.5 h-3.5" /></div> {lease.tenant.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Payment History ── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                        className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-2">
                                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-black text-foreground uppercase tracking-wider">Payment Schedule</p>
                            </div>
                            <button onClick={() => navigate('/payments')}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary-600 dark:text-primary-400 text-xs font-black uppercase tracking-widest hover:bg-primary/20 transition-all">
                                View Full <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {payments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground/40">
                                <CreditCard className="w-10 h-10" />
                                <p className="text-sm font-bold">No payment records yet</p>
                            </div>
                        ) : (
                            <>
                                {/* Table header */}
                                <div className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b border-border bg-muted/50 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                                    <div className="col-span-4">Billing Period</div>
                                    <div className="col-span-2">Amount</div>
                                    <div className="col-span-3">Due Date</div>
                                    <div className="col-span-2">Status</div>
                                    <div className="col-span-1"></div>
                                </div>

                                <div className="divide-y divide-border/50">
                                    <AnimatePresence initial={false}>
                                        {visiblePay.map((p, i) => {
                                            const sc = PAY_STATUS[p.status] || PAY_STATUS.pending;
                                            const Icon = p.status === 'paid' ? CheckCircle2 : p.status === 'overdue' ? AlertTriangle : Clock;
                                            const owed = (p.amount || 0) - (p.amountPaid || 0);
                                            return (
                                                <motion.div key={p._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.04 }}
                                                    className="grid grid-cols-12 gap-4 items-center px-6 py-4.5 hover:bg-muted/30 transition-colors group">
                                                    <div className="col-span-4">
                                                        <p className="text-sm font-black text-foreground">
                                                            {new Date(p.dueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                        </p>
                                                        {p.paymentDate && (
                                                            <p className="text-[10px] font-black text-emerald-600/50 dark:text-emerald-400/50 uppercase tracking-widest mt-0.5">Paid {new Date(p.paymentDate).toLocaleDateString()}</p>
                                                        )}
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="text-sm font-black text-foreground">₹{(p.amount || 0).toLocaleString('en-IN')}</p>
                                                        {p.amountPaid > 0 && p.status !== 'paid' && (
                                                            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5">Paid: ₹{p.amountPaid.toLocaleString('en-IN')}</p>
                                                        )}
                                                    </div>
                                                    <div className="col-span-3">
                                                        <p className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-widest">
                                                            {new Date(p.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-black', sc.bg, sc.color)}>
                                                            <Icon className="w-2.5 h-2.5" /> {sc.label}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-1 text-right">
                                                        {owed > 0 && p.status !== 'paid' && (
                                                            <button onClick={() => navigate('/payments')}
                                                                className="opacity-0 group-hover:opacity-100 text-[9px] font-black px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all">
                                                                Pay
                                                            </button>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>

                                {payments.length > 6 && (
                                    <div className="px-6 py-4 border-t border-border bg-muted/20">
                                        <button onClick={() => setShowAllPayments(v => !v)}
                                            className="w-full flex items-center justify-center gap-2 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 hover:text-foreground transition-colors">
                                            {showAllPayments ? <><ChevronUp className="w-4 h-4" /> Show less</> : <><ChevronDown className="w-4 h-4" /> Show all {payments.length} payments</>}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>

                    {/* ── Quick Actions ── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                            { label: 'Pay Rent', sub: pendingPay ? `₹${(pendingPay.amount || 0).toLocaleString('en-IN')} due` : 'All clear ✓', icon: Wallet, color: 'from-emerald-600 to-teal-600', path: '/pay-now' },
                            { label: 'Report Issue', sub: 'Submit maintenance', icon: Home, color: 'from-amber-600 to-orange-600', path: '/maintenance' },
                            { label: 'Message Manager', sub: 'Ask a question', icon: Mail, color: 'from-indigo-600 to-violet-600', path: '/messages' },
                        ].map(a => {
                            const Icon = a.icon;
                            return (
                                <motion.button key={a.label} whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate(a.path)}
                                    className={cn('flex items-center gap-4 p-5 rounded-[2rem] bg-gradient-to-r text-white shadow-xl text-left transition-all', a.color)}>
                                    <div className="p-3.5 rounded-2xl bg-white/10 flex-shrink-0 backdrop-blur-md border border-white/10">
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-black text-sm uppercase tracking-wider">{a.label}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">{a.sub}</p>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </motion.div>
                </>
            )}
        </div>
    );
}

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
    active: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25', dot: 'bg-emerald-400 animate-pulse' },
    pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25', dot: 'bg-amber-400 animate-pulse' },
    expired: { label: 'Expired', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/25', dot: 'bg-rose-400' },
    terminated: { label: 'Terminated', color: 'text-white/30', bg: 'bg-white/5 border-white/10', dot: 'bg-white/20' },
};

const PAY_STATUS = {
    paid: { label: 'Paid', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    pending: { label: 'Due', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    overdue: { label: 'Overdue', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    partially_paid: { label: 'Partial', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
};

function LeaseProgressBar({ startDate, endDate }) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const pct = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
    const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-white/40">
                <span>{new Date(startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="text-emerald-400">{pct}% complete · {daysLeft} days left</span>
                <span>{new Date(endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
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
                if (leaseRes.status === 'fulfilled') setLease(leaseRes.value?.data || null);
                if (payRes.status === 'fulfilled') setPayments(payRes.value?.data || []);
            } catch (_) { }
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
                        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500" />
                        <p className="text-[10px] font-black uppercase tracking-[.25em] text-emerald-400">My Tenancy</p>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Lease &amp; Rent 🏠</h1>
                    <p className="text-white/30 text-sm mt-0.5">All your tenancy details in one place</p>
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
                    <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                </div>
            )}

            {/* No Lease */}
            {!loading && !lease && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center gap-4 py-20 rounded-2xl border border-dashed border-white/10">
                    <Home className="w-14 h-14 text-white/10" />
                    <div className="text-center">
                        <p className="font-black text-white/40 text-lg">No Active Lease Found</p>
                        <p className="text-sm text-white/20 mt-1">Your property manager hasn't set up your lease yet.</p>
                        <p className="text-xs text-white/15 mt-1">Make sure your account email matches the email your manager used.</p>
                    </div>
                    <button onClick={() => navigate('/messages')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/40 text-sm font-bold hover:bg-white/5 transition-colors">
                        <Mail className="w-4 h-4" /> Message Manager
                    </button>
                </motion.div>
            )}

            {!loading && lease && (
                <>
                    {/* ── Lease Hero Card ── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="relative overflow-hidden rounded-3xl border border-emerald-500/20 p-6 md:p-8"
                        style={{ background: 'linear-gradient(135deg, #0a2e1f 0%, #0d3d2a 40%, #0f4d35 100%)' }}>

                        {/* Orbs */}
                        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

                        <div className="relative z-10">
                            {/* Top row */}
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black', statusCfg.bg, statusCfg.color)}>
                                            <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
                                            {statusCfg.label} Lease
                                        </span>
                                        {lease.leaseNumber && (
                                            <span className="flex items-center gap-1 text-[10px] font-black text-white/20 uppercase tracking-wider">
                                                <Hash className="w-3 h-3" />{lease.leaseNumber}
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-3xl font-black text-white">{lease.property?.name || 'Your Property'}</h2>
                                    <p className="flex items-center gap-1.5 text-emerald-200/50 text-sm mt-1 font-medium">
                                        <MapPin className="w-3.5 h-3.5" /> {lease.property?.address || '—'}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-0.5">Monthly Rent</p>
                                    <p className="text-5xl font-black text-emerald-400">₹{(lease.rentAmount || 0).toLocaleString('en-IN')}</p>
                                    {lease.depositAmount > 0 && (
                                        <p className="text-xs text-white/25 mt-1">Security deposit: ₹{lease.depositAmount.toLocaleString('en-IN')}</p>
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
                                    { label: 'Lease Start', value: new Date(lease.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), icon: Calendar },
                                    { label: 'Lease End', value: new Date(lease.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), icon: Calendar },
                                    { label: 'Monthly Rent', value: `₹${(lease.rentAmount || 0).toLocaleString('en-IN')}`, icon: CreditCard },
                                    { label: 'Status', value: statusCfg.label, icon: Shield },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={item.label} className="p-3 rounded-xl bg-white/5 border border-white/8">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <Icon className="w-3.5 h-3.5 text-emerald-400/60" />
                                                <p className="text-[9px] font-black uppercase tracking-widest text-white/25">{item.label}</p>
                                            </div>
                                            <p className="text-sm font-black text-white">{item.value}</p>
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
                            className="rounded-2xl border border-white/5 bg-white/3 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 rounded-xl bg-blue-500/15">
                                    <Building2 className="w-4 h-4 text-blue-400" />
                                </div>
                                <p className="text-sm font-black text-white">Unit Details</p>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: 'Property Type', value: lease.property?.type || '—' },
                                    { label: 'Bedrooms', value: lease.property?.bedrooms != null ? `${lease.property.bedrooms} bed` : '—' },
                                    { label: 'Bathrooms', value: lease.property?.bathrooms != null ? `${lease.property.bathrooms} bath` : '—' },
                                    { label: 'Address', value: lease.property?.address || '—' },
                                ].map(r => (
                                    <div key={r.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                        <span className="text-xs text-white/30 font-bold">{r.label}</span>
                                        <span className="text-sm font-bold text-white capitalize">{r.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Amenities */}
                            {lease.property?.amenities?.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-2.5">Included Amenities</p>
                                    <div className="flex flex-wrap gap-2">
                                        {lease.property.amenities.map(a => {
                                            const Icon = AMENITY_ICON[a.toLowerCase()] || AMENITY_ICON.default;
                                            return (
                                                <span key={a} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-300 capitalize">
                                                    <Icon className="w-3 h-3" /> {a}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* Utilities included */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                            className="rounded-2xl border border-white/5 bg-white/3 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 rounded-xl bg-amber-500/15">
                                    <Zap className="w-4 h-4 text-amber-400" />
                                </div>
                                <p className="text-sm font-black text-white">Utilities &amp; Terms</p>
                            </div>

                            {/* Utilities object */}
                            {lease.utilities && Object.keys(lease.utilities).length > 0 ? (
                                <div className="space-y-2.5 mb-4">
                                    {Object.entries(lease.utilities).map(([key, val]) => (
                                        <div key={key} className="flex items-center justify-between">
                                            <span className="text-xs text-white/30 font-bold capitalize">{key}</span>
                                            <span className={cn('text-xs font-black px-2 py-0.5 rounded-full',
                                                val ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/20 bg-white/5')}>
                                                {val ? '✓ Included' : '✗ Not included'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-white/20 mb-4">No utility details recorded</p>
                            )}

                            {/* Terms */}
                            {lease.terms && (
                                <div className="pt-4 border-t border-white/5">
                                    <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-2">Lease Terms</p>
                                    <p className="text-sm text-white/50 leading-relaxed">{lease.terms}</p>
                                </div>
                            )}

                            {/* Payment summary */}
                            <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                    <p className="text-2xl font-black text-emerald-400">{paidPayments.length}</p>
                                    <p className="text-[9px] font-black text-emerald-300/50 uppercase tracking-wider mt-0.5">Payments Made</p>
                                </div>
                                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                                    <p className="text-2xl font-black text-blue-400">₹{Math.round(totalPaid / 1000)}K</p>
                                    <p className="text-[9px] font-black text-blue-300/50 uppercase tracking-wider mt-0.5">Total Paid</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* ── Tenant Details ── */}
                    {lease.tenant && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                            className="rounded-2xl border border-white/5 bg-white/3 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 rounded-xl bg-violet-500/15">
                                    <Shield className="w-4 h-4 text-violet-400" />
                                </div>
                                <p className="text-sm font-black text-white">Tenant on Record</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg font-black flex-shrink-0">
                                    {lease.tenant.firstName?.[0]}{lease.tenant.lastName?.[0]}
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-white">{lease.tenant.firstName} {lease.tenant.lastName}</p>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                        {lease.tenant.email && (
                                            <span className="flex items-center gap-1 text-xs text-white/30">
                                                <Mail className="w-3 h-3" /> {lease.tenant.email}
                                            </span>
                                        )}
                                        {lease.tenant.phone && (
                                            <span className="flex items-center gap-1 text-xs text-white/30">
                                                <Phone className="w-3 h-3" /> {lease.tenant.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Payment History ── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                        className="rounded-2xl border border-white/5 bg-white/3 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-emerald-500/15">
                                    <FileText className="w-4 h-4 text-emerald-400" />
                                </div>
                                <p className="text-sm font-black text-white">Payment Schedule</p>
                            </div>
                            <button onClick={() => navigate('/payments')}
                                className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                                Manage <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {payments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 gap-3 text-white/20">
                                <CreditCard className="w-10 h-10" />
                                <p className="text-sm font-bold">No payment records yet</p>
                            </div>
                        ) : (
                            <>
                                {/* Table header */}
                                <div className="grid grid-cols-12 gap-3 px-5 py-2.5 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-white/20">
                                    <div className="col-span-4">Period</div>
                                    <div className="col-span-2">Amount</div>
                                    <div className="col-span-3">Due Date</div>
                                    <div className="col-span-2">Status</div>
                                    <div className="col-span-1"></div>
                                </div>

                                <div className="divide-y divide-white/4">
                                    <AnimatePresence initial={false}>
                                        {visiblePay.map((p, i) => {
                                            const sc = PAY_STATUS[p.status] || PAY_STATUS.pending;
                                            const Icon = p.status === 'paid' ? CheckCircle2 : p.status === 'overdue' ? AlertTriangle : Clock;
                                            const owed = (p.amount || 0) - (p.amountPaid || 0);
                                            return (
                                                <motion.div key={p._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.04 }}
                                                    className="grid grid-cols-12 gap-3 items-center px-5 py-3.5 hover:bg-white/3 transition-colors group">
                                                    <div className="col-span-4">
                                                        <p className="text-sm font-bold text-white/80">
                                                            {new Date(p.dueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                        </p>
                                                        {p.paymentDate && (
                                                            <p className="text-[10px] text-white/25">Paid {new Date(p.paymentDate).toLocaleDateString()}</p>
                                                        )}
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="text-sm font-black text-white">₹{(p.amount || 0).toLocaleString('en-IN')}</p>
                                                        {p.amountPaid > 0 && p.status !== 'paid' && (
                                                            <p className="text-[10px] text-emerald-400">Paid: ₹{p.amountPaid.toLocaleString('en-IN')}</p>
                                                        )}
                                                    </div>
                                                    <div className="col-span-3">
                                                        <p className="text-xs text-white/40">
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
                                    <div className="px-5 py-3 border-t border-white/5">
                                        <button onClick={() => setShowAllPayments(v => !v)}
                                            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-white/30 hover:text-white/60 transition-colors">
                                            {showAllPayments ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show all {payments.length} payments</>}
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
                                <motion.button key={a.label} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                    onClick={() => navigate(a.path)}
                                    className={cn('flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r text-white shadow-lg text-left', a.color)}>
                                    <div className="p-2.5 rounded-xl bg-white/15 flex-shrink-0">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-black text-sm">{a.label}</p>
                                        <p className="text-[10px] opacity-70">{a.sub}</p>
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

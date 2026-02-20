import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { leaseService, paymentService, maintenanceService, notificationService, bookingService } from '../../services/api';
import {
    Building2, CreditCard, Wrench, MessageSquare, CheckCircle2,
    Calendar, Clock, AlertTriangle, FileText, Wallet, Bell,
    Home, Star, Sparkles, ArrowRight, XCircle, RefreshCw, Plus
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { CalendarWidget, WorldClockWidget } from '../../components/dashboard/Widgets';

const getStatusStyle = (status) => ({
    active: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    expired: 'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
    pending: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
})[status] || 'text-muted-foreground bg-muted border-border';
const STATUS_COLOR = {
    paid: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400',
    pending: 'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400',
    overdue: 'text-rose-600 bg-rose-500/10 border-rose-500/20 dark:text-rose-400',
    partial: 'text-blue-600 bg-blue-500/10 border-blue-500/20 dark:text-blue-400',
};

const STATUS_ICON = {
    paid: CheckCircle2,
    pending: Clock,
    overdue: AlertTriangle,
    partial: CreditCard,
};

function LeaseProgress({ start, end }) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const now = new Date();
    const total = endDate - startDate;
    const elapsed = now - startDate;
    const pct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
    const daysLeft = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
    const monthsLeft = Math.ceil(daysLeft / 30);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground/60">{new Date(start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                <span className="text-emerald-500 dark:text-emerald-400">{pct}% complete</span>
                <span className="text-muted-foreground/60">{new Date(end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.5, duration: 1.2, ease: 'easeOut' }} />
            </div>
            <p className="text-[10px] text-muted-foreground/40 text-right">{monthsLeft} month{monthsLeft !== 1 ? 's' : ''} remaining</p>
        </div>
    );
}

function PaymentCountdown({ dueDate, amount }) {
    const due = new Date(dueDate);
    const diff = due - Date.now();
    const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    const isOverdue = diff < 0;

    const size = 100;
    const RADIUS = 40;
    const circumference = 2 * Math.PI * RADIUS;
    const percentage = Math.max(0, Math.min(100, Math.round((days / 30) * 100))); // Assuming 30 days for a month cycle
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    const label = isOverdue ? 'Overdue' : 'Days Left';

    return (
        <div className="flex flex-col items-center gap-3">
            <div className={cn('text-center px-5 py-3 rounded-2xl border', isOverdue
                ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20')}>
                <p className={cn('text-5xl font-black tabular-nums', isOverdue ? 'text-rose-400' : 'text-emerald-600 dark:text-white')}>
                    {isOverdue ? '!' : String(days).padStart(2, '0')}
                </p>
                <p className={cn('text-[9px] font-black uppercase tracking-widest mt-1', isOverdue ? 'text-rose-400' : 'text-emerald-300/60')}>
                    {isOverdue ? 'Overdue' : 'Days Left'}
                </p>
            </div>
            <p className="text-xs text-muted-foreground/60">Due {due.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <div className="relative w-full p-3 rounded-xl bg-card border border-border text-center overflow-hidden">
                <p className="text-2xl font-black text-foreground">₹{(amount || 0).toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-wider mt-0.5">Amount Due</p>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-foreground">{percentage}%</span>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</span>
                </div>
            </div>
            <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
                <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="currentColor" className="text-muted-foreground/10" strokeWidth="10" />
                <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="currentColor"
                    className={cn('transition-all duration-500', isOverdue ? 'text-rose-500' : 'text-emerald-500')}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </svg>
        </div>
    );
}

export default function TenantDashboard({ user, navigate }) {
    const [lease, setLease] = useState(null);
    const [payments, setPayments] = useState([]);
    const [maintenance, setMaintenance] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unread, setUnread] = useState(0);
    const [error, setError] = useState('');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [leaseRes, payRes, maintRes, notifRes, unreadRes, bookingRes] = await Promise.allSettled([
                    leaseService.getMyLease(),
                    paymentService.getMyPayments(),
                    maintenanceService.getAllRequests({ limit: 5 }),
                    notificationService.getMyNotifications({ limit: 5 }),
                    notificationService.getUnreadCount(),
                    bookingService.getMyBookings(),
                ]);
                if (leaseRes.status === 'fulfilled') setLease(leaseRes.value?.data || null);
                if (payRes.status === 'fulfilled') setPayments(payRes.value?.data || []);
                if (maintRes.status === 'fulfilled') setMaintenance(maintRes.value?.data || []);
                if (notifRes.status === 'fulfilled') setNotifications(notifRes.value?.data || []);
                if (unreadRes.status === 'fulfilled') setUnread(unreadRes.value?.data?.count || 0);
                if (bookingRes.status === 'fulfilled') setBookings(bookingRes.value?.data || []);
            } catch (e) { setError('Failed to load dashboard'); }
            finally { setLoading(false); }
        };
        fetchAll();
    }, []);

    // Compute next upcoming payment from payment records
    const pendingPayment = payments.find(p => p.status === 'pending' || p.status === 'overdue');
    const paidThisYear = payments.filter(p => p.status === 'paid').length;
    const totalSpend = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amountPaid || p.amount || 0), 0);
    const onTimeRate = payments.length > 0 ? Math.round((payments.filter(p => p.status === 'paid').length / payments.length) * 100) : 100;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto" />
                    <p className="text-muted-foreground/60 text-sm">Loading your dashboard…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-8">
            {/* Error */}
            {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>
            )}

            {/* Hero Banner */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden rounded-3xl p-6 md:p-8"
                style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 30%, #059669 60%, #10b981 100%)' }}>
                <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-emerald-400/20 blur-3xl animate-pulse" />
                <div className="absolute -bottom-16 left-1/3 w-48 h-48 rounded-full bg-teal-400/15 blur-2xl" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3" /> Resident Portal
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                            Welcome Home,<br />
                            <span className="text-emerald-200">{user?.firstName}! 🏡</span>
                        </h1>
                        <p className="text-emerald-100/60 mt-2 font-medium text-sm">
                            {lease ? `${lease.property?.name || 'Your unit'} • Active lease` : 'Your portal is ready'}
                        </p>
                    </div>
                    <div className="flex gap-3 flex-shrink-0 flex-wrap">
                        {[
                            { label: 'Payments Made', value: paidThisYear },
                            { label: 'On-Time Rate', value: `${onTimeRate}%` },
                            { label: 'Total Paid', value: `₹${(totalSpend / 1000).toFixed(0)}K` },
                        ].map(s => (
                            <div key={s.label} className="text-center px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 min-w-[70px]">
                                <p className="text-xl font-black text-white">{s.value}</p>
                                <p className="text-[9px] font-black text-emerald-200/60 uppercase tracking-widest mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* No Lease State or Active Bookings */}
            {!lease && bookings.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                    {/* Active Bookings Timeline */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-3xl bg-white/3 border border-white/5">
                        <p className="text-sm font-black text-white mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-400" /> Recent Booking Activity
                        </p>
                        <div className="space-y-4">
                            {bookings.map((b, i) => (
                                <div key={b._id}
                                    onClick={() => navigate(`/bookings/${b._id}`)}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                                            b.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                                                b.status === 'rejected' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400')}>
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{b.property?.name}</p>
                                            <p className="text-[10px] text-white/30 truncate max-w-[200px]">{b.property?.address}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            {b.totalAmount === 0 && (
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 uppercase tracking-tighter">
                                                    FREE
                                                </span>
                                            )}
                                            <span className={cn("text-[9px] font-black px-2 py-1 rounded-full border uppercase tracking-widest",
                                                b.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                    b.status === 'rejected' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400')}>
                                                {b.status}
                                            </span>
                                        </div>
                                        <p className="text-[9px] text-white/20 mt-1 font-bold">{new Date(b.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}

            {!lease && bookings.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-3">
                    <Home className="w-10 h-10 text-white/20 mx-auto" />
                    <p className="font-bold text-white/50">No active lease found</p>
                    <p className="text-sm text-white/25">Finding a new home? <button onClick={() => navigate('/browse')} className="text-blue-400 hover:underline">Browse Properties</button></p>
                </motion.div>
            )}

            {lease && (
                /* Lease + Countdown Row */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Lease Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="lg:col-span-2 rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-6 relative overflow-hidden group"
                    >
                        {/* Interior Glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-600/10 blur-[80px] -mr-32 -mt-32 rounded-full" />
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                        {lease.status === 'active' ? 'Active Lease' : 'Pending Lease'} • #{lease.leaseNumber || '—'}
                                    </span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Current Residence</p>
                                <h2 className="text-2xl font-black text-foreground">{lease?.property?.name || 'Not Assigned'}</h2>
                                <p className="text-xs text-muted-foreground mt-1 font-medium flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    {lease?.property?.address || 'Property details will appear once assigned'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Monthly Rent</p>
                                <p className="text-3xl font-black text-emerald-500 dark:text-emerald-400">₹{(lease.rentAmount || 0).toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                        <LeaseProgress start={lease.startDate} end={lease.endDate} />
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            {[
                                { label: 'Status', value: lease.status?.toUpperCase() || '—', hl: true },
                                { label: 'Start', value: new Date(lease.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                                { label: 'Ends', value: new Date(lease.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                            ].map((item) => (
                                <div key={item.label} className={cn('p-3 rounded-xl', item.hl ? 'bg-emerald-500/15 border border-emerald-500/20' : 'bg-white/5 border border-white/5')}>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">{item.label}</p>
                                    <p className={cn('text-xs font-black', item.hl ? 'text-emerald-300' : 'text-white')}>{item.value}</p>
                                </div>
                            ))}
                        </div>
                        {lease.property?.amenities?.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-2">Unit Amenities</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {lease.property.amenities.map(a => (
                                        <span key={a} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/50 capitalize">{a}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3 mt-5 pt-4 border-t border-white/5">
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                onClick={() => navigate('/pay-now')}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg hover:opacity-90 transition-all">
                                <Wallet className="w-4 h-4" /> Pay Rent
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                onClick={() => navigate('/maintenance')}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-white/60 font-bold text-sm hover:bg-white/5 hover:text-white transition-all">
                                <Wrench className="w-4 h-4" /> Report Issue
                            </motion.button>
                            {lease.property?.manager && (
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                    onClick={() => navigate('/messages', {
                                        state: {
                                            recipientId: lease.property.manager._id,
                                            recipientName: `${lease.property.manager.firstName} ${lease.property.manager.lastName}`
                                        }
                                    })}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400 font-bold text-sm hover:bg-blue-500 hover:text-white transition-all">
                                    <MessageSquare className="w-4 h-4" /> Chat Manager
                                </motion.button>
                            )}
                        </div>
                    </motion.div>

                    {/* Payment Countdown */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-900/30 via-teal-900/20 to-transparent p-5 flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 rounded-xl bg-emerald-500/20">
                                <Clock className="w-4 h-4 text-emerald-400" />
                            </div>
                            <p className="text-sm font-black text-white">Next Payment</p>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center">
                            {pendingPayment ? (
                                <PaymentCountdown dueDate={pendingPayment.dueDate} amount={pendingPayment.amount} />
                            ) : (
                                <div className="text-center py-6 space-y-2">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                                    <p className="font-bold text-white/60 text-sm">All caught up!</p>
                                    <p className="text-xs text-white/25">No pending payments</p>
                                </div>
                            )}
                        </div>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            onClick={() => navigate('/pay-now')}
                            className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg">
                            <CreditCard className="w-4 h-4" /> Pay Rent Now
                        </motion.button>
                    </motion.div>
                </div>
            )}

            {/* Widgets Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="h-64">
                    <CalendarWidget />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="h-64">
                    <WorldClockWidget />
                </motion.div>
                {/* Placeholder or existing component can go here, or span 2 cols */}
            </div>

            {/* Quick Actions + Live Sections Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Quick Actions */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="rounded-2xl border border-white/5 bg-white/3 p-5">
                    <p className="text-sm font-black text-white mb-4">Quick Actions</p>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Messages', icon: MessageSquare, path: '/messages', color: 'from-indigo-600 to-violet-600', glow: 'shadow-indigo-500/20' },
                            { label: 'Report Issue', icon: Wrench, path: '/maintenance', color: 'from-amber-600 to-orange-600', glow: 'shadow-amber-500/20' },
                            { label: 'Pay Rent', icon: Wallet, path: '/pay-now', color: 'from-emerald-600 to-teal-600', glow: 'shadow-emerald-500/20' },
                            { label: 'My Profile', icon: FileText, path: '/profile', color: 'from-purple-600 to-pink-600', glow: 'shadow-purple-500/20' },
                        ].map((action) => {
                            const Icon = action.icon;
                            return (
                                <motion.button key={action.label}
                                    whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.96 }}
                                    onClick={() => navigate(action.path)}
                                    className={cn('flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br text-white text-xs font-bold shadow-lg', action.color, action.glow)}>
                                    <Icon className="w-5 h-5" />
                                    <span>{action.label}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Recent Maintenance */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                    className="rounded-2xl border border-white/5 bg-white/3 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-black text-white">My Requests</p>
                        <button onClick={() => navigate('/maintenance')}
                            className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
                            + New <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                    {maintenance.length === 0 ? (
                        <div className="text-center py-8 text-white/20 text-sm">
                            <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            No requests yet
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {maintenance.slice(0, 4).map((m) => (
                                <div key={m._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                                    <div className={cn('w-2 h-2 rounded-full flex-shrink-0',
                                        m.status === 'resolved' ? 'bg-emerald-400' : m.status === 'in_progress' ? 'bg-amber-400' : 'bg-rose-400')} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white/80 truncate">{m.title}</p>
                                        <p className="text-[10px] text-white/30 capitalize">{m.status?.replace('_', ' ')}</p>
                                    </div>
                                    <span className="text-[9px] text-white/20">{new Date(m.createdAt).toLocaleDateString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Recent Notifications */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className="rounded-2xl border border-white/5 bg-white/3 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-black text-white flex items-center gap-2">
                            Notifications
                            {unread > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">{unread}</span>
                            )}
                        </p>
                    </div>
                    {notifications.length === 0 ? (
                        <div className="text-center py-8 text-white/20 text-sm">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            No notifications
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {notifications.slice(0, 4).map((n) => (
                                <div key={n._id} className={cn('flex gap-3 p-2.5 rounded-xl transition-colors', n.read ? 'opacity-50' : 'bg-white/3')}>
                                    <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5', n.read ? 'bg-white/20' : 'bg-blue-400')} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white/80 truncate">{n.title}</p>
                                        <p className="text-[10px] text-white/30 line-clamp-1">{n.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Payment History */}
            {payments.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                    className="rounded-2xl border border-white/5 bg-white/3 p-5">
                    <div className="flex items-center justify-between mb-5">
                        <p className="text-sm font-black text-white">Payment History</p>
                        <button onClick={() => navigate('/payments')}
                            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                            View all <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="divide-y divide-white/5">
                        {payments.slice(0, 6).map((p, i) => {
                            const StatusIcon = STATUS_ICON[p.status] || CreditCard;
                            return (
                                <motion.div key={p._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.65 + i * 0.06 }}
                                    className="flex items-center justify-between py-3 hover:bg-white/3 px-2 -mx-2 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={cn('p-1.5 rounded-lg', STATUS_COLOR[p.status]?.split(' ').slice(1).join(' ') || 'bg-white/5')}>
                                            <StatusIcon className={cn('w-3.5 h-3.5', STATUS_COLOR[p.status]?.split(' ')[0] || 'text-white/40')} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{p.property?.name || p.lease?.leaseNumber || 'Payment'}</p>
                                            <p className="text-xs text-white/30">{new Date(p.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-white">₹{(p.amountPaid || p.amount || 0).toLocaleString()}</p>
                                        <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full border uppercase', STATUS_COLOR[p.status] || 'text-white/30 bg-white/5 border-white/10')}>
                                            {p.status}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </div>
    );
}

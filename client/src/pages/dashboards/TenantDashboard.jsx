import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { leaseService, paymentService, maintenanceService, notificationService, bookingService } from '../../services/api';
import {
    Building2, CreditCard, Wrench, MessageSquare, CheckCircle2,
    Calendar, Clock, AlertTriangle, FileText, Wallet, Bell,
    Home, Star, Sparkles, ArrowRight, XCircle, RefreshCw, Plus, ChevronDown,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { CalendarWidget, WorldClockWidget } from '../../components/dashboard/Widgets';
import { useLanguage } from '../../context/LanguageContext';

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

function PaymentCountdown({ dueDate, amount, isEstimate, propertyName }) {
    const { t } = useLanguage();
    const due = new Date(dueDate);
    const diff = due - Date.now();
    const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    const isOverdue = diff < 0 && !isEstimate;

    const size = 100;
    const RADIUS = 40;
    const circumference = 2 * Math.PI * RADIUS;
    const percentage = Math.max(0, Math.min(100, Math.round((days / 30) * 100)));
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    const label = isOverdue ? t('dashboard.overdue') : t('dashboard.daysLeft');

    return (
        <div className="flex flex-col items-center gap-3 w-full max-w-[240px] mx-auto">
            <div className="relative w-28 h-28 flex items-center justify-center">
                {/* SVG Progress Circle */}
                <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90 absolute">
                    <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="currentColor" className="text-muted-foreground/10" strokeWidth="8" />
                    <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="currentColor"
                        className={cn('transition-all duration-500', isOverdue ? 'text-rose-500' : 'text-emerald-500')}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                    />
                </svg>
                {/* Center text in SVG */}
                <div className="flex flex-col items-center justify-center z-10">
                    <p className={cn('text-3xl font-black tabular-nums leading-none', isOverdue ? 'text-rose-500' : 'text-emerald-500')}>
                        {isOverdue ? '!' : days}
                    </p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1 text-center">
                        {label}
                    </p>
                </div>
            </div>

            <div className="text-center w-full">
                <p className="text-xs text-muted-foreground/60">
                    {isEstimate ? 'Estimated Due:' : `${t('dashboard.due')}:`} {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                {propertyName && (
                    <p className="text-[10px] font-black text-muted-foreground/45 uppercase tracking-widest mt-0.5 truncate px-2" title={propertyName}>
                        {propertyName}
                    </p>
                )}
            </div>

            <div className="w-full p-3 rounded-2xl bg-muted/40 border border-border text-center">
                <p className="text-2xl font-black text-foreground">₹{(amount || 0).toLocaleString('en-IN')}</p>
                <p className="text-[9px] text-muted-foreground/50 font-black uppercase tracking-widest mt-0.5">
                    {isEstimate ? 'Upcoming Rent' : t('dashboard.amountDue')}
                </p>
            </div>
        </div>
    );
}

export default function TenantDashboard({ user, navigate }) {
    const { t } = useLanguage();
    const [lease, setLease] = useState(null);
    const [activeLeases, setActiveLeases] = useState([]);
    const [pastLeases, setPastLeases] = useState([]);
    const [completedStackOpen, setCompletedStackOpen] = useState(false);
    const [activePaymentIndex, setActivePaymentIndex] = useState(0);
    const [payments, setPayments] = useState([]);
    const [maintenance, setMaintenance] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unread, setUnread] = useState(0);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const scrollRef = useRef(null);

    const scrollActiveLeases = (direction) => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' 
                ? scrollLeft - clientWidth 
                : scrollLeft + clientWidth;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [leaseRes, payRes, maintRes, notifRes, unreadRes, bookingRes] = await Promise.allSettled([
                    leaseService.getMyLease(),
                    paymentService.getMyPayments(),
                    maintenanceService.getAllRequests({ limit: 5 }),
                    notificationService.getMyNotifications({ limit: 10 }),
                    notificationService.getUnreadCount(),
                    bookingService.getMyBookings(),
                ]);

                if (leaseRes.status === 'fulfilled') {
                    const resVal = leaseRes.value || {};
                    setLease(resVal.data || null);
                    setActiveLeases(resVal.activeLeases || (resVal.data ? [resVal.data] : []));
                    setPastLeases(resVal.pastLeases || []);
                }
                if (payRes.status === 'fulfilled') setPayments(payRes.value?.data || []);
                if (maintRes.status === 'fulfilled') setMaintenance(maintRes.value?.data?.data || maintRes.value?.data || []);
                if (notifRes.status === 'fulfilled') setNotifications(notifRes.value?.data?.data || notifRes.value?.data || []);
                if (unreadRes.status === 'fulfilled') setUnread(unreadRes.value?.data?.count || 0);
                if (bookingRes.status === 'fulfilled') setBookings(bookingRes.value?.data || []);
            } catch (e) { setError('Failed to load dashboard'); }
            finally { setLoading(false); }
        };
        fetchAll();
    }, []);

    const pendingPayment = payments.find(p => p.status === 'pending' || p.status === 'overdue');
    const paidThisYear = payments.filter(p => p.status === 'paid').length;
    const totalSpend = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amountPaid || p.amount || 0), 0);
    const onTimeRate = payments.length > 0 ? Math.round((payments.filter(p => p.status === 'paid').length / payments.length) * 100) : 100;

    const getNextEstimatedPayments = () => {
        if (activeLeases.length === 0) return [];
        return activeLeases.map(activeLease => {
            const activeLeasePayments = payments.filter(p => p.lease?._id === activeLease._id || p.lease === activeLease._id);
            const paidPayments = activeLeasePayments.filter(p => p.status === 'paid');
            let nextDueDate = new Date();
            if (paidPayments.length > 0) {
                const sortedPaid = [...paidPayments].sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
                const latestDue = new Date(sortedPaid[0].dueDate);
                nextDueDate = new Date(latestDue.getFullYear(), latestDue.getMonth() + 1, latestDue.getDate());
            } else {
                const leaseStart = new Date(activeLease.startDate);
                nextDueDate = new Date(leaseStart.getFullYear(), leaseStart.getMonth(), leaseStart.getDate());
                if (nextDueDate < new Date()) {
                    nextDueDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
                }
            }
            return {
                id: activeLease._id,
                propertyName: activeLease.property?.name || 'TMS Rental',
                amount: activeLease.rentAmount,
                dueDate: nextDueDate,
                type: 'rent',
                status: 'upcoming'
            };
        });
    };

    const nextEstimatedPayments = getNextEstimatedPayments();

    const getActivePaymentsToShow = () => {
        return activeLeases.map(activeLease => {
            const dbPending = payments.find(p => 
                (p.lease?._id === activeLease._id || p.lease === activeLease._id) && 
                (p.status === 'pending' || p.status === 'overdue')
            );
            if (dbPending) {
                return {
                    id: dbPending._id,
                    dueDate: dbPending.dueDate,
                    amount: dbPending.amount,
                    propertyName: activeLease.property?.name || 'TMS Rental',
                    isEstimate: false,
                    isOverdue: dbPending.status === 'overdue' || new Date(dbPending.dueDate) < new Date()
                };
            }
            const est = nextEstimatedPayments.find(e => e.id === activeLease._id);
            if (est) {
                return {
                    id: est.id,
                    dueDate: est.dueDate,
                    amount: est.amount,
                    propertyName: est.propertyName,
                    isEstimate: true,
                    isOverdue: false
                };
            }
            return null;
        }).filter(Boolean);
    };

    const activePaymentsToShow = getActivePaymentsToShow();

    const trulyActiveLeases = activeLeases.filter(l => new Date(l.endDate) > new Date());
    const completedLeases = [
        ...pastLeases,
        ...activeLeases.filter(l => new Date(l.endDate) <= new Date())
    ];
    const uniqueCompletedLeases = Array.from(new Map(completedLeases.map(l => [l._id, l])).values());

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto" />
                    <p className="text-muted-foreground/60 text-sm">{t('dashboard.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-8">
            {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>
            )}

            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden rounded-3xl p-6 md:p-8"
                style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 30%, #059669 60%, #10b981 100%)' }}>
                <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-emerald-400/20 blur-3xl animate-pulse" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3" /> {t('dashboard.residentPortal')}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                            {t('dashboard.welcomeHome')},<br />
                            <span className="text-emerald-200">{user?.firstName}! 🏡</span>
                        </h1>
                    </div>
                    <div className="flex gap-3 flex-shrink-0 flex-wrap">
                        {[
                            { label: t('dashboard.paymentsMade'), value: paidThisYear },
                            { label: t('dashboard.onTimeRate'), value: `${onTimeRate}%` },
                            { label: t('dashboard.totalPaid'), value: `₹${(totalSpend / 1000).toFixed(0)}K` },
                        ].map(s => (
                            <div key={s.label} className="text-center px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 min-w-[70px]">
                                <p className="text-xl font-black text-white">{s.value}</p>
                                <p className="text-[9px] font-black text-emerald-200/60 uppercase tracking-widest mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Leases Column (Left 2 columns) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-lg font-black text-foreground tracking-tight">My Lease Agreements</h2>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-muted border border-border text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            Total Leases: {activeLeases.length + pastLeases.length} ({trulyActiveLeases.length} Active, {uniqueCompletedLeases.length} Completed)
                        </span>
                    </div>

                    {trulyActiveLeases.length > 0 ? (
                        <div className="relative group/scroll">
                            {/* Left Navigation Arrow */}
                            {trulyActiveLeases.length > 1 && (
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => scrollActiveLeases('left')}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-background/80 hover:bg-background border border-border shadow-lg flex items-center justify-center text-foreground backdrop-blur-sm opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300"
                                >
                                    <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                                </motion.button>
                            )}

                            {/* Right Navigation Arrow */}
                            {trulyActiveLeases.length > 1 && (
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => scrollActiveLeases('right')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-background/80 hover:bg-background border border-border shadow-lg flex items-center justify-center text-foreground backdrop-blur-sm opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300"
                                >
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                </motion.button>
                            )}

                            {/* Horizontal Scroll Wrapper */}
                            <div
                                ref={scrollRef}
                                className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {trulyActiveLeases.map((activeLease) => (
                                    <motion.div
                                        key={activeLease._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="snap-start shrink-0 w-full rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-6 relative overflow-hidden group flex flex-col justify-between"
                                    >
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-600/10 blur-[80px] -mr-32 -mt-32 rounded-full" />
                                        <div>
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                                            {activeLease.status === 'active' ? t('dashboard.activeLease') : t('dashboard.pendingLease')} • #{activeLease.leaseNumber || '—'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{t('dashboard.currentResidence')}</p>
                                                    <h2 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">{activeLease?.property?.name || 'Not Assigned'}</h2>
                                                    <p className="text-xs text-muted-foreground mt-1 font-medium flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                        {activeLease?.property?.address || 'Property details will appear once assigned'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{t('dashboard.monthlyRent')}</p>
                                                    <p className="text-2xl font-black text-emerald-500 dark:text-emerald-400">₹{(activeLease.rentAmount || 0).toLocaleString('en-IN')}</p>
                                                </div>
                                            </div>
                                            <LeaseProgress start={activeLease.startDate} end={activeLease.endDate} />
                                            
                                            <div className="grid grid-cols-3 gap-3 mt-4">
                                                {[
                                                    { label: t('common.status') || 'Status', value: activeLease.status?.toUpperCase() || '—', hl: true },
                                                    { label: t('common.start') || 'Start', value: new Date(activeLease.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                                                    { label: t('common.ends') || 'Ends', value: new Date(activeLease.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                                                ].map((item) => (
                                                    <div key={item.label} className={cn('p-2.5 rounded-xl text-center', item.hl ? 'bg-emerald-500/15 border border-emerald-500/20' : 'bg-muted border border-border')}>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{item.label}</p>
                                                        <p className={cn('text-[10px] font-black', item.hl ? 'text-emerald-600 dark:text-emerald-300' : 'text-foreground')}>{item.value}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {activeLease.property?.amenities?.length > 0 && (
                                                <div className="mt-4 pt-3 border-t border-border/60">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {activeLease.property.amenities.slice(0, 4).map(a => (
                                                            <span key={a} className="px-2 py-0.5 rounded-lg bg-muted border border-border text-[9px] text-muted-foreground capitalize">{a}</span>
                                                        ))}
                                                        {activeLease.property.amenities.length > 4 && (
                                                            <span className="px-2 py-0.5 rounded-lg bg-muted border border-border text-[9px] text-muted-foreground">+{activeLease.property.amenities.length - 4} more</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2.5 mt-5 pt-3 border-t border-border/60">
                                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                                onClick={() => navigate('/pay-now', { state: { propertyId: activeLease.property?._id } })}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-md hover:opacity-90 transition-all">
                                                <Wallet className="w-3.5 h-3.5" /> {t('dashboard.payRent')}
                                            </motion.button>
                                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                                onClick={() => navigate('/maintenance', { state: { propertyId: activeLease.property?._id } })}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-muted-foreground font-bold text-xs hover:bg-muted transition-all">
                                                <Wrench className="w-3.5 h-3.5" /> {t('dashboard.reportIssue')}
                                            </motion.button>
                                            {activeLease.property?.manager && (
                                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                                    onClick={() => navigate('/messages', { state: { recipientId: activeLease.property.manager._id, recipientName: `${activeLease.property.manager.firstName} ${activeLease.property.manager.lastName}` } })}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-muted-foreground font-bold text-xs hover:bg-muted transition-all">
                                                    <MessageSquare className="w-3.5 h-3.5" /> Chat
                                                </motion.button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 rounded-2xl border border-dashed border-border bg-card/10">
                            <Home className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-sm font-bold text-muted-foreground">No active rentals</p>
                            <button onClick={() => navigate('/properties')} className="mt-2 text-xs font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1 mx-auto">
                                Browse Properties <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                    )}

                    {/* Collapsible Completed Leases Stack */}
                    {uniqueCompletedLeases.length > 0 && (
                        <div className="space-y-3 pt-3">
                            <h3 className="text-xs font-black text-muted-foreground/45 uppercase tracking-widest px-1">Past & Completed Rentals</h3>
                            
                            <div className="relative group">
                                {/* 3D Card Stack visual deck effect when collapsed */}
                                {!completedStackOpen && uniqueCompletedLeases.length > 1 && (
                                    <>
                                        <div className="absolute inset-0 bg-card/25 border border-border/80 rounded-2xl translate-x-1.5 translate-y-1.5 scale-[0.98] blur-[0.5px] transition-transform duration-300 group-hover:translate-x-2 group-hover:translate-y-2 z-0" />
                                        {uniqueCompletedLeases.length > 2 && (
                                            <div className="absolute inset-0 bg-card/10 border border-border/60 rounded-2xl translate-x-3 translate-y-3 scale-[0.96] blur-[1px] transition-transform duration-300 group-hover:translate-x-4 group-hover:translate-y-4 z-0" />
                                        )}
                                    </>
                                )}

                                {/* Main Stack Trigger Card */}
                                <button
                                    onClick={() => setCompletedStackOpen(!completedStackOpen)}
                                    className="relative z-10 w-full bg-card/60 backdrop-blur-md border border-border hover:border-border/80 rounded-2xl p-5 shadow-lg flex items-center justify-between text-left group transition-all duration-300 hover:-translate-y-0.5"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground/80 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-foreground group-hover:text-primary transition-colors">Completed Leases Stack</h4>
                                            <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider mt-0.5">{uniqueCompletedLeases.length} expired or completed lease agreement{uniqueCompletedLeases.length > 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 bg-muted border border-border/80 px-2 py-0.5 rounded-lg select-none">
                                            {completedStackOpen ? 'Hide' : 'Reveal Stack'}
                                        </span>
                                        <ChevronDown className={cn("w-4 h-4 text-muted-foreground/60 transition-transform duration-300", completedStackOpen && "rotate-180")} />
                                    </div>
                                </button>
                            </div>

                            {/* Stack expanded items list with smooth motion height transition */}
                            <AnimatePresence>
                                {completedStackOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                                        className="overflow-hidden space-y-3 pt-2"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-1">
                                            {uniqueCompletedLeases.map((pastLease) => (
                                                <div key={pastLease._id} className="p-4 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500">
                                                                Expired
                                                            </span>
                                                            <span className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-wider">#{pastLease.leaseNumber}</span>
                                                        </div>
                                                        <h4 className="text-sm font-black text-foreground truncate">{pastLease?.property?.name || 'Previous Residence'}</h4>
                                                        <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{pastLease?.property?.address}</p>
                                                        <p className="text-[9px] text-muted-foreground/45 mt-1 font-bold">
                                                            {new Date(pastLease.startDate).toLocaleDateString()} - {new Date(pastLease.endDate).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="text-[8px] font-black text-muted-foreground/45 uppercase tracking-widest">Rent</p>
                                                        <p className="text-sm font-black text-foreground">₹{(pastLease.rentAmount || 0).toLocaleString('en-IN')}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Next Payment Countdown Column (Right 1 column) */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-2xl border border-border bg-card p-5 flex flex-col h-full min-h-[300px] justify-center">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
                            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-sm font-black text-foreground">{t('dashboard.nextPayment')}</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center w-full">
                        {activePaymentsToShow.length > 1 ? (
                            <div className="flex flex-col items-center w-full">
                                {/* Staggered Animating Switcher */}
                                <div className="w-full relative min-h-[220px] flex items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activePaymentIndex}
                                            initial={{ opacity: 0, x: 25, scale: 0.95 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            exit={{ opacity: 0, x: -25, scale: 0.95 }}
                                            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                                            className="w-full absolute"
                                        >
                                            <PaymentCountdown
                                                dueDate={activePaymentsToShow[activePaymentIndex].dueDate}
                                                amount={activePaymentsToShow[activePaymentIndex].amount}
                                                isEstimate={activePaymentsToShow[activePaymentIndex].isEstimate}
                                                propertyName={activePaymentsToShow[activePaymentIndex].propertyName}
                                            />
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                {/* Premium Dot/Pill Selectors */}
                                <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-3 border-t border-border/50 w-full z-25">
                                    {activePaymentsToShow.map((pmt, idx) => (
                                        <motion.button
                                            key={pmt.id}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setActivePaymentIndex(idx)}
                                            className={cn(
                                                "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-300 border",
                                                activePaymentIndex === idx
                                                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-extrabold shadow-sm"
                                                    : "bg-muted/40 border-border/80 text-muted-foreground/60 hover:text-foreground hover:bg-muted"
                                            )}
                                        >
                                            {pmt.propertyName.split(' ')[0]}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        ) : activePaymentsToShow.length === 1 ? (
                            <PaymentCountdown 
                                dueDate={activePaymentsToShow[0].dueDate} 
                                amount={activePaymentsToShow[0].amount} 
                                isEstimate={activePaymentsToShow[0].isEstimate}
                                propertyName={activePaymentsToShow[0].propertyName}
                            />
                        ) : (
                            <div className="text-center py-6 space-y-2">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400 mx-auto" />
                                <p className="font-bold text-muted-foreground text-sm">{t('dashboard.allCaughtUp')}</p>
                                <p className="text-xs text-muted-foreground/50">{t('dashboard.noPendingPayments')}</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="h-64">
                    <CalendarWidget />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="h-64">
                    <WorldClockWidget />
                </motion.div>

                {/* Monthly Payment Reminders & Upcoming Schedule */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.5 }}
                    className="rounded-3xl border border-border bg-card/60 backdrop-blur-md p-5 relative overflow-hidden group shadow-lg flex flex-col h-64"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-600/5 blur-[40px] -mr-16 -mt-16 rounded-full" />
                    
                    <div className="flex items-center gap-2 mb-3 border-b border-border pb-2 flex-shrink-0">
                        <Wallet className="w-4 h-4 text-emerald-500" />
                        <div>
                            <h2 className="text-xs font-black text-foreground tracking-tight">Payment Schedule & Reminders</h2>
                            <p className="text-[9px] text-muted-foreground/60 leading-none">Your due, overdue & upcoming invoices</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {/* Unpaid / Active Due Payments */}
                        {payments.filter(p => ['pending', 'overdue', 'partially_paid'].includes(p.status)).length > 0 ? (
                            payments.filter(p => ['pending', 'overdue', 'partially_paid'].includes(p.status)).map((p) => {
                                const isOverdue = p.status === 'overdue';
                                const isPartial = p.status === 'partially_paid';
                                return (
                                    <div
                                        key={p._id}
                                        className={cn(
                                            "p-2.5 rounded-xl border flex flex-col gap-2 transition-all",
                                            isOverdue
                                                ? "bg-rose-500/5 border-rose-500/25"
                                                : isPartial
                                                    ? "bg-blue-500/5 border-blue-500/25"
                                                    : "bg-amber-500/5 border-amber-500/25"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={cn(
                                                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                                                        isOverdue
                                                            ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                                            : isPartial
                                                                ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                                                : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                                    )}>
                                                        {isOverdue ? 'Overdue' : isPartial ? 'Partial' : 'Due'}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">{p.type}</span>
                                                </div>
                                                <p className="text-xs font-black text-foreground mt-1">
                                                    ₹{((p.amount || 0) - (p.amountPaid || 0)).toLocaleString('en-IN')} pending
                                                </p>
                                                <p className="text-[9px] text-muted-foreground mt-0.5">
                                                    Due: {new Date(p.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => navigate('/pay-now', { state: { paymentId: p._id } })}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white transition-all shadow-md active:scale-95 flex-shrink-0 self-center",
                                                    isOverdue
                                                        ? "bg-rose-600 hover:bg-rose-500"
                                                        : isPartial
                                                            ? "bg-blue-600 hover:bg-blue-500"
                                                            : "bg-emerald-600 hover:bg-emerald-500"
                                                )}
                                            >
                                                Pay
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            /* If no unpaid payments, show caught up reminder */
                            <div className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-emerald-900 dark:text-emerald-100">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-foreground">All Caught Up! 🎉</p>
                                    <p className="text-[10px] text-muted-foreground/60">No pending payments.</p>
                                </div>
                            </div>
                        )}

                        {/* Upcoming Monthly Invoice Estimates */}
                        {nextEstimatedPayments.map((est) => (
                            <div key={est.id} className="p-2.5 rounded-xl border border-dashed border-border bg-muted/40 flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground/60">
                                        Upcoming
                                    </span>
                                    <span className="text-[8px] text-muted-foreground/45 font-bold uppercase truncate max-w-[120px]" title={est.propertyName}>
                                        {est.propertyName}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <p className="text-xs font-black text-foreground">
                                            ₹{(est.amount || 0).toLocaleString('en-IN')}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground mt-0.5">
                                            Est: {est.dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <span className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-widest select-none">
                                        Scheduled
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="rounded-2xl border border-border bg-card p-5">
                    <p className="text-sm font-black text-foreground mb-4">{t('dashboard.quickActions')}</p>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: t('nav.messages'), icon: MessageSquare, path: '/messages', color: 'from-indigo-600 to-violet-600', glow: 'shadow-indigo-500/20' },
                            { label: t('dashboard.reportIssue'), icon: Wrench, path: '/maintenance', color: 'from-amber-600 to-orange-600', glow: 'shadow-amber-500/20' },
                            { label: t('nav.payments'), icon: Wallet, path: '/pay-now', color: 'from-emerald-600 to-teal-600', glow: 'shadow-emerald-500/20' },
                            { label: t('nav.profile') || 'My Profile', icon: FileText, path: '/profile', color: 'from-purple-600 to-pink-600', glow: 'shadow-purple-500/20' },
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

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                    className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-black text-foreground">{t('dashboard.myRequests')}</p>
                        <button onClick={() => navigate('/maintenance')}
                            className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 transition-colors">
                            + {t('dashboard.newRequest')} <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                    {maintenance.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground/30 text-sm">
                            <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            {t('dashboard.noRequestsYet')}
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {maintenance.slice(0, 4).map((m) => (
                                <div key={m._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors">
                                    <div className={cn('w-2 h-2 rounded-full flex-shrink-0',
                                        m.status === 'resolved' ? 'bg-emerald-400' : m.status === 'in_progress' ? 'bg-amber-400' : 'bg-rose-400')} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-foreground/80 truncate">{m.title}</p>
                                        <p className="text-[10px] text-muted-foreground/60 capitalize">{m.status?.replace('_', ' ')}</p>
                                    </div>
                                    <span className="text-[9px] text-muted-foreground/40">{new Date(m.createdAt).toLocaleDateString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-black text-foreground flex items-center gap-2">
                            {t('dashboard.notifications')}
                            {unread > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">{unread}</span>
                            )}
                        </p>
                    </div>
                    {notifications.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground/30 text-sm">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            {t('dashboard.noNotifications')}
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {notifications.slice(0, 4).map((n) => (
                                <div key={n._id} className={cn('flex gap-3 p-2.5 rounded-xl transition-colors', n.read ? 'opacity-50' : 'bg-muted/50')}>
                                    <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5', n.read ? 'bg-muted-foreground/20' : 'bg-blue-500')} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-foreground/80 truncate">{n.title}</p>
                                        <p className="text-[10px] text-muted-foreground/60 line-clamp-1">{n.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>

            {payments.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                    className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between mb-5">
                        <p className="text-sm font-black text-foreground">{t('dashboard.paymentHistory')}</p>
                        <button onClick={() => navigate('/payments')}
                            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                            {t('dashboard.viewAll')} <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="divide-y divide-border">
                        {payments.slice(0, 6).map((p, i) => {
                            const StatusIcon = STATUS_ICON[p.status] || CreditCard;
                            return (
                                <motion.div key={p._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.65 + i * 0.06 }}
                                    className="flex items-center justify-between py-3 hover:bg-muted px-2 -mx-2 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={cn('p-1.5 rounded-lg', STATUS_COLOR[p.status]?.split(' ').slice(1).join(' ') || 'bg-muted')}>
                                            <StatusIcon className={cn('w-3.5 h-3.5', STATUS_COLOR[p.status]?.split(' ')[0] || 'text-muted-foreground')} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{p.property?.name || p.lease?.leaseNumber || 'Payment'}</p>
                                            <p className="text-xs text-muted-foreground/60">{new Date(p.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-foreground">₹{(p.amountPaid || p.amount || 0).toLocaleString()}</p>
                                        <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full border uppercase', STATUS_COLOR[p.status] || 'text-muted-foreground bg-muted border-border')}>
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

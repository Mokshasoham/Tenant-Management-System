import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { leaseService, paymentService, maintenanceService, notificationService, bookingService, visitService, propertyService, billService } from '../../services/api';
import {
    Building2, CreditCard, Wrench, MessageSquare, CheckCircle2,
    Calendar, Clock, AlertTriangle, FileText, Wallet, Bell,
    Home, Star, Sparkles, ArrowRight, XCircle, RefreshCw, Plus, ChevronDown, ChevronUp,
    ChevronLeft, ChevronRight, X, FileSignature
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { CalendarWidget, WorldClockWidget } from '../../components/dashboard/Widgets';
import { useLanguage } from '../../context/LanguageContext';
import { useActionCenterNavigation } from '../../hooks/useActionCenterNavigation';

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

const getBookingStatusDisplay = (b) => {
    if (b.status === 'pending') {
        return { label: 'Pending Approval', class: 'bg-amber-500/10 border-amber-500/20 text-amber-500', isPayable: false };
    }
    if (b.status === 'approved' && (b.paymentStatus === 'pending' || b.paymentStatus === 'failed')) {
        return { label: 'Approved – Awaiting Deposit Payment', class: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500 animate-pulse', isPayable: true };
    }
    if (b.status === 'approved' && b.paymentStatus === 'paid') {
        return { label: 'Deposit Paid – Confirmed', class: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500', isPayable: false };
    }
    if (b.status === 'active' || b.status === 'completed') {
        return { label: 'Lease Active', class: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500', isPayable: false };
    }
    if (b.status === 'rejected') {
        return { label: 'Rejected', class: 'bg-rose-500/10 border-rose-500/20 text-rose-500', isPayable: false };
    }
    if (b.status === 'cancelled') {
        return { label: 'Cancelled', class: 'bg-muted border-border text-muted-foreground', isPayable: false };
    }
    return { label: b.status?.toUpperCase() || '—', class: 'bg-blue-500/10 border-blue-500/20 text-blue-500', isPayable: false };
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
    const { handleAction } = useActionCenterNavigation();
    const [lease, setLease] = useState(null);
    const [activeLeases, setActiveLeases] = useState([]);
    const [pastLeases, setPastLeases] = useState([]);
    const [completedStackOpen, setCompletedStackOpen] = useState(false);
    const [bookingsStackOpen, setBookingsStackOpen] = useState(false);
    const [activePaymentIndex, setActivePaymentIndex] = useState(0);
    const [payments, setPayments] = useState([]);
    const [maintenance, setMaintenance] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unread, setUnread] = useState(0);
    const [expandedNotifs, setExpandedNotifs] = useState({});
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // My Messages calendar states and helper functions
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const handlePrevMonth = () => {
        setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const getLocalDateString = (dateObj) => {
        if (!dateObj) return '';
        const d = new Date(dateObj);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const recordDates = new Set(
        notifications.map(n => getLocalDateString(n.createdAt))
    );

    const formatTimeAgo = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) {
            if (date.getDate() === now.getDate()) {
                return `${diffHours}h ago`;
            }
            return 'Yesterday';
        }
        if (diffHours < 48 && date.getDate() === new Date(now - 86400000).getDate()) return 'Yesterday';
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const displayedNotifications = selectedDate 
        ? notifications.filter(n => getLocalDateString(n.createdAt) === selectedDate)
        : notifications;

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
                    billService.getMyBills(),
                    maintenanceService.getAllRequests({ limit: 5 }),
                    notificationService.getMyNotifications({ limit: 100 }),
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

    const pendingPayment = payments.find(p => ['pending', 'overdue', 'partially_paid', 'generated'].includes(p.status));
    const paidThisYear = payments.filter(p => p.status === 'paid').length;
    const totalSpend = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amountPaid || p.amount || 0), 0);
    const onTimeRate = payments.length > 0 ? Math.round((payments.filter(p => p.status === 'paid').length / payments.length) * 100) : 100;

    const handleDeleteNotif = async (id) => {
        try {
            await notificationService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n._id !== id));
            const deletedNotif = notifications.find(n => n._id === id);
            if (deletedNotif && !deletedNotif.read) {
                setUnread(c => Math.max(0, c - 1));
            }
        } catch (err) {
            console.error('Failed to delete notification', err);
        }
    };

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
                (['pending', 'overdue', 'partially_paid', 'generated'].includes(p.status))
            );
            if (dbPending) {
                return {
                    id: dbPending._id,
                    dueDate: dbPending.dueDate,
                    amount: dbPending.amountDue !== undefined ? (dbPending.amountDue - dbPending.amountPaid) : dbPending.amount,
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

    const pendingTenantBookings = bookings.filter(b => b.status === 'pending');
    const approvedTenantBookings = bookings.filter(b => b.status === 'approved');
    const upcomingMoveIns = bookings.filter(b => b.status === 'approved' && b.paymentStatus === 'paid' && new Date(b.startDate) > new Date());
    const historicalBookings = bookings.filter(b => ['completed', 'rejected', 'cancelled'].includes(b.status));

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

    const isLeaseExpired = lease && new Date(lease.endDate) < new Date();
    if (isLeaseExpired && lease.leaseDecision === 'pending') {
        return (
            <div className="min-h-[70vh] flex flex-col justify-center items-center px-4 py-8">
                <div className="w-full max-w-xl bg-card border border-border rounded-3xl p-8 text-center space-y-6 shadow-2xl">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                        <AlertTriangle className="w-8 h-8 text-rose-500" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-black text-foreground">Lease Expired</h1>
                        <p className="text-sm text-muted-foreground">
                            Your lease agreement has expired. You must select whether to request a renewal or submit a move-out notice to proceed.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        <button
                            onClick={() => navigate('/lease-renewal')}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all"
                        >
                            Renew Lease
                        </button>
                        <button
                            onClick={() => navigate('/move-out')}
                            className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all"
                        >
                            Move Out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-8">
            <style dangerouslySetInnerHTML={{__html: `
                .scrollbar-none::-webkit-scrollbar {
                    display: none;
                }
            `}} />
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
                                                        <div className={cn("w-2 h-2 rounded-full", (activeLease.status === 'pending' && activeLease.signature) ? "bg-indigo-400 animate-pulse" : "bg-emerald-400 animate-pulse")} />
                                                        <span className={cn("text-[10px] font-black uppercase tracking-widest", (activeLease.status === 'pending' && activeLease.signature) ? "text-indigo-400" : "text-emerald-400")}>
                                                            {(activeLease.status === 'pending' && activeLease.signature) ? 'Upcoming Lease' : (activeLease.status === 'active' ? t('dashboard.activeLease') : t('dashboard.pendingLease'))} • #{activeLease.leaseNumber || '—'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{t('dashboard.currentResidence')}</p>
                                                    <h2 
                                                        onClick={() => navigate('/my-lease', { state: { leaseId: activeLease._id } })}
                                                        className="text-xl font-black text-foreground hover:text-emerald-500 cursor-pointer transition-colors"
                                                    >
                                                        {activeLease?.property?.name || 'Not Assigned'}
                                                    </h2>
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
                                                    { 
                                                        label: t('status') || 'Status', 
                                                        value: (activeLease.status === 'pending' && activeLease.signature) ? 'UPCOMING' : (activeLease.status?.toUpperCase() || '—'), 
                                                        hl: true,
                                                        isUpcoming: (activeLease.status === 'pending' && activeLease.signature)
                                                    },
                                                    { label: t('start') || 'Start', value: new Date(activeLease.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                                                    { label: t('ends') || 'Ends', value: new Date(activeLease.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                                                ].map((item) => (
                                                    <div key={item.label} className={cn('p-2.5 rounded-xl text-center', item.hl ? (item.isUpcoming ? 'bg-indigo-500/15 border border-indigo-500/20' : 'bg-emerald-500/15 border border-emerald-500/20') : 'bg-muted border border-border')}>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{item.label}</p>
                                                        <p className={cn('text-[10px] font-black', item.hl ? (item.isUpcoming ? 'text-indigo-600 dark:text-indigo-300' : 'text-emerald-600 dark:text-emerald-300') : 'text-foreground')}>{item.value}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {activeLease.leaseDecision && activeLease.leaseDecision !== 'pending' && (
                                                <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs">
                                                    <p className="font-bold capitalize">Lease Decision: {activeLease.leaseDecision.replace('_', ' ')}</p>
                                                    {activeLease.moveOutStatus && activeLease.moveOutStatus !== 'none' && (
                                                        <p className="mt-1 text-[10px] text-muted-foreground capitalize">Move-out Stage: {activeLease.moveOutStatus.replace('_', ' ')}</p>
                                                    )}
                                                </div>
                                            )}

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
                                            {activeLease.status === 'pending' && !activeLease.signature ? (
                                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                                    onClick={() => navigate('/my-lease')}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs shadow-md hover:opacity-90 transition-all uppercase tracking-wider">
                                                    <FileSignature className="w-3.5 h-3.5" /> Sign Lease
                                                </motion.button>
                                            ) : (
                                                <>
                                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                                        onClick={() => navigate('/pay-now', { state: { propertyId: activeLease.property?._id } })}
                                                        disabled={activeLease.status === 'pending'}
                                                        className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white font-bold text-xs shadow-md hover:opacity-90 transition-all", activeLease.status === 'pending' ? "bg-muted text-muted-foreground/45 cursor-not-allowed shadow-none" : "bg-gradient-to-r from-emerald-600 to-teal-600")}
                                                    >
                                                        <Wallet className="w-3.5 h-3.5" /> {t('dashboard.payRent')}
                                                    </motion.button>
                                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                                        onClick={() => navigate('/maintenance', { state: { propertyId: activeLease.property?._id } })}
                                                        disabled={activeLease.status === 'pending'}
                                                        className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-muted-foreground font-bold text-xs hover:bg-muted transition-all", activeLease.status === 'pending' ? "opacity-40 cursor-not-allowed hover:bg-transparent" : "")}
                                                    >
                                                        <Wrench className="w-3.5 h-3.5" /> {t('dashboard.reportIssue')}
                                                    </motion.button>
                                                </>
                                            )}
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
                            <button onClick={() => navigate('/browse')} className="mt-2 text-xs font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1 mx-auto">
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

            {/* ══ BOOKINGS & DEPOSITS SECTION ══ */}
            {bookings.length > 0 && (
                <div className="space-y-3 pt-3">
                    <h3 className="text-xs font-black text-muted-foreground/45 uppercase tracking-widest px-1">Booking Requests & Deposits</h3>

                    {/* Booking Stats Summary Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between shadow-sm">
                            <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none mb-2">Pending</span>
                            <span className="text-xl font-black text-amber-500 leading-none">{pendingTenantBookings.length}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between shadow-sm">
                            <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none mb-2">Approved</span>
                            <span className="text-xl font-black text-indigo-500 leading-none">{approvedTenantBookings.length}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between shadow-sm">
                            <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none mb-2">Upcoming Move-ins</span>
                            <span className="text-xl font-black text-emerald-500 leading-none">{upcomingMoveIns.length}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between shadow-sm">
                            <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none mb-2">History</span>
                            <span className="text-xl font-black text-muted-foreground/60 leading-none">{historicalBookings.length}</span>
                        </div>
                    </div>
                    
                    <div className="relative group/stack">
                        {/* 3D Card Stack visual deck effect when collapsed */}
                        {!bookingsStackOpen && bookings.length > 1 && (
                            <>
                                <div className="absolute inset-0 bg-card/25 border border-border/80 rounded-2xl translate-x-1.5 translate-y-1.5 scale-[0.98] blur-[0.5px] transition-transform duration-300 group-hover/stack:translate-x-2 group-hover/stack:translate-y-2 z-0" />
                                {bookings.length > 2 && (
                                    <div className="absolute inset-0 bg-card/10 border border-border/60 rounded-2xl translate-x-3 translate-y-3 scale-[0.96] blur-[1px] transition-transform duration-300 group-hover/stack:translate-x-4 group-hover/stack:translate-y-4 z-0" />
                                )}
                            </>
                        )}

                        {/* Main Stack Trigger Card */}
                        <button
                            onClick={() => setBookingsStackOpen(!bookingsStackOpen)}
                            className="relative z-10 w-full bg-card/60 backdrop-blur-md border border-border hover:border-border/80 rounded-2xl p-5 shadow-lg flex items-center justify-between text-left group transition-all duration-300 hover:-translate-y-0.5"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 group-hover:text-primary transition-colors">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-foreground">Active Booking Requests</h4>
                                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 uppercase tracking-wider font-bold">
                                        {bookings.length} request{bookings.length > 1 ? 's' : ''} in total
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase text-muted-foreground/40 hidden sm:inline">
                                    {bookingsStackOpen ? 'Hide List' : 'Reveal Stack'}
                                </span>
                                <ChevronDown className={cn("w-4 h-4 text-muted-foreground/60 transition-transform duration-300", bookingsStackOpen && "rotate-180")} />
                            </div>
                        </button>

                        {/* Expanded Content list */}
                        <AnimatePresence>
                            {bookingsStackOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    className="overflow-hidden space-y-3 pt-3"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-1">
                                        {bookings.map((b) => {
                                            const statusDisplay = getBookingStatusDisplay(b);
                                            return (
                                                <div
                                                    key={b._id}
                                                    className="relative overflow-hidden p-4 rounded-xl border border-border/50 bg-gradient-to-b from-card/60 to-card/30 backdrop-blur-md hover:border-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col justify-between min-h-[145px] shadow-sm group hover:-translate-y-0.5"
                                                >
                                                    {/* Glowing corner aura */}
                                                    <div className="absolute -top-16 -right-16 w-32 h-32 bg-indigo-500/10 blur-2xl rounded-full group-hover:scale-125 transition-transform duration-500" />
                                                    
                                                    {/* Top Header: Badge + Ref */}
                                                    <div className="flex items-center justify-between mb-2 z-10">
                                                        <span className={cn("px-2 py-0.5 rounded-lg border text-[7.5px] font-black uppercase tracking-wider", statusDisplay.class)}>
                                                            {statusDisplay.label}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-muted-foreground/45 tracking-wider">
                                                            REF: #{b._id.slice(-6).toUpperCase()}
                                                        </span>
                                                    </div>

                                                    {/* Middle: Title & Dates */}
                                                    <div className="mb-3 z-10">
                                                        <h4 className="text-xs font-black text-foreground truncate group-hover:text-indigo-400 transition-colors leading-tight mb-1">{b.property?.name || 'Property Booked'}</h4>
                                                        <p className="text-[9px] text-muted-foreground/60 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3 text-muted-foreground/45" />
                                                            {new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()}
                                                        </p>
                                                    </div>

                                                    {/* Bottom: Deposit Amount & Compact Action */}
                                                    <div className="flex items-end justify-between pt-2.5 border-t border-border/40 z-10">
                                                        <div className="flex flex-col">
                                                            <span className="text-[7.5px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none mb-1">Security Deposit</span>
                                                            <span className="text-xs font-black text-indigo-400 leading-none">
                                                                ₹{(b.depositAmount || (b.property?.rentAmount * 2) || 0).toLocaleString('en-IN')}
                                                            </span>
                                                        </div>
                                                        {statusDisplay.isPayable ? (
                                                            <button
                                                                onClick={() => navigate(`/bookings/${b._id}`)}
                                                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[9px] uppercase tracking-widest shadow-md hover:shadow-indigo-600/15 flex items-center gap-1 active:scale-95 transition-all"
                                                            >
                                                                <Wallet className="w-3 h-3" /> Pay Deposit
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => navigate(`/bookings/${b._id}`)}
                                                                className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground/75 font-black text-[9px] uppercase tracking-widest hover:bg-muted active:scale-95 transition-all"
                                                            >
                                                                View Details
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}

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
                        {payments.filter(p => ['pending', 'overdue', 'partially_paid', 'generated'].includes(p.status)).length > 0 ? (
                            payments.filter(p => ['pending', 'overdue', 'partially_paid', 'generated'].includes(p.status)).map((p) => {
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
                                                    ₹{(p.amountDue !== undefined ? (p.amountDue - p.amountPaid) : p.amount).toLocaleString('en-IN')} pending
                                                </p>
                                                <p className="text-[9px] text-muted-foreground mt-0.5">
                                                    Due: {new Date(p.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => navigate(`/pay-now?billId=${p._id}`)}
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
                    className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-foreground flex items-center gap-2">
                            Action Center Log
                            {unread > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">{unread}</span>
                            )}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate('/action-center')}
                                className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:text-emerald-300 transition-all flex items-center gap-1 text-[10px] font-black cursor-pointer"
                            >
                                Manage Actions
                                <ArrowRight className="w-3 h-3" />
                            </button>
                            <button
                                onClick={() => setShowCalendar(!showCalendar)}
                                className={cn(
                                    "p-1.5 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-bold border",
                                    showCalendar 
                                        ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                                        : "bg-muted/40 border-border text-muted-foreground/80 hover:text-foreground"
                                )}
                                title="Filter by Date"
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Calendar</span>
                            </button>
                        </div>
                    </div>

                    {/* Inline Calendar Drawer */}
                    <AnimatePresence>
                        {showCalendar && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden border border-border/60 bg-muted/20 rounded-xl p-3"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[11px] font-bold text-foreground">
                                        {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={handlePrevMonth} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={handleNextMonth} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-muted-foreground/50 mb-2">
                                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: getFirstDayOfMonth(calendarMonth) }).map((_, i) => (
                                        <div key={`empty-${i}`} />
                                    ))}
                                    {Array.from({ length: getDaysInMonth(calendarMonth) }).map((_, i) => {
                                        const day = i + 1;
                                        const dayDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                                        const dateStr = getLocalDateString(dayDate);
                                        const hasRecords = recordDates.has(dateStr);
                                        const isSelected = selectedDate === dateStr;
                                        const isToday = getLocalDateString(new Date()) === dateStr;

                                        return (
                                            <button
                                                key={day}
                                                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                                                className={cn(
                                                    "relative flex flex-col items-center justify-center h-7 rounded-lg text-[10px] font-medium transition-all",
                                                    isSelected 
                                                        ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/25" 
                                                        : isToday
                                                            ? "border border-indigo-500/30 text-indigo-400 font-bold bg-indigo-500/5"
                                                            : "text-foreground/80 hover:bg-muted/70",
                                                    hasRecords && !isSelected && "font-bold text-foreground"
                                                )}
                                            >
                                                <span>{day}</span>
                                                {hasRecords && (
                                                    <span className={cn(
                                                        "absolute bottom-0.5 w-1 h-1 rounded-full",
                                                        isSelected ? "bg-white" : "bg-indigo-500"
                                                    )} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {selectedDate && (
                                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/40 text-[9px]">
                                        <span className="text-muted-foreground">
                                            Filtered: <strong className="text-foreground">{new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                                        </span>
                                        <button 
                                            onClick={() => setSelectedDate(null)}
                                            className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
                                        >
                                            Show All
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Stacked Messages Cards List */}
                    {displayedNotifications.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground/30 text-xs">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            {selectedDate ? "No records found for this date." : "No messages or events yet."}
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                            {displayedNotifications.slice(0, 15).map((n) => {
                                // Dynamic Event Icon mapping
                                let IconComp = Bell;
                                let iconColorClass = 'text-gray-400 bg-gray-500/10 border-gray-500/20';
                                
                                if (n.type === 'message' || n.relatedModel === 'Message') {
                                    IconComp = MessageSquare;
                                    iconColorClass = 'text-sky-500 bg-sky-500/10 border-sky-500/20';
                                } else if (n.type?.startsWith('payment') || n.relatedModel === 'Payment') {
                                    IconComp = CreditCard;
                                    if (n.type === 'payment_overdue') {
                                        iconColorClass = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
                                    } else if (n.type === 'payment_received') {
                                        iconColorClass = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
                                    } else {
                                        iconColorClass = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
                                    }
                                } else if (n.type?.startsWith('maintenance') || n.relatedModel === 'Maintenance') {
                                    IconComp = Wrench;
                                    iconColorClass = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
                                } else if (n.type?.startsWith('lease') || n.relatedModel === 'Lease') {
                                    IconComp = FileSignature;
                                    iconColorClass = 'text-purple-500 bg-purple-500/10 border-purple-500/20';
                                } else if (n.type === 'booking') {
                                    IconComp = Building2;
                                    iconColorClass = 'text-teal-500 bg-teal-500/10 border-teal-500/20';
                                } else if (n.type === 'success') {
                                    IconComp = CheckCircle2;
                                    iconColorClass = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
                                } else if (n.type === 'alert') {
                                    IconComp = AlertTriangle;
                                    iconColorClass = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
                                }

                                // Priority determination
                                let priorityBadge = null;
                                const lowerTitle = (n.title || '').toLowerCase();
                                const lowerMsg = (n.message || '').toLowerCase();
                                const isHighPriority = n.type === 'payment_overdue' || n.type === 'alert' || lowerTitle.includes('urgent') || lowerTitle.includes('overdue') || lowerTitle.includes('rejected') || lowerMsg.includes('urgent');
                                const isMediumPriority = n.type === 'payment_due' || n.type === 'maintenance_update' || lowerTitle.includes('pending') || lowerTitle.includes('action');
                                
                                if (isHighPriority) {
                                    priorityBadge = <span className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[8px] font-black uppercase">High</span>;
                                } else if (isMediumPriority) {
                                    priorityBadge = <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-black uppercase">Medium</span>;
                                }

                                return (
                                    <div 
                                        key={n._id} 
                                        id={`notif-card-${n._id}`}
                                        onClick={async () => {
                                            if (!n.isRead && !n.read) {
                                                try {
                                                    await notificationService.markRead(n._id);
                                                    setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, read: true, isRead: true } : item));
                                                    setUnread(c => Math.max(0, c - 1));
                                                } catch (err) {
                                                    console.error('Failed to mark read', err);
                                                }
                                            }
                                            handleAction(n);
                                        }}
                                        className={cn(
                                            'flex items-start justify-between gap-3 p-3 rounded-xl border border-border transition-all duration-200 cursor-pointer hover:bg-muted/45 relative group/item', 
                                            n.read ? 'bg-card/50 opacity-75' : 'bg-muted/70 shadow-sm border-indigo-500/15'
                                        )}
                                    >
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            {/* Left Icon with color indicator */}
                                            <div className={cn('p-1.5 rounded-lg border flex-shrink-0 mt-0.5', iconColorClass.split(' ').slice(1).join(' '))}>
                                                <IconComp className={cn('w-4 h-4', iconColorClass.split(' ')[0])} />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="text-xs font-black text-foreground/90 truncate">{n.title}</p>
                                                    {priorityBadge}
                                                    {!n.read && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse flex-shrink-0" />
                                                    )}
                                                </div>
                                                <motion.p 
                                                    layout
                                                    className={cn(
                                                        "text-[10px] text-muted-foreground mt-0.5 leading-relaxed transition-all duration-300", 
                                                        !expandedNotifs[n._id] && "line-clamp-2"
                                                    )}
                                                >
                                                    {n.message}
                                                </motion.p>
                                                
                                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                    <p className="text-[9px] text-muted-foreground/50 flex items-center gap-1 font-bold">
                                                        <span>•</span>
                                                        <span>{formatTimeAgo(n.createdAt)}</span>
                                                    </p>
                                                    
                                                    {n.message?.length > 60 && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedNotifs(prev => ({ ...prev, [n._id]: !prev[n._id] }));
                                                            }}
                                                            className="text-[9px] font-black text-indigo-500 hover:text-indigo-400 flex items-center gap-0.5 uppercase tracking-wider transition-colors"
                                                        >
                                                            {expandedNotifs[n._id] ? (
                                                                <>Collapse <ChevronUp className="w-2.5 h-2.5" /></>
                                                            ) : (
                                                                <>Read More <ChevronDown className="w-2.5 h-2.5" /></>
                                                            )}
                                                        </button>
                                                    )}

                                                    {expandedNotifs[n._id] && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const clickEvent = document.getElementById(`notif-card-${n._id}`);
                                                                if (clickEvent) clickEvent.click();
                                                            }}
                                                            className="text-[9px] font-black text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors"
                                                        >
                                                            View Details
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await handleDeleteNotif(n._id);
                                            }}
                                            className="p-1 rounded-lg text-muted-foreground/30 hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover/item:opacity-100 transition-all flex-shrink-0"
                                            title="Dismiss notification"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
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

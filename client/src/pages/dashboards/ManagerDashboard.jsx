import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Users, Wrench, CreditCard, Plus, ArrowUpRight,
    BarChart3, CalendarDays, CheckCircle2, Clock, XCircle,
    Activity, Check, FileText, UserCheck, RefreshCw, AlertTriangle, Eye, Download, Search, Bell
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { bookingService, visitService, maintenanceService } from '../../services/api';
import { CalendarWidget, WorldClockWidget } from '../../components/dashboard/Widgets';
import PayoutsSection from '../../components/dashboard/PayoutsSection';
import ReportingHubTab from '../../components/dashboard/ReportingHubTab';

function useCounter(end, duration = 2000) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!end) return;
        let startTime = null;
        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [end, duration]);
    return count;
}

// Ring progress chart
function RingChart({ percentage, color, size = 100 }) {
    const RADIUS = 38;
    const CIRCUM = 2 * Math.PI * RADIUS;
    const dash = (percentage / 100) * CIRCUM;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
                <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="currentColor" className="text-muted-foreground/10" strokeWidth="10" />
                <motion.circle
                    cx="50" cy="50" r={RADIUS}
                    fill="none" stroke={color} strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`0 ${CIRCUM}`}
                    animate={{ strokeDasharray: `${dash} ${CIRCUM - dash}` }}
                    transition={{ delay: 0.5, duration: 1.2, ease: 'easeOut' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-foreground">{percentage}%</span>
                <span className="text-[9px] text-muted-foreground font-bold">Occupied</span>
            </div>
        </div>
    );
}

// Bar chart
function BarChartComp({ data, color }) {
    const max = Math.max(...data);
    return (
        <div className="flex items-end gap-1 h-16">
            {data.map((v, i) => (
                <motion.div
                    key={i}
                    className="flex-1 rounded-t-md"
                    style={{ backgroundColor: color, opacity: 0.3 + (v / max) * 0.7 }}
                    initial={{ height: 0 }}
                    animate={{ height: `${(v / max) * 100}%` }}
                    transition={{ delay: 0.7 + i * 0.05, duration: 0.4, ease: 'easeOut' }}
                />
            ))}
        </div>
    );
}

// Stat card as a proper sub-component so hooks are at top level
function ManagerStatCard({ card }) {
    const Icon = card.icon;
    const count = useCounter(card.value);
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: card.delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative group overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-5 hover:border-blue-500/30 transition-all duration-300"
        >
            <div className="flex items-start justify-between mb-4">
                <div className={cn('p-2.5 rounded-xl', card.color)}>
                    <Icon className="w-5 h-5 text-white dark:text-foreground" />
                </div>
                {card.trend && (
                    <span className="text-xs font-bold text-emerald-400">
                        {card.trend}
                    </span>
                )}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{card.title}</p>
            <p className="text-3xl font-black text-foreground tabular-nums">
                {card.title.toLowerCase().includes('payment') || card.title.toLowerCase().includes('revenue') 
                    ? `₹${count.toLocaleString('en-IN')}` 
                    : count}
            </p>
        </motion.div>
    );
}

export default function ManagerDashboard({ stats, loading, navigate }) {
    const [view, setView] = useState('overview');
    const [bookings, setBookings] = useState([]);
    const [bookingLoading, setBookingLoading] = useState(true);
    const [bookingTab, setBookingTab] = useState('pending');
    const [renewals, setRenewals] = useState([]);

    const occupied = stats?.occupiedProperties !== undefined ? stats.occupiedProperties : 46;
    const vacant = stats?.availableProperties !== undefined ? stats.availableProperties : 6;
    const total = occupied + vacant;
    const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;

    const [visits, setVisits] = useState([]);
    const [visitsLoading, setVisitsLoading] = useState(true);
    const [visitTab, setVisitTab] = useState('pending');

    const [reschedulingId, setReschedulingId] = useState(null);
    const [reschedDate, setReschedDate] = useState('');
    const [reschedSlot, setReschedSlot] = useState('10:00 AM - 11:00 AM');

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const res = await bookingService.getManagerBookings();
                setBookings(res.data);
            } catch (e) {
                console.error(e);
            } finally {
                setBookingLoading(false);
            }
        };

        const fetchVisits = async () => {
            try {
                const res = await visitService.getManagerVisits();
                setVisits(res.data);
            } catch (e) {
                console.error(e);
            } finally {
                setVisitsLoading(false);
            }
        };

        const fetchRenewals = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/renewals', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRenewals(res.data.data || res.data || []);
            } catch (e) {
                console.error('Error fetching renewals:', e);
            }
        };

        fetchBookings();
        fetchVisits();
        fetchRenewals();
    }, []);

    const handleUpdateBooking = async (id, status, reason = '') => {
        try {
            await bookingService.updateBookingStatus(id, { status, rejectionReason: reason });
            // Optimistically remove from pending list since we only show pending ones here
            // If we just mapped it to 'approved', it would stay in the list but with wrong status if the list filters by pending.
            // The logic below maps it.
            setBookings(prev => prev.map(b => b._id === id ? { ...b, status } : b));
        } catch (e) {
            console.error(e);
            const errorMsg = e.response?.data?.message || e.message || 'Unknown error';
            alert(`Failed to ${status} booking: ${errorMsg}`);
        }
    };

    const handleUpdateVisit = async (id, status, visitDate = null, timeSlot = '') => {
        try {
            const body = { status };
            if (visitDate) body.visitDate = visitDate;
            if (timeSlot) body.timeSlot = timeSlot;

            const res = await visitService.updateVisitStatus(id, body);
            setVisits(prev => prev.map(v => v._id === id ? res.data : v));
        } catch (e) {
            console.error(e);
            const errorMsg = e.response?.data?.message || e.message || 'Unknown error';
            alert(`Failed to update visit request: ${errorMsg}`);
        }
    };

    const pendingBookings = bookings.filter(b => b.status === 'pending');
    const approvedBookings = bookings.filter(b => b.status === 'approved' && (b.paymentStatus === 'pending' || b.paymentStatus === 'failed'));
    const paidBookings = bookings.filter(b => b.status === 'approved' && b.paymentStatus === 'paid');
    const completedBookings = bookings.filter(b => b.status === 'completed' || b.status === 'active');
    const rejectedBookings = bookings.filter(b => b.status === 'rejected');
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

    const pendingVisits = visits.filter(v => v.status === 'pending');
    const approvedVisits = visits.filter(v => v.status === 'approved');
    const completedVisits = visits.filter(v => v.status === 'completed' || v.status === 'rejected');

    const maintenanceData = [
        { id: 'MT-1342', title: 'Leaking Faucet — Unit 4B', priority: 'high', status: 'open', time: '2h ago' },
        { id: 'MT-1341', title: 'AC Malfunction — Unit 12A', priority: 'medium', status: 'in_progress', time: '5h ago' },
        { id: 'MT-1340', title: 'Power Outage — Lobby', priority: 'emergency', status: 'in_progress', time: '8h ago' },
        { id: 'MT-1339', title: 'Window Repair — Unit 7C', priority: 'low', status: 'resolved', time: '1d ago' },
    ];

    const revenueMonths = [55, 70, 62, 88, 75, 95, 82, 108, 91, 115, 98, 124];

    const statCards = [
        { title: 'Managed Units', value: stats?.totalProperties || 52, icon: Building2, trend: '+2', color: 'bg-blue-500', delay: 0 },
        { title: 'Active Tenants', value: stats?.totalTenants || 88, icon: Users, trend: '+3', color: 'bg-cyan-500', delay: 0.1 },
        { title: 'Booking Requests', value: pendingBookings.length, icon: CalendarDays, trend: pendingBookings.length > 0 ? '↑ New' : '', color: 'bg-indigo-500', delay: 0.2 },
        { title: 'Pending Payments', value: stats?.pendingPayments || 14, icon: CreditCard, color: 'bg-rose-500', delay: 0.3 },
    ];

    const getPriorityStyle = (priority) => ({
        emergency: 'text-rose-500 bg-rose-500/10 border-rose-500/20 dark:text-rose-400',
        high: 'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400',
        medium: 'text-blue-600 bg-blue-500/10 border-blue-500/20 dark:text-blue-400',
        low: 'text-muted-foreground bg-muted border-border',
    }[priority] || '');

    const getStatusStyle = (status) => ({
        open: 'text-amber-500 dark:text-amber-400',
        in_progress: 'text-blue-500 dark:text-blue-400',
        resolved: 'text-emerald-500 dark:text-emerald-400',
    }[status] || '');

    const getStatusLabel = (status) => ({
        open: 'Open',
        in_progress: 'In Progress',
        resolved: 'Resolved',
    }[status] || status);

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center justify-between"
            >
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-400 to-cyan-600" />
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-500/80 dark:text-blue-400">Property Operations</p>
                    </div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight">Operations Hub <span className="text-blue-500/80 dark:text-blue-400">🏢</span></h1>
                    <p className="text-muted-foreground mt-1 font-medium">Manage properties, tenants &amp; maintenance</p>
                </div>
                <div className="hidden md:flex gap-2">
                    <button
                        onClick={() => navigate('/tenants')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/5 border border-blue-500/20 text-blue-600 dark:text-blue-300 text-sm font-bold hover:bg-blue-500/10 transition-all"
                    >
                        <Users className="w-4 h-4" /> Tenants
                    </button>
                    <button
                        onClick={() => navigate('/properties')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg"
                    >
                        <Plus className="w-4 h-4" /> Add Property
                    </button>
                </div>
            </motion.div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted/50 border border-border w-fit">
                <button
                    onClick={() => setView('overview')}
                    className={cn(
                        "px-6 py-2 rounded-xl text-xs font-black transition-all",
                        view === 'overview' ? "bg-white text-blue-600 shadow-sm dark:bg-card dark:text-blue-400" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    OVERVIEW
                </button>
                <button
                    onClick={() => setView('maintenance')}
                    className={cn(
                        "px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
                        view === 'maintenance' ? "bg-white text-amber-600 shadow-sm dark:bg-card dark:text-amber-400" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Wrench className="w-3.5 h-3.5" /> MAINTENANCE QUEUE &amp; DASHBOARD
                </button>
                <button
                    onClick={() => setView('financials')}
                    className={cn(
                        "px-6 py-2 rounded-xl text-xs font-black transition-all",
                        view === 'financials' ? "bg-white text-blue-600 shadow-sm dark:bg-card dark:text-blue-400" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    FINANCIALS &amp; PAYOUTS
                </button>
                <button
                    onClick={() => setView('reporting')}
                    className={cn(
                        "px-6 py-2 rounded-xl text-xs font-black transition-all",
                        view === 'reporting' ? "bg-white text-blue-600 shadow-sm dark:bg-card dark:text-blue-400" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    REPORTING HUB
                </button>
            </div>

            {view === 'overview' ? (
                <>
                    {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => (
                    <ManagerStatCard key={card.title} card={card} />
                ))}
            </div>

            {/* Charts + Occupancy */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Revenue Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="lg:col-span-2 rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-5"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Monthly Collections</p>
                            <p className="text-2xl font-black text-foreground">$47,820 <span className="text-sm text-emerald-500 font-bold">↑ 8%</span></p>
                        </div>
                        <div className="p-2 rounded-xl bg-blue-500/20">
                            <BarChart3 className="w-5 h-5 text-blue-400" />
                        </div>
                    </div>
                    <BarChartComp data={revenueMonths} color="var(--primary)" />
                    <div className="flex gap-0.5 mt-2">
                        {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => (
                            <span key={i} className="flex-1 text-center text-[8px] text-muted-foreground/30 font-bold">{m}</span>
                        ))}
                    </div>
                </motion.div>

                {/* Occupancy Ring */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-5 flex flex-col"
                >
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-4">Unit Occupancy</p>
                    <div className="flex flex-col items-center gap-4 flex-1 justify-center">
                        <RingChart percentage={pct} color="#3b82f6" size={120} />
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <div className="text-center p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 dark:bg-blue-500/10">
                                <p className="text-lg font-black text-foreground">{occupied}</p>
                                <p className="text-[9px] text-blue-500/80 dark:text-blue-300/60 font-black uppercase">Occupied</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-muted border border-border">
                                <p className="text-lg font-black text-foreground">{vacant}</p>
                                <p className="text-[9px] text-muted-foreground font-black uppercase">Vacant</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Widgets Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="h-64 lg:col-span-1">
                    <CalendarWidget />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="h-64 lg:col-span-1">
                    <WorldClockWidget />
                </motion.div>
            </div>

            {/* Booking Requests */}
            {/* Booking Requests & Deposits */}
            {bookings.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55, duration: 0.5 }}
                    className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-5"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-border pb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20">
                                <CalendarDays className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                            </div>
                            <p className="text-sm font-black text-foreground">Booking Requests & Deposits</p>
                        </div>
                        <div className="flex gap-1.5 p-1 rounded-xl bg-muted/65 w-fit self-start sm:self-auto overflow-x-auto scrollbar-none">
                            {[
                                { id: 'pending', label: 'Pending', count: pendingBookings.length },
                                { id: 'approved', label: 'Awaiting Deposit', count: approvedBookings.length },
                                { id: 'paid', label: 'Deposit Paid', count: paidBookings.length },
                                { id: 'completed', label: 'Completed', count: completedBookings.length },
                                { id: 'rejected', label: 'Rejected', count: rejectedBookings.length },
                                { id: 'cancelled', label: 'Cancelled', count: cancelledBookings.length }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setBookingTab(tab.id)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap",
                                        bookingTab === tab.id
                                            ? "bg-card text-foreground shadow-sm"
                                            : "text-muted-foreground/60 hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded-full text-[8px] font-black",
                                            bookingTab === tab.id ? "bg-indigo-600 text-white" : "bg-muted-foreground/20 text-muted-foreground"
                                        )}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {bookingTab === 'pending' && (
                            pendingBookings.length === 0 ? (
                                <div className="col-span-full text-center py-8 text-muted-foreground/30 text-sm">
                                    No pending booking requests.
                                </div>
                            ) : (
                                pendingBookings.map((b, i) => (
                                    <motion.div
                                        key={b._id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="p-4 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition-all cursor-pointer"
                                        onClick={() => navigate(`/bookings/${b._id}`)}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 font-black text-xs">
                                                    {b.user?.firstName?.[0]}{b.user?.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">{b.user?.firstName} {b.user?.lastName}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{b.property?.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-indigo-500 dark:text-indigo-400">
                                                    {b.totalAmount === 0 ? 'FREE' : `₹${b.totalAmount?.toLocaleString('en-IN')}`}
                                                </p>
                                                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                                                    {b.paymentStatus || 'Pending'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleUpdateBooking(b._id, 'approved')}
                                                className="flex-1 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all"
                                            >
                                                APPROVE
                                            </button>
                                            <button
                                                onClick={() => handleUpdateBooking(b._id, 'rejected', 'Property already booked')}
                                                className="flex-1 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black hover:bg-rose-500 hover:text-white transition-all"
                                            >
                                                DECLINE
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )
                        )}

                        {bookingTab === 'approved' && (
                            approvedBookings.length === 0 ? (
                                <div className="col-span-full text-center py-8 text-muted-foreground/30 text-sm">
                                    No bookings awaiting deposit payment.
                                </div>
                            ) : (
                                approvedBookings.map((b, i) => (
                                    <motion.div
                                        key={b._id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="p-4 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition-all cursor-pointer"
                                        onClick={() => navigate(`/bookings/${b._id}`)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400 font-black text-xs">
                                                    {b.user?.firstName?.[0]}{b.user?.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">{b.user?.firstName} {b.user?.lastName}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{b.property?.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-wider block mb-1">
                                                    Awaiting Deposit
                                                </span>
                                                <p className="text-xs font-black text-indigo-500 dark:text-indigo-400">
                                                    ₹{b.totalAmount?.toLocaleString('en-IN')}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )
                        )}

                        {bookingTab === 'paid' && (
                            paidBookings.length === 0 ? (
                                <div className="col-span-full text-center py-8 text-muted-foreground/30 text-sm">
                                    No bookings with paid deposit.
                                </div>
                            ) : (
                                paidBookings.map((b, i) => (
                                    <motion.div
                                        key={b._id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="p-4 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition-all cursor-pointer"
                                        onClick={() => navigate(`/bookings/${b._id}`)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 font-black text-xs">
                                                    {b.user?.firstName?.[0]}{b.user?.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">{b.user?.firstName} {b.user?.lastName}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{b.property?.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase tracking-wider block mb-1">
                                                    Deposit Paid
                                                </span>
                                                <p className="text-xs font-black text-indigo-500 dark:text-indigo-400">
                                                    ₹{b.totalAmount?.toLocaleString('en-IN')}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )
                        )}

                        {bookingTab === 'completed' && (
                            completedBookings.length === 0 ? (
                                <div className="col-span-full text-center py-8 text-muted-foreground/30 text-sm">
                                    No completed/active bookings.
                                </div>
                            ) : (
                                completedBookings.map((b, i) => (
                                    <motion.div
                                        key={b._id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="p-4 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition-all cursor-pointer"
                                        onClick={() => navigate(`/bookings/${b._id}`)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400 font-black text-xs">
                                                    {b.user?.firstName?.[0]}{b.user?.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">{b.user?.firstName} {b.user?.lastName}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{b.property?.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[8px] font-black uppercase tracking-wider block mb-1">
                                                    Completed
                                                </span>
                                                <p className="text-xs font-black text-indigo-500 dark:text-indigo-400">
                                                    ₹{b.totalAmount?.toLocaleString('en-IN')}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )
                        )}

                        {bookingTab === 'rejected' && (
                            rejectedBookings.length === 0 ? (
                                <div className="col-span-full text-center py-8 text-muted-foreground/30 text-sm">
                                    No rejected bookings.
                                </div>
                            ) : (
                                rejectedBookings.map((b, i) => (
                                    <motion.div
                                        key={b._id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="p-4 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition-all cursor-pointer"
                                        onClick={() => navigate(`/bookings/${b._id}`)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400 font-black text-xs">
                                                    {b.user?.firstName?.[0]}{b.user?.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">{b.user?.firstName} {b.user?.lastName}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{b.property?.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[8px] font-black uppercase tracking-wider block mb-1">
                                                    Rejected
                                                </span>
                                                <p className="text-[9px] text-muted-foreground truncate max-w-[150px] font-bold text-right text-rose-400">
                                                    {b.rejectionReason || 'No reason'}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )
                        )}

                        {bookingTab === 'cancelled' && (
                            cancelledBookings.length === 0 ? (
                                <div className="col-span-full text-center py-8 text-muted-foreground/30 text-sm">
                                    No cancelled bookings.
                                </div>
                            ) : (
                                cancelledBookings.map((b, i) => (
                                    <motion.div
                                        key={b._id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="p-4 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition-all cursor-pointer"
                                        onClick={() => navigate(`/bookings/${b._id}`)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-500/10 dark:bg-gray-500/20 flex items-center justify-center text-gray-500 dark:text-gray-400 font-black text-xs">
                                                    {b.user?.firstName?.[0]}{b.user?.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">{b.user?.firstName} {b.user?.lastName}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{b.property?.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="px-2 py-0.5 rounded bg-gray-500/10 border border-gray-500/20 text-gray-500 text-[8px] font-black uppercase tracking-wider block mb-1">
                                                    Cancelled
                                                </span>
                                                <p className="text-[9px] text-muted-foreground truncate max-w-[150px] font-bold text-right text-muted-foreground/60">
                                                    {b.cancellationReason || 'No reason'}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )
                        )}
                    </div>
                </motion.div>
            )}
            {/* Lease Renewals Section */}
            {renewals.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.56, duration: 0.5 }}
                    className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-5 space-y-4 mb-6"
                >
                    <div className="flex items-center gap-2 border-b border-border pb-4">
                        <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20">
                            <CalendarDays className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                        </div>
                        <p className="text-sm font-black text-foreground">Lease Renewals & Offers</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renewals.map((r) => (
                            <div key={r._id} className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col justify-between gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{r.tenant?.firstName} {r.tenant?.lastName}</p>
                                        <p className="text-xs text-muted-foreground">{r.property?.name}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            Proposed Period: {new Date(r.requestedStartDate).toLocaleDateString()} - {new Date(r.requestedEndDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                                        r.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                        r.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                        'bg-rose-500/10 text-rose-500'
                                    )}>
                                        {r.status}
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    {r.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const token = localStorage.getItem('token');
                                                        await axios.put(`/api/renewals/${r._id}/approve`, {}, {
                                                            headers: { Authorization: `Bearer ${token}` }
                                                        });
                                                        alert('Renewal approved successfully!');
                                                        window.location.reload();
                                                    } catch (e) {
                                                        alert(e.response?.data?.message || 'Failed to approve renewal');
                                                    }
                                                }}
                                                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const reason = prompt('Reason for rejection:');
                                                    if (!reason) return;
                                                    try {
                                                        const token = localStorage.getItem('token');
                                                        await axios.put(`/api/renewals/${r._id}/reject`, { rejectionReason: reason }, {
                                                            headers: { Authorization: `Bearer ${token}` }
                                                        });
                                                        alert('Renewal rejected.');
                                                        window.location.reload();
                                                    } catch (e) {
                                                        alert(e.response?.data?.message || 'Failed to reject renewal');
                                                    }
                                                }}
                                                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-all"
                                            >
                                                Reject
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Property Visit Requests */}
            {visits.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.58, duration: 0.5 }}
                    className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-5 space-y-4"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/20">
                                <CalendarDays className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                            </div>
                            <p className="text-sm font-black text-foreground">Property Inspection Visits</p>
                        </div>
                        <div className="flex gap-1.5 p-1 rounded-xl bg-muted/65 w-fit self-start sm:self-auto">
                            {[
                                { id: 'pending', label: 'Pending Requests', count: pendingVisits.length },
                                { id: 'approved', label: 'Scheduled Visits', count: approvedVisits.length },
                                { id: 'completed', label: 'Past & Feedback', count: completedVisits.length }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setVisitTab(tab.id)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                                        visitTab === tab.id
                                            ? "bg-card text-foreground shadow-sm"
                                            : "text-muted-foreground/60 hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px] font-bold">
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {visitTab === 'pending' && (
                            pendingVisits.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-8">No pending property visit requests.</p>
                            ) : (
                                pendingVisits.map(v => (
                                    <div key={v._id} className="p-4 rounded-xl bg-white/3 border border-white/5 space-y-3">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                            <div>
                                                <h4 className="text-sm font-bold text-foreground">{v.property?.name}</h4>
                                                <p className="text-xs text-muted-foreground">{v.property?.address}</p>
                                                <p className="text-xs text-indigo-400 mt-1 font-semibold">
                                                    Requested Date: {new Date(v.visitDate).toLocaleDateString()} at {v.timeSlot}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    Tenant: {v.tenant?.firstName} {v.tenant?.lastName} ({v.tenant?.email})
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => handleUpdateVisit(v._id, 'approved')}
                                                    className="px-2.5 py-1 rounded bg-emerald-500 text-white text-[10px] font-black uppercase hover:bg-emerald-600 transition-all"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateVisit(v._id, 'rejected')}
                                                    className="px-2.5 py-1 rounded bg-rose-500 text-white text-[10px] font-black uppercase hover:bg-rose-600 transition-all"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setReschedulingId(v._id);
                                                        setReschedDate(v.visitDate ? new Date(v.visitDate).toISOString().split('T')[0] : '');
                                                        setReschedSlot(v.timeSlot || '10:00 AM - 11:00 AM');
                                                    }}
                                                    className="px-2.5 py-1 rounded bg-blue-500 text-white text-[10px] font-black uppercase hover:bg-blue-600 transition-all"
                                                >
                                                    Reschedule
                                                </button>
                                            </div>
                                        </div>

                                        {reschedulingId === v._id && (
                                            <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3 mt-2">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-white/80">Select New Slot</p>
                                                <div className="flex flex-wrap gap-3">
                                                    <div className="flex-1 min-w-[120px]">
                                                        <label className="text-[9px] text-white/50 block mb-1">Date</label>
                                                        <input
                                                            type="date"
                                                            value={reschedDate}
                                                            onChange={(e) => setReschedDate(e.target.value)}
                                                            className="w-full bg-black/40 border border-white/10 rounded p-1.5 text-xs text-white"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-[150px]">
                                                        <label className="text-[9px] text-white/50 block mb-1">Time Slot</label>
                                                        <select
                                                            value={reschedSlot}
                                                            onChange={(e) => setReschedSlot(e.target.value)}
                                                            className="w-full bg-black border border-white/10 rounded p-1.5 text-xs text-white"
                                                        >
                                                            {['10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM', '04:00 PM - 05:00 PM'].map(slot => (
                                                                <option key={slot} value={slot}>{slot}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => setReschedulingId(null)}
                                                        className="px-2 py-1 rounded bg-white/10 text-white text-[9px] font-bold uppercase"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            await handleUpdateVisit(v._id, 'approved', reschedDate, reschedSlot);
                                                            setReschedulingId(null);
                                                        }}
                                                        className="px-2.5 py-1 rounded bg-indigo-600 text-white text-[9px] font-black uppercase"
                                                    >
                                                        Confirm & Approve
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )
                        )}

                        {visitTab === 'approved' && (
                            approvedVisits.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-8">No scheduled inspection visits.</p>
                            ) : (
                                approvedVisits.map(v => (
                                    <div key={v._id} className="p-4 rounded-xl bg-white/3 border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <div>
                                            <h4 className="text-sm font-bold text-foreground">{v.property?.name}</h4>
                                            <p className="text-xs text-muted-foreground">{v.property?.address}</p>
                                            <p className="text-xs text-emerald-400 mt-1 font-semibold">
                                                Scheduled: {new Date(v.visitDate).toLocaleDateString()} at {v.timeSlot}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                Tenant: {v.tenant?.firstName} {v.tenant?.lastName} ({v.tenant?.email})
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleUpdateVisit(v._id, 'completed')}
                                            className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase transition-all"
                                        >
                                            Mark Completed
                                        </button>
                                    </div>
                                ))
                            )
                        )}

                        {visitTab === 'completed' && (
                            completedVisits.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-8">No past inspection visits.</p>
                            ) : (
                                completedVisits.map(v => (
                                    <div key={v._id} className="p-4 rounded-xl bg-white/3 border border-white/5 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-sm font-bold text-foreground">{v.property?.name}</h4>
                                                <p className="text-xs text-muted-foreground">{v.property?.address}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    Tenant: {v.tenant?.firstName} {v.tenant?.lastName}
                                                </p>
                                            </div>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                                                v.status === 'completed' ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border border-rose-500/20 text-rose-500"
                                            )}>
                                                {v.status}
                                            </span>
                                        </div>

                                        {v.feedback && v.feedback.rating ? (
                                            <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-[11px] space-y-1.5">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-indigo-400">Feedback: {v.feedback.rating} ⭐️</span>
                                                    <span className="text-[9px] text-muted-foreground">Recommend: {v.feedback.recommend ? '✅ Yes' : '❌ No'}</span>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px] text-muted-foreground pt-1 border-t border-white/5">
                                                    <span>Condition: {v.feedback.propertyCondition}/5</span>
                                                    <span>Manager: {v.feedback.managerExperience}/5</span>
                                                    <span>Cleanliness: {v.feedback.cleanliness}/5</span>
                                                    <span>Location: {v.feedback.locationSatisfaction}/5</span>
                                                </div>
                                                {v.feedback.comments && (
                                                    <p className="text-white/70 italic mt-1 font-medium bg-white/2 p-2 rounded">
                                                        "{v.feedback.comments}"
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            v.status === 'completed' && (
                                                <p className="text-[10px] text-muted-foreground italic">Awaiting tenant review submission...</p>
                                            )
                                        )}
                                        {v.notInterested && (
                                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold inline-block">
                                                Not Interested post-visit
                                            </span>
                                        )}
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </motion.div>
            )}

            {/* Maintenance Tickets */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-5"
            >
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/20">
                            <Wrench className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                        </div>
                        <p className="text-sm font-black text-foreground">Maintenance Tickets</p>
                    </div>
                    <button
                        onClick={() => navigate('/maintenance')}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                        View All <ArrowUpRight className="w-3 h-3" />
                    </button>
                </div>
                <div className="space-y-2">
                    {maintenanceData.map((ticket, i) => (
                        <motion.div
                            key={ticket.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 + i * 0.08 }}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/3 hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn('px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase', getPriorityStyle(ticket.priority))}>
                                    {ticket.priority === 'emergency' ? '⚡ URGENT' : ticket.priority}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground/80 group-hover:text-foreground transition-colors">{ticket.title}</p>
                                    <p className="text-[10px] text-muted-foreground">{ticket.id} • {ticket.time}</p>
                                </div>
                            </div>
                            <span className={cn('text-xs font-bold', getStatusStyle(ticket.status))}>
                                {getStatusLabel(ticket.status)}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
                {[
                    { label: 'View Payments', icon: CreditCard, path: '/payments', color: 'from-blue-600 to-blue-700' },
                    { label: 'View Leases', icon: CalendarDays, path: '/leases', color: 'from-cyan-600 to-cyan-700' },
                    { label: 'All Tenants', icon: Users, path: '/tenants', color: 'from-sky-600 to-sky-700' },
                    { label: 'Properties', icon: Building2, path: '/properties', color: 'from-indigo-600 to-indigo-700' },
                ].map((action, i) => {
                    const Icon = action.icon;
                    return (
                        <motion.button
                            key={action.label}
                            whileHover={{ y: -4, scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate(action.path)}
                            className={cn('flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br text-white font-bold text-sm shadow-lg transition-all', action.color)}
                        >
                            <Icon className="w-5 h-5" />
                            {action.label}
                        </motion.button>
                    );
                })}
            </motion.div>
                </>
             ) : view === 'maintenance' ? (
 <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
 <ManagerMaintenanceView navigate={navigate} />
 </motion.div>
) : view === 'financials' ? (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <PayoutsSection />
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <ReportingHubTab />
                </motion.div>
            )}
        </div>
    );
}

function SLACountdown({ createdAt, priority, status }) {
    const [timeLeft, setTimeLeft] = useState('');
    const [isBreached, setIsBreached] = useState(false);

    useEffect(() => {
        if (status === 'completed' || status === 'resolved' || status === 'closed' || status === 'cancelled') {
            setTimeLeft('Resolved');
            setIsBreached(false);
            return;
        }

        const slaMinutes = priority === 'emergency' ? 30 : priority === 'high' ? 120 : priority === 'medium' ? 480 : 1440;
        const targetTime = new Date(createdAt || Date.now()).getTime() + slaMinutes * 60000;

        const updateTimer = () => {
            const diff = targetTime - Date.now();
            if (diff <= 0) {
                const overdueMins = Math.abs(Math.floor(diff / 60000));
                setTimeLeft(`Overdue ${overdueMins}m`);
                setIsBreached(true);
            } else {
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${mins}m ${secs}s`);
                setIsBreached(false);
            }
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [createdAt, priority, status]);

    return (
        <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-black font-mono tracking-wider flex items-center gap-1 w-fit",
            isBreached ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
        )}>
            <Clock className="w-3 h-3" /> {timeLeft}
        </span>
    );
}

function AnimatedCardTimeline({ status }) {
    const stageMap = {
        open: 1, submitted: 1, manager_review: 1,
        technician_assigned: 2, visit_scheduled: 2,
        technician_en_route: 3, work_started: 3, waiting_parts: 3, in_progress: 3,
        completed: 4, resolved: 4, closed: 4, cancelled: 0
    };

    const currentStage = stageMap[status] || 1;
    const isCancelled = status === 'cancelled';
    const pct = isCancelled ? 100 : currentStage === 1 ? 25 : currentStage === 2 ? 50 : currentStage === 3 ? 75 : 100;

    const stages = [
        { num: 1, label: 'Submitted', icon: FileText },
        { num: 2, label: 'Assigned', icon: UserCheck },
        { num: 3, label: 'In Work', icon: Wrench },
        { num: 4, label: 'Resolved', icon: CheckCircle2 }
    ];

    return (
        <div className="space-y-2 py-1.5 bg-muted/20 p-2.5 rounded-2xl border border-border/40">
            <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-muted-foreground/80 uppercase tracking-widest text-[9px] flex items-center gap-1">
                    <Activity className="w-3 h-3 text-amber-500 animate-spin" /> Live Status Timeline
                </span>
                <span className="font-mono text-amber-500 font-extrabold">{pct}% Progress</span>
            </div>

            <div className="relative w-full h-2 rounded-full bg-muted/60 overflow-hidden p-0.5 border border-border/40">
                <motion.div 
                    initial={{ width: '0%' }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={cn(
                        "h-full rounded-full transition-all shadow-sm",
                        isCancelled
                            ? "bg-rose-500"
                            : "bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500"
                    )}
                />
            </div>

            <div className="grid grid-cols-4 gap-1 pt-1">
                {stages.map((st) => {
                    const Icon = st.icon;
                    const isDone = currentStage > st.num;
                    const isActive = currentStage === st.num && !isCancelled;

                    return (
                        <div key={st.num} className="flex flex-col items-center gap-1 text-center">
                            <motion.div
                                animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                                transition={isActive ? { repeat: Infinity, duration: 2 } : {}}
                                className={cn(
                                    "w-6 h-6 rounded-full border flex items-center justify-center transition-all text-[10px]",
                                    isDone
                                        ? "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20"
                                        : isActive
                                        ? "bg-amber-500 text-white border-amber-300 ring-4 ring-amber-500/20 shadow-lg shadow-amber-500/30 font-black"
                                        : "bg-muted/40 text-muted-foreground/50 border-border"
                                )}
                            >
                                {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Icon className="w-3 h-3" />}
                            </motion.div>
                            <span className={cn(
                                "text-[9px] font-extrabold tracking-tight truncate w-full",
                                isActive ? "text-amber-500 font-black" : isDone ? "text-foreground font-bold" : "text-muted-foreground/40"
                            )}>
                                {st.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ManagerMaintenanceView({ navigate }) {
    const [metrics, setMetrics] = useState(null);
    const [queue, setQueue] = useState([]);
    const [emergencies, setEmergencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [autoRefreshInterval, setAutoRefreshInterval] = useState(30);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        category: '',
        emergencyOnly: false,
        slaBreached: false
    });
    const [savedPreset, setSavedPreset] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkStatus, setBulkStatus] = useState('');
    const [bulkTech, setBulkTech] = useState('');
    const [previewTicket, setPreviewTicket] = useState(null);
    const [assigningTicket, setAssigningTicket] = useState(null);

    // Mock operational inbox messages (Enhancement 10)
    const [inboxMessages, setInboxMessages] = useState([
        { id: 1, title: 'Tenant Replied', text: 'Tenant Apt 4B added photo attachment', time: '5m ago', icon: '💬' },
        { id: 2, title: 'Technician Delayed', text: 'Mike reported traffic delay for Visit #302', time: '12m ago', icon: '⚠️' },
        { id: 3, title: '🚨 Emergency Created', text: 'Pipe Burst in Unit 12A - SLA set 30m', time: '18m ago', icon: '🚨' },
        { id: 4, title: 'Visit Confirmed', text: 'Inspection scheduled tomorrow 10:00 AM', time: '45m ago', icon: '✅' },
    ]);

    // Smart Technician Recommendations (Enhancement 14)
    const mockTechs = [
        { id: 'tech1', name: 'Mike Johnson', rating: 4.9, jobs: 2, distance: '1.2 km', eta: '15m', match: '98%', status: 'Available' },
        { id: 'tech2', name: 'Alex Rivera', rating: 4.8, jobs: 3, distance: '3.4 km', eta: '25m', match: '91%', status: 'Busy' },
        { id: 'tech3', name: 'Sarah Connor', rating: 4.9, jobs: 1, distance: '0.8 km', eta: '10m', match: '95%', status: 'Available' },
    ];

    const fetchDashboardData = useCallback(async () => {
        setRefreshing(true);
        try {
            const [mRes, qRes, emgRes] = await Promise.all([
                maintenanceService.getManagerDashboard(filters),
                maintenanceService.getAllRequests({ ...filters, search: searchQuery, limit: 100 }),
                maintenanceService.getAllRequests({ emergencyOnly: true, limit: 10 })
            ]);
            setMetrics(mRes?.data || mRes);
            setQueue(qRes?.data?.data || qRes?.data || []);
            setEmergencies(emgRes?.data?.data || emgRes?.data || []);
        } catch (err) {
            console.error('Failed to load Manager Maintenance Dashboard:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filters, searchQuery]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    useEffect(() => {
        if (autoRefreshInterval <= 0) return;
        const timer = setInterval(() => fetchDashboardData(), autoRefreshInterval * 1000);
        return () => clearInterval(timer);
    }, [autoRefreshInterval, fetchDashboardData]);

    // 3. Saved Queue Filters Presets
    const handleApplyPreset = (presetKey) => {
        setSavedPreset(presetKey);
        if (presetKey === 'emergency') setFilters({ status: '', priority: 'emergency', category: '', emergencyOnly: true, slaBreached: false });
        else if (presetKey === 'sla') setFilters({ status: '', priority: '', category: '', emergencyOnly: false, slaBreached: true });
        else if (presetKey === 'waiting_parts') setFilters({ status: 'waiting_parts', priority: '', category: '', emergencyOnly: false, slaBreached: false });
        else if (presetKey === 'high_priority') setFilters({ status: '', priority: 'high', category: '', emergencyOnly: false, slaBreached: false });
        else if (presetKey === 'unassigned') setFilters({ status: 'open', priority: '', category: '', emergencyOnly: false, slaBreached: false });
        else setFilters({ status: '', priority: '', category: '', emergencyOnly: false, slaBreached: false });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === queue.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(queue.map(q => q._id)));
    };

    const toggleSelectOne = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    // 6. Extended Bulk Operations
    const handleBulkStatusChange = async (targetStatus) => {
        if (!targetStatus || selectedIds.size === 0) return;
        try {
            await Promise.all(Array.from(selectedIds).map(id => maintenanceService.updateStatus(id, targetStatus, 'Bulk Status Action')));
            setSelectedIds(new Set());
            setBulkStatus('');
            fetchDashboardData();
        } catch (err) {
            console.error('Bulk status update error:', err);
        }
    };

    const handleBulkAssign = async (techId) => {
        if (!techId || selectedIds.size === 0) return;
        try {
            await Promise.all(Array.from(selectedIds).map(id => maintenanceService.updateRequest(id, { assignedTo: techId, status: 'technician_assigned' })));
            setSelectedIds(new Set());
            setBulkTech('');
            fetchDashboardData();
        } catch (err) {
            console.error('Bulk assign error:', err);
        }
    };

    // 11. Queue Export Function
    const handleExportQueue = (format) => {
        alert(`Exporting current filtered queue (${queue.length} tickets) to ${format.toUpperCase()}...`);
    };

    const kpis = metrics?.kpis || {
        totalRequests: 0, open: 0, inProgress: 0, emergency: 0, slaBreached: 0,
        completedToday: 0, avgResponseTimeMins: 22, avgResolutionTimeHours: 18.5,
        technicianUtilizationPercent: 84, customerSatisfactionScore: 4.8
    };

    const priorityRowStyle = (priority) => ({
        emergency: 'bg-rose-500/10 hover:bg-rose-500/15 border-l-4 border-l-rose-500 text-rose-300',
        high: 'bg-orange-500/5 hover:bg-orange-500/10 border-l-4 border-l-orange-500 text-orange-300',
        medium: 'bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500 text-amber-300',
        low: 'bg-emerald-500/5 hover:bg-emerald-500/10 border-l-4 border-l-emerald-500 text-emerald-300'
    }[priority] || 'hover:bg-muted/30');

    return (
        <div className="space-y-6">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md border border-border p-4 rounded-3xl shadow-sm">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                        Enterprise Operations Command
                    </span>
                    <h2 className="text-xl font-black text-foreground mt-1">Manager Maintenance Dashboard &amp; Queue</h2>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-muted/60 border border-border p-1 rounded-xl text-xs font-bold">
                        <span className="text-[10px] uppercase font-black text-muted-foreground px-2">Refresh:</span>
                        {[30, 60, 0].map(s => (
                            <button key={s} onClick={() => setAutoRefreshInterval(s)}
                                className={cn('px-2.5 py-1 rounded-lg transition-all text-xs font-black',
                                    autoRefreshInterval === s ? 'bg-amber-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                )}>
                                {s === 0 ? 'Off' : `${s}s`}
                            </button>
                        ))}
                    </div>

                    <button onClick={fetchDashboardData} disabled={refreshing}
                        className="p-2.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm">
                        <RefreshCw className={cn("w-4 h-4 text-amber-500", refreshing && "animate-spin")} />
                        Manual Sync
                    </button>
                </div>
            </div>

            {/* 1. Live Emergency Panel (High Priority - Always Pinned at Top) */}
            <div className="p-5 rounded-3xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-card to-card space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 animate-bounce">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-rose-400 uppercase tracking-wider flex items-center gap-2">
                                🚨 Live Emergency Queue ({emergencies.length})
                            </h3>
                            <p className="text-[10px] text-muted-foreground">High-priority critical repairs requiring immediate dispatch</p>
                        </div>
                    </div>
                    <span className="text-[10px] font-black uppercase text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                        30-Min Emergency SLA
                    </span>
                </div>

                {emergencies.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {emergencies.slice(0, 3).map(emg => (
                            <div key={emg._id} className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-2 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-[10px] font-bold text-rose-400">#{String(emg._id).substring(0, 8)}</span>
                                        <SLACountdown createdAt={emg.createdAt} priority="emergency" status={emg.status} />
                                    </div>
                                    <h4 className="text-xs font-black text-foreground mt-1 truncate">{emg.title}</h4>
                                    <p className="text-[10px] text-muted-foreground">📍 Apt {emg.unit || 'A-402'} • {emg.property?.name || 'Main Property'}</p>
                                </div>
                                <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between gap-1">
                                    <button onClick={() => setAssigningTicket(emg)} className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-[10px] hover:bg-rose-500 transition-all flex items-center gap-1">
                                        <UserCheck className="w-3 h-3" /> Assign
                                    </button>
                                    <button onClick={() => setPreviewTicket(emg)} className="px-2.5 py-1 rounded-lg bg-card border border-border text-foreground font-bold text-[10px] hover:bg-muted transition-all flex items-center gap-1">
                                        <Eye className="w-3 h-3" /> View
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 text-center text-xs font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                        ✓ No active emergency tickets in queue
                    </div>
                )}
            </div>

            {/* 10. Manager Operational Inbox & 4. Queue Density KPI Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* 4. Queue Density KPI Cards (Spans 3 cols) */}
                <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { label: 'Total Requests', val: kpis.totalRequests, color: 'text-foreground', spark: '↑12%', pct: 100, bar: 'bg-blue-500' },
                        { label: 'Open', val: kpis.open, color: 'text-rose-500', spark: '↑5%', pct: 40, bar: 'bg-rose-500' },
                        { label: 'In Progress', val: kpis.inProgress, color: 'text-amber-500', spark: '↓8%', pct: 60, bar: 'bg-amber-500' },
                        { label: 'Emergency', val: kpis.emergency, color: 'text-rose-600 font-black animate-pulse', spark: '🚨 Live', pct: 20, bar: 'bg-rose-600' },
                        { label: 'SLA Breached', val: kpis.slaBreached, color: 'text-orange-500', spark: '↑2%', pct: 15, bar: 'bg-orange-500' },
                        { label: 'Completed Today', val: kpis.completedToday, color: 'text-emerald-400', spark: '↑15%', pct: 80, bar: 'bg-emerald-500' },
                        { label: 'Avg Response', val: `${kpis.avgResponseTimeMins}m`, color: 'text-blue-400', spark: '< 30m', pct: 75, bar: 'bg-blue-400' },
                        { label: 'Avg Resolution', val: `${kpis.avgResolutionTimeHours}h`, color: '< 24h', pct: 85, bar: 'bg-purple-400' },
                        { label: 'Tech Utilization', val: `${kpis.technicianUtilizationPercent}%`, color: 'text-cyan-400', spark: '84%', pct: 84, bar: 'bg-cyan-400' },
                        { label: 'Customer CSAT', val: `★ ${kpis.customerSatisfactionScore}`, color: 'text-amber-400', spark: '96%', pct: 96, bar: 'bg-amber-400' },
                    ].map(kpi => (
                        <div key={kpi.label} className="p-3.5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase text-muted-foreground/60">
                                <span>{kpi.label}</span>
                                <span className="text-emerald-400 font-mono">{kpi.spark}</span>
                            </div>
                            <p className={cn("text-2xl font-black tabular-nums", kpi.color)}>{kpi.val}</p>
                            {/* Queue Density Bar */}
                            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className={cn("h-full rounded-full", kpi.bar)} style={{ width: `${kpi.pct}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* 10. Manager Operational Inbox (Spans 1 col) */}
                <div className="p-4 rounded-3xl border border-border bg-card shadow-sm space-y-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <Bell className="w-4 h-4 text-amber-500" /> Manager Operational Inbox
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-black">{inboxMessages.length}</span>
                    </div>

                    <div className="space-y-2 flex-1 overflow-y-auto max-h-48 pr-1">
                        {inboxMessages.map(msg => (
                            <div key={msg.id} className="p-2.5 rounded-xl border border-border/60 bg-muted/20 space-y-0.5">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="font-bold text-foreground">{msg.icon} {msg.title}</span>
                                    <span className="text-muted-foreground/60 font-mono">{msg.time}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground line-clamp-1">{msg.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. Saved Queue Filters Bar */}
            <div className="p-3 rounded-2xl border border-border bg-card/60 backdrop-blur-md flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 shrink-0 px-2">1-Click Presets:</span>
                {[
                    { id: 'emergency', label: '🚨 My Emergencies', class: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
                    { id: 'sla', label: '⏰ SLA Breached', class: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
                    { id: 'waiting_parts', label: '📦 Waiting Parts', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                    { id: 'high_priority', label: '⚡ High Priority', class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                    { id: 'unassigned', label: '📋 Open Unassigned', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                    { id: 'reset', label: '↺ All Tickets', class: 'bg-muted text-muted-foreground border-border' },
                ].map(preset => (
                    <button key={preset.id} onClick={() => handleApplyPreset(preset.id)}
                        className={cn("px-3 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap transition-all", preset.class)}>
                        {preset.label}
                    </button>
                ))}
            </div>

            {/* 9. Sticky Filters & 5. Enterprise Queue Table */}
            <div className="rounded-3xl border border-border bg-card/60 backdrop-blur-md shadow-sm overflow-hidden space-y-4 p-5">
                {/* 9. Sticky Filters Bar */}
                <div className="sticky top-0 z-20 backdrop-blur-md bg-card/90 py-3 border-b border-border/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground/40" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by Ticket ID, Title, Unit..."
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs font-semibold placeholder-muted-foreground/40 focus:outline-none focus:border-amber-500/50"
                        />
                    </div>

                    {/* 11. Queue Export Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => handleExportQueue('pdf')} className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 text-foreground text-xs font-bold hover:bg-muted transition-all flex items-center gap-1">
                            <Download className="w-3.5 h-3.5 text-rose-400" /> Export PDF
                        </button>
                        <button onClick={() => handleExportQueue('xlsx')} className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 text-foreground text-xs font-bold hover:bg-muted transition-all flex items-center gap-1">
                            <Download className="w-3.5 h-3.5 text-emerald-400" /> Excel
                        </button>
                        <button onClick={() => handleExportQueue('csv')} className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 text-foreground text-xs font-bold hover:bg-muted transition-all flex items-center gap-1">
                            <Download className="w-3.5 h-3.5 text-blue-400" /> CSV
                        </button>
                    </div>
                </div>

                {/* 8. Queue Statistics Summary Row */}
                <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between text-xs font-bold text-foreground">
                    <div className="flex items-center gap-4">
                        <span>Total: <span className="font-mono text-primary">{queue.length} Tickets</span></span>
                        <span>Filtered: <span className="font-mono text-amber-500">{queue.length}</span></span>
                        <span>Selected: <span className="font-mono text-blue-400">{selectedIds.size}</span></span>
                    </div>
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleBulkStatusChange('completed')} className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px]">
                                Bulk Resolve
                            </button>
                            <button onClick={() => handleBulkStatusChange('cancelled')} className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px]">
                                Bulk Cancel
                            </button>
                        </div>
                    )}
                </div>

                {/* Desktop Queue Table (Hidden on Mobile) & 13. Priority Row Colors */}
                <div className="hidden md:block overflow-x-auto border border-border rounded-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-muted/40 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 select-none">
                                <th className="p-3 w-10 text-center">
                                    <input type="checkbox" checked={selectedIds.size === queue.length && queue.length > 0} onChange={toggleSelectAll} className="rounded border-border bg-card" />
                                </th>
                                <th className="p-3">Ticket ID</th>
                                <th className="p-3">Issue Title</th>
                                <th className="p-3">Tenant</th>
                                <th className="p-3">Priority</th>
                                <th className="p-3">Live SLA Countdown</th>
                                <th className="p-3">Technician Availability</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 text-xs font-medium">
                            {queue.map(ticket => (
                                <tr key={ticket._id} className={cn("transition-all", priorityRowStyle(ticket.priority))}>
                                    <td className="p-3 text-center">
                                        <input type="checkbox" checked={selectedIds.has(ticket._id)} onChange={() => toggleSelectOne(ticket._id)} className="rounded border-border bg-card" />
                                    </td>
                                    <td className="p-3 font-mono font-bold text-foreground">#{String(ticket._id).substring(0, 8)}</td>
                                    <td className="p-3 font-bold text-foreground max-w-[200px] truncate">{ticket.title}</td>
                                    <td className="p-3 text-muted-foreground">{ticket.requestedBy?.firstName} {ticket.requestedBy?.lastName}</td>
                                    <td className="p-3">
                                        <span className="px-2 py-0.5 rounded-md border text-[9px] font-black capitalize bg-card border-border">
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <SLACountdown createdAt={ticket.createdAt} priority={ticket.priority} status={ticket.status} />
                                    </td>
                                    {/* 5. Technician Availability Pill */}
                                    <td className="p-3">
                                        {ticket.assignedTo ? (
                                            <span className="px-2 py-1 rounded-xl bg-card border border-border text-[10px] font-bold text-foreground flex items-center gap-1.5 w-fit">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                                {ticket.assignedTo.firstName} (2 Jobs • 74%)
                                            </span>
                                        ) : (
                                            <button onClick={() => setAssigningTicket(ticket)} className="text-[10px] font-bold text-amber-500 hover:underline">
                                                + Assign Tech
                                            </button>
                                        )}
                                    </td>
                                    {/* 12. Quick Ticket Preview Action */}
                                    <td className="p-3 text-right space-x-1">
                                        <button onClick={() => setPreviewTicket(ticket)} className="p-1.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground">
                                            <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => navigate('/maintenance', { state: { searchId: ticket._id } })} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold text-[10px]">
                                            Inspect
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 7. Better Queue Cards (Mobile View - Rendered on Mobile) */}
                <div className="block md:hidden space-y-3">
                    {queue.map(ticket => (
                        <div key={ticket._id} className={cn("p-4 rounded-2xl border space-y-2", priorityRowStyle(ticket.priority))}>
                            <div className="flex justify-between items-start">
                                <span className="font-mono text-xs font-bold text-foreground">#{String(ticket._id).substring(0, 8)}</span>
                                <SLACountdown createdAt={ticket.createdAt} priority={ticket.priority} status={ticket.status} />
                            </div>
                            <h4 className="text-sm font-black text-foreground">{ticket.title}</h4>
                            <p className="text-xs text-muted-foreground">Tenant: {ticket.requestedBy?.firstName} {ticket.requestedBy?.lastName} • Apt {ticket.unit || 'N/A'}</p>
                            
                            <AnimatedCardTimeline status={ticket.status} />

                            <div className="pt-2 flex items-center justify-between border-t border-border/40">
                                <span className="text-[10px] font-bold text-foreground">Tech: {ticket.assignedTo?.firstName || 'Unassigned'}</span>
                                <button onClick={() => setPreviewTicket(ticket)} className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs">
                                    Preview
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 12. Quick Ticket Preview Modal */}
            <AnimatePresence>
                {previewTicket && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={e => e.target === e.currentTarget && setPreviewTicket(null)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 space-y-4 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div>
                                    <span className="font-mono text-xs font-bold text-muted-foreground">#{String(previewTicket._id).substring(0, 8)}</span>
                                    <h3 className="text-base font-black text-foreground">{previewTicket.title}</h3>
                                </div>
                                <button onClick={() => setPreviewTicket(null)} className="p-2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="space-y-2 text-xs">
                                <p><span className="font-bold text-muted-foreground">Tenant:</span> {previewTicket.requestedBy?.firstName} {previewTicket.requestedBy?.lastName}</p>
                                <p><span className="font-bold text-muted-foreground">Description:</span> {previewTicket.description}</p>
                                <AnimatedCardTimeline status={previewTicket.status} />
                            </div>
                            <div className="pt-3 border-t border-border flex gap-2">
                                <button onClick={() => setPreviewTicket(null)} className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold">Close</button>
                                <button onClick={() => { setPreviewTicket(null); navigate('/maintenance', { state: { searchId: previewTicket._id } }); }} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold">Full Details</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* 14. Smart Assignment Suggestions Modal */}
                {assigningTicket && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={e => e.target === e.currentTarget && setAssigningTicket(null)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-md rounded-3xl border border-border bg-card p-6 space-y-4 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-amber-500">Smart Tech Dispatch</span>
                                    <h3 className="text-base font-black text-foreground">Assign Specialist for #{String(assigningTicket._id).substring(0, 8)}</h3>
                                </div>
                                <button onClick={() => setAssigningTicket(null)} className="p-2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                            </div>

                            <div className="space-y-2">
                                {mockTechs.map(tech => (
                                    <div key={tech.id} className="p-3.5 rounded-2xl border border-border bg-muted/20 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-xs font-black text-foreground">{tech.name} <span className="text-amber-400 font-bold">★ {tech.rating}</span></h4>
                                            <p className="text-[10px] text-muted-foreground">{tech.jobs} Jobs • Distance {tech.distance} • ETA {tech.eta}</p>
                                        </div>
                                        <button onClick={async () => {
                                            await maintenanceService.updateRequest(assigningTicket._id, { assignedTo: tech.id, status: 'technician_assigned' });
                                            setAssigningTicket(null);
                                            fetchDashboardData();
                                        }} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-all">
                                            {tech.match} Match
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

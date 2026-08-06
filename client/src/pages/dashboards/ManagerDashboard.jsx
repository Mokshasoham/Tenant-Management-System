import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    Building2, Users, Wrench, CreditCard, Plus, ArrowUpRight,
    BarChart3, CalendarDays, CheckCircle2, Clock, XCircle
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { bookingService, visitService } from '../../services/api';
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
                        {card.trendDown ? '↓' : '↑'} {Math.abs(parseInt(card.trend))}
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
                    onClick={() => setView('financials')}
                    className={cn(
                        "px-6 py-2 rounded-xl text-xs font-black transition-all",
                        view === 'financials' ? "bg-white text-blue-600 shadow-sm dark:bg-card dark:text-blue-400" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    FINANCIALS & PAYOUTS
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

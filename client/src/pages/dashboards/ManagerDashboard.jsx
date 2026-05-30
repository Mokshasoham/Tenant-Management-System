import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Building2, Users, Wrench, CreditCard, Plus, ArrowUpRight,
    BarChart3, CalendarDays, CheckCircle2, Clock, XCircle
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { bookingService } from '../../services/api';
import { CalendarWidget, WorldClockWidget } from '../../components/dashboard/Widgets';
import PayoutsSection from '../../components/dashboard/PayoutsSection';

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
            <p className="text-3xl font-black text-foreground tabular-nums">{count}</p>
        </motion.div>
    );
}

export default function ManagerDashboard({ stats, loading, navigate }) {
    const [view, setView] = useState('overview');
    const [bookings, setBookings] = useState([]);
    const [bookingLoading, setBookingLoading] = useState(true);

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
        fetchBookings();
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

    const pendingBookings = bookings.filter(b => b.status === 'pending');

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
                        <RingChart percentage={88} color="#3b82f6" size={120} />
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <div className="text-center p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 dark:bg-blue-500/10">
                                <p className="text-lg font-black text-foreground">46</p>
                                <p className="text-[9px] text-blue-500/80 dark:text-blue-300/60 font-black uppercase">Occupied</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-muted border border-border">
                                <p className="text-lg font-black text-foreground">6</p>
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
            {pendingBookings.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55, duration: 0.5 }}
                    className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-5"
                >
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20">
                                <CalendarDays className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                            </div>
                            <p className="text-sm font-black text-foreground">Booking Requests</p>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-black">
                                {pendingBookings.length} PENDING
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingBookings.map((b, i) => (
                            <motion.div
                                key={b._id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.7 + i * 0.1 }}
                                className="p-4 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition-all"
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
                                            {b.paymentReference === 'FREE-BOOKING' ? 'No Payment' : (b.paymentStatus || 'Paid')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
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
                        ))}
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
            ) : (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <PayoutsSection />
                </motion.div>
            )}
        </div>
    );
}

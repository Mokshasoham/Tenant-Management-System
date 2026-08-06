import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import apiClient from '../../services/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Users, Wrench, CreditCard, Plus, ArrowUpRight,
    BarChart3, CalendarDays, CheckCircle2, Clock, XCircle, AlertTriangle,
    Eye, Phone, Mail, Check, RefreshCw, Search, Filter, Download,
    TrendingUp, TrendingDown, Bell, UserCheck, ShieldAlert, Sparkles, X, Send
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { bookingService, visitService, maintenanceService, propertyService } from '../../services/api';
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

// 2. Live SLA Countdown Timer Component
function SLACountdown({ createdAt, priority, status }) {
    const [timeLeft, setTimeLeft] = useState('');
    const [isBreached, setIsBreached] = useState(false);

    useEffect(() => {
        if (['completed', 'resolved', 'closed', 'cancelled'].includes(status)) {
            setTimeLeft('RESOLVED');
            return;
        }

        const updateTimer = () => {
            const created = new Date(createdAt).getTime();
            const slaMs = priority === 'emergency' ? 30 * 60 * 1000 : 24 * 3600 * 1000;
            const deadline = created + slaMs;
            const diff = deadline - Date.now();

            if (diff <= 0) {
                setIsBreached(true);
                const pastMs = Math.abs(diff);
                const h = Math.floor(pastMs / (3600 * 1000));
                const m = Math.floor((pastMs % (3600 * 1000)) / (60 * 1000));
                setTimeLeft(`Overdue ${h}h ${m}m`);
            } else {
                setIsBreached(false);
                const h = Math.floor(diff / (3600 * 1000));
                const m = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
                const s = Math.floor((diff % (60 * 1000)) / 1000);
                setTimeLeft(`${h}h ${m}m ${s}s`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [createdAt, priority, status]);

    if (timeLeft === 'RESOLVED') {
        return <span className="text-[10px] font-bold text-emerald-400">✓ Resolved</span>;
    }

    return (
        <span className={cn(
            "px-2 py-0.5 rounded-md text-[10px] font-mono font-black border inline-flex items-center gap-1",
            isBreached
                ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse"
                : priority === 'emergency'
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        )}>
            {isBreached && <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />}
            {isBreached ? `🔴 BREACHED (${timeLeft})` : `⏰ ${timeLeft}`}
        </span>
    );
}

export default function ManagerDashboard({ stats, loading, navigate }) {
    const [view, setView] = useState('overview');
    const [bookings, setBookings] = useState([]);
    const [bookingLoading, setBookingLoading] = useState(true);
    const [bookingTab, setBookingTab] = useState('pending');
    const [renewals, setRenewals] = useState([]);
    const [visits, setVisits] = useState([]);
    const [visitsLoading, setVisitsLoading] = useState(true);
    const [visitTab, setVisitTab] = useState('pending');

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

        fetchBookings();
        fetchVisits();
    }, []);

    const pendingBookings = bookings.filter(b => b.status === 'pending');

    const statCards = [
        { title: 'Managed Units', value: stats?.totalProperties || 52, icon: Building2, trend: '+2', color: 'bg-blue-500', delay: 0 },
        { title: 'Active Tenants', value: stats?.totalTenants || 88, icon: Users, trend: '+3', color: 'bg-cyan-500', delay: 0.1 },
        { title: 'Booking Requests', value: pendingBookings.length, icon: CalendarDays, trend: pendingBookings.length > 0 ? '↑ New' : '', color: 'bg-indigo-500', delay: 0.2 },
        { title: 'Pending Payments', value: stats?.pendingPayments || 14, icon: CreditCard, color: 'bg-rose-500', delay: 0.3 },
    ];

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
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted/50 border border-border w-fit flex-wrap">
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
                </>
            ) : view === 'maintenance' ? (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
                    <ManagerMaintenanceView navigate={navigate} />
                </motion.div>
            ) : view === 'financials' ? (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
                    <PayoutsSection />
                </motion.div>
            ) : (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
                    <ReportingHubTab />
                </motion.div>
            )}
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
                                <p><span className="font-bold text-muted-foreground">Status:</span> <span className="capitalize font-bold text-amber-500">{previewTicket.status}</span></p>
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

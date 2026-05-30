import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users, Building2, CreditCard, FileText, TrendingUp, Shield,
    Activity, Database, Cpu, Globe, ArrowUpRight, Zap, Bell,
    CheckCircle2, AlertCircle, Clock, MoreHorizontal, Wrench
} from 'lucide-react';
import { cn } from '../../utils/cn';
import AdminPayouts from './AdminPayouts';

// Animated counter hook
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

// Animated stat card
function StatCard({ title, value, icon: Icon, trend, color, delay, prefix = '', suffix = '' }) {
    const animatedValue = useCounter(typeof value === 'number' ? value : 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative group overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-5 hover:border-violet-500/30 transition-all duration-300"
        >
            {/* Glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-violet-500/5 to-transparent dark:from-violet-900/5" />

            <div className="flex items-start justify-between mb-4">
                <div className={cn('p-2.5 rounded-xl', color)}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                        <ArrowUpRight className="w-3 h-3" />
                        {trend}
                    </div>
                )}
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">{title}</p>
            <p className="text-3xl font-black text-foreground tabular-nums">
                {prefix}{animatedValue.toLocaleString()}{suffix}
            </p>
        </motion.div>
    );
}

// Donut chart (pure CSS)
function DonutChart({ data, size = 120 }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    let cumulative = 0;
    const RADIUS = 40;
    const CIRCUM = 2 * Math.PI * RADIUS;

    return (
        <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
            {data.map((d, i) => {
                const pct = d.value / total;
                const dash = pct * CIRCUM;
                const offset = cumulative * CIRCUM;
                cumulative += pct;
                return (
                    <motion.circle
                        key={i}
                        cx="50" cy="50" r={RADIUS}
                        fill="none"
                        stroke={d.color}
                        strokeWidth="12"
                        strokeDasharray={`${dash} ${CIRCUM - dash}`}
                        strokeDashoffset={-offset}
                        strokeLinecap="round"
                        initial={{ strokeDasharray: `0 ${CIRCUM}` }}
                        animate={{ strokeDasharray: `${dash} ${CIRCUM - dash}` }}
                        transition={{ delay: 0.5 + i * 0.2, duration: 1, ease: 'easeOut' }}
                    />
                );
            })}
        </svg>
    );
}

// Mini sparkline bars
function Sparkline({ data, color }) {
    const max = Math.max(...data);
    return (
        <div className="flex items-end gap-0.5 h-10">
            {data.map((v, i) => (
                <motion.div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{ backgroundColor: color }}
                    initial={{ height: 0 }}
                    animate={{ height: `${(v / max) * 100}%` }}
                    transition={{ delay: 0.8 + i * 0.05, duration: 0.4, ease: 'easeOut' }}
                />
            ))}
        </div>
    );
}

export default function AdminDashboard({ stats, loading }) {
    const [view, setView] = useState('overview');
    const revenueData = [42, 58, 51, 73, 65, 89, 94, 78, 102, 88, 115, 98];
    const userGrowth = [12, 18, 15, 24, 20, 31, 28, 36, 33, 42, 38, 47];

    const statCards = [
        { title: 'Total Users', value: stats?.totalUsers || 248, icon: Users, trend: '+12%', color: 'bg-violet-500', delay: 0 },
        { title: 'Properties', value: stats?.totalProperties || 84, icon: Building2, trend: '+4%', color: 'bg-purple-500', delay: 0.1 },
        { title: 'Revenue', value: stats?.totalRevenue || 94280, icon: CreditCard, trend: '+18%', color: 'bg-indigo-500', delay: 0.2, prefix: '₹' },
        { title: 'Active Leases', value: stats?.totalLeases || 156, icon: FileText, trend: '+7%', color: 'bg-fuchsia-500', delay: 0.3 },
    ];

    const systemHealth = [
        { label: 'Database', value: 98, color: 'bg-violet-400' },
        { label: 'API Server', value: 100, color: 'bg-emerald-400' },
        { label: 'File Storage', value: 74, color: 'bg-amber-400' },
        { label: 'Email Queue', value: 91, color: 'bg-blue-400' },
    ];

    const recentActivity = [
        { user: 'Sarah Chen', action: 'Created new lease agreement', time: '2m ago', type: 'lease' },
        { user: 'Mike Wilson', action: 'Payment of ₹2,400 received', time: '15m ago', type: 'payment' },
        { user: 'Admin', action: 'New user account created', time: '1h ago', type: 'user' },
        { user: 'Emma Davis', action: 'Maintenance request submitted', time: '2h ago', type: 'maintenance' },
        { user: 'System', action: 'Monthly report generated', time: '3h ago', type: 'system' },
    ];

    const donutData = [
        { value: 65, color: '#7c3aed', label: 'Paid' },
        { value: 20, color: '#a855f7', label: 'Pending' },
        { value: 10, color: '#ec4899', label: 'Overdue' },
        { value: 5, color: '#6366f1', label: 'Cancelled' },
    ];

    const getTypeIcon = (type) => {
        const icons = { lease: FileText, payment: CreditCard, user: Users, maintenance: Wrench, system: Cpu };
        const colors = { lease: 'text-violet-400', payment: 'text-emerald-400', user: 'text-blue-400', maintenance: 'text-amber-400', system: 'text-purple-400' };
        const Icon = icons[type] || Activity;
        return <Icon className={cn('w-4 h-4', colors[type])} />;
    };

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
                        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-violet-400 to-purple-600" />
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-500/80 dark:text-violet-400">System Administration</p>
                    </div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight">Command Center <span className="text-violet-500/80 dark:text-violet-400">⚡</span></h1>
                    <p className="text-muted-foreground mt-1 font-medium">Full system overview & controls</p>
                </div>
                <div className="hidden md:flex items-center gap-2">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">All Systems Operational</span>
                    </div>
                </div>
            </motion.div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted/50 border border-border w-fit">
                <button
                    onClick={() => setView('overview')}
                    className={cn(
                        "px-6 py-2 rounded-xl text-xs font-black transition-all",
                        view === 'overview' ? "bg-white text-violet-600 shadow-sm dark:bg-card dark:text-violet-400" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    OVERVIEW
                </button>
                <button
                    onClick={() => setView('payouts')}
                    className={cn(
                        "px-6 py-2 rounded-xl text-xs font-black transition-all",
                        view === 'payouts' ? "bg-white text-violet-600 shadow-sm dark:bg-card dark:text-violet-400" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    PAYOUT REQUESTS
                </button>
            </div>

            {view === 'overview' ? (
                <>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {statCards.map((card) => (
                            <StatCard key={card.title} {...card} />
                        ))}
                    </div>

                    {/* Charts Row */}
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
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Monthly Revenue</p>
                                    <p className="text-2xl font-black text-foreground">₹94,280 <span className="text-sm text-emerald-500 font-bold">↑ 18%</span></p>
                                </div>
                                <div className="p-2 rounded-xl bg-violet-500/20">
                                    <TrendingUp className="w-5 h-5 text-violet-400" />
                                </div>
                            </div>
                            <Sparkline data={revenueData} color="var(--primary)" />
                            <div className="flex gap-3 mt-3">
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                    <span key={m} className="flex-1 text-center text-[8px] text-muted-foreground/60 font-bold">{m.slice(0, 1)}</span>
                                ))}
                            </div>
                        </motion.div>

                        {/* Payment Distribution Donut */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-5"
                        >
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-4">Payment Status</p>
                            <div className="flex flex-col items-center">
                                <div className="relative">
                                    <DonutChart data={donutData} size={110} />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center">
                                            <p className="text-xl font-black text-foreground">65%</p>
                                            <p className="text-[9px] text-muted-foreground font-bold">Paid</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                                    {donutData.map((d, i) => (
                                        <div key={i} className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                                            <span className="text-[10px] text-muted-foreground font-bold">{d.label}</span>
                                            <span className="text-[10px] text-foreground font-black ml-auto">{d.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* System Health + Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* System Health */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 0.5 }}
                            className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-5"
                        >
                            <div className="flex items-center gap-2 mb-5">
                                <div className="p-2 rounded-xl bg-violet-500/10 active:bg-violet-500/20">
                                    <Cpu className="w-4 h-4 text-violet-500" />
                                </div>
                                <p className="text-sm font-black text-foreground">System Health</p>
                            </div>
                            <div className="space-y-4">
                                {systemHealth.map((item, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-xs font-bold text-muted-foreground">{item.label}</span>
                                            <span className="text-xs font-black text-foreground">{item.value}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                            <motion.div
                                                className={cn('h-full rounded-full', item.color)}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${item.value}%` }}
                                                transition={{ delay: 0.8 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-5 pt-4 border-t border-border flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-xs text-muted-foreground font-medium">All systems running optimally</p>
                            </div>
                        </motion.div>

                        {/* Recent Activity */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7, duration: 0.5 }}
                            className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-5"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-xl bg-purple-500/10">
                                        <Activity className="w-4 h-4 text-purple-500" />
                                    </div>
                                    <p className="text-sm font-black text-foreground">Recent Activity</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {recentActivity.map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.9 + i * 0.1 }}
                                        className="flex items-start gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                                    >
                                        <div className="p-1.5 rounded-lg bg-white/5 mt-0.5">
                                            {getTypeIcon(item.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-foreground/80 truncate">{item.action}</p>
                                            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{item.user} • {item.time}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                >
                    <AdminPayouts />
                </motion.div>
            )}
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { analyticsService } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { TrendingUp, Building2, CreditCard, BarChart2, Star, RefreshCw } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart as RechartsBarChart, Bar
} from 'recharts';
import { cn } from '../utils/cn';

// Custom Elegant Tooltip matching Glassmorphism design system
function CustomTooltip({ active, payload, label, formatter }) {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-xl border border-border bg-card/95 backdrop-blur-md p-3.5 shadow-2xl transition-colors select-none">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">{label}</p>
                <p className="text-sm font-black text-foreground">
                    {formatter ? formatter(payload[0].value) : payload[0].value}
                </p>
            </div>
        );
    }
    return null;
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
    // Dynamic color tailwind mapping to support dynamic themes
    const borderColors = {
        blue: 'border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400',
        emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
        violet: 'border-violet-500/20 bg-violet-500/5 text-violet-600 dark:text-violet-400',
        amber: 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400',
    }[color];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl border border-border bg-card shadow-sm transition-colors">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3 border', borderColors)}>
                <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground mb-1 font-semibold">{label}</p>
            {sub && <p className="text-[10px] text-muted-foreground/40 mt-0.5">{sub}</p>}
        </motion.div>
    );
}

export default function AnalyticsPage() {
    const { theme } = useTheme();
    const [revenue, setRevenue] = useState([]);
    const [occupancy, setOccupancy] = useState(null);
    const [collection, setCollection] = useState([]);
    const [summary, setSummary] = useState(null);
    const [topProps, setTopProps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [months, setMonths] = useState(12);

    const isDark = theme === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#a1a1aa' : '#71717a';

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [r, o, c, s, t] = await Promise.all([
                analyticsService.getRevenue(months),
                analyticsService.getOccupancy(),
                analyticsService.getCollectionRate(),
                analyticsService.getSummary(),
                analyticsService.getTopProperties(),
            ]);
            
            const revData = r.data?.data || r.data || [];
            setRevenue(revData.map(d => ({
                label: `${d._id.month}/${String(d._id.year).slice(2)}`,
                value: d.total,
            })));
            setOccupancy(o.data?.data || o.data);
            setCollection(c.data?.data || c.data || []);
            setSummary(s.data?.data || s.data);
            setTopProps(t.data?.data || t.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, [months]);

    if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground/30 font-bold">Loading analytics...</div>;

    // Occupancy donut colors mapping
    const OCCUPANCY_COLORS = {
        occupied: '#10b981', // emerald
        available: '#3b82f6', // blue
        maintenance: '#f59e0b' // amber
    };

    const occupancyPieData = occupancy ? [
        { name: 'Occupied', value: occupancy.occupied, color: OCCUPANCY_COLORS.occupied },
        { name: 'Available', value: occupancy.available, color: OCCUPANCY_COLORS.available },
        { name: 'Maintenance', value: occupancy.maintenance, color: OCCUPANCY_COLORS.maintenance }
    ].filter(d => d.value > 0) : [];

    const maintenanceByCategoryData = summary?.maintenanceByCategory || [];

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-violet-400 to-purple-600" />
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-500 dark:text-violet-400">Insights</p>
                    </div>
                    <h1 className="text-3xl font-black text-foreground">Analytics</h1>
                </div>
                <div className="flex items-center gap-2">
                    <select value={months} onChange={e => setMonths(Number(e.target.value))}
                        className="px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none appearance-none cursor-pointer font-bold">
                        <option value={3} className="bg-background">3 Months</option>
                        <option value={6} className="bg-background">6 Months</option>
                        <option value={12} className="bg-background">12 Months</option>
                    </select>
                    <button onClick={fetchAll} className="p-2.5 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>

            {/* Summary Stats */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard icon={Building2} label="Properties" value={summary.totalProperties} color="blue" />
                    <StatCard icon={CreditCard} label="Total Revenue" value={`₹${(summary.totalRevenue || 0).toLocaleString('en-IN')}`} color="emerald" />
                    <StatCard icon={TrendingUp} label="Active Leases" value={summary.totalLeases} color="violet" />
                    <StatCard icon={BarChart2} label="Open Issues" value={summary.openMaintenance} color="amber" />
                </div>
            )}

            {/* Revenue + Occupancy Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Revenue Trend Area Chart */}
                <div className="lg:col-span-2 p-5 rounded-2xl border border-border bg-card shadow-sm transition-colors flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-foreground">Revenue Over Time</h3>
                        <p className="text-xs text-emerald-500 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full">
                            ₹{revenue.reduce((a, d) => a + d.value, 0).toLocaleString('en-IN')} total
                        </p>
                    </div>
                    <div className="h-60 w-full">
                        {revenue.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground/30 text-sm">No revenue recorded yet</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenue} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                    <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: textColor, fontSize: 10 }} axisLine={false} tickLine={false}
                                        tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                                    <Tooltip content={<CustomTooltip active={false} payload={[]} label="" formatter={(val) => `₹${val.toLocaleString('en-IN')}`} />} />
                                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#revenueGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Occupancy Donut Pie Chart */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm transition-colors flex flex-col justify-between">
                    <h3 className="font-black text-foreground mb-4">Occupancy Rate</h3>
                    {occupancy && occupancy.total > 0 ? (
                        <div className="flex flex-col items-center justify-center relative min-h-[220px]">
                            {/* SVG Donut */}
                            <div className="w-full h-44 relative flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={occupancyPieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {occupancyPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip active={false} payload={[]} label="" formatter={(val) => `${val} unit${val > 1 ? 's' : ''}`} />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-black text-foreground">{occupancy.occupancyRate}%</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mt-0.5">Occupied</span>
                                </div>
                            </div>

                            {/* Legends */}
                            <div className="w-full space-y-2.5 mt-3 pt-3 border-t border-border">
                                {[
                                    { key: 'occupied', label: 'Occupied', color: OCCUPANCY_COLORS.occupied },
                                    { key: 'available', label: 'Available', color: OCCUPANCY_COLORS.available },
                                    { key: 'maintenance', label: 'Maintenance', color: OCCUPANCY_COLORS.maintenance },
                                ].map(({ key, label, color }) => (
                                    <div key={key} className="flex items-center justify-between text-xs font-semibold">
                                        <span className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                            <span className="text-muted-foreground/70">{label}</span>
                                        </span>
                                        <span className="font-bold text-foreground/80">{occupancy[key] || 0} unit{occupancy[key] !== 1 ? 's' : ''}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground/20 py-16">No units recorded</div>
                    )}
                </div>
            </div>

            {/* Collection Rate + Maintenance Categories Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Rent Collection Rate Bar Chart */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm transition-colors flex flex-col justify-between">
                    <h3 className="font-black text-foreground mb-4">Payment Collection Rate</h3>
                    <div className="h-60 w-full">
                        {collection.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground/30 text-sm">No payment data recorded</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart data={collection} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                    <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: textColor, fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                                    <Tooltip content={<CustomTooltip active={false} payload={[]} label="" formatter={(val) => `${val}% collection rate`} />} />
                                    <Bar dataKey="rate" radius={[6, 6, 0, 0]} barSize={24}>
                                        {collection.map((entry, index) => {
                                            const color = entry.rate >= 80 ? '#10b981' : entry.rate >= 60 ? '#f59e0b' : '#f43f5e';
                                            return <Cell key={`cell-${index}`} fill={color} />;
                                        })}
                                    </Bar>
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Maintenance Issues by Category horizontal BarChart */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm transition-colors flex flex-col justify-between">
                    <h3 className="font-black text-foreground mb-4">Maintenance Issues by Category</h3>
                    <div className="h-60 w-full">
                        {maintenanceByCategoryData.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground/30 text-sm">No maintenance requests yet</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart data={maintenanceByCategoryData} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                                    <XAxis type="number" tick={{ fill: textColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis dataKey="category" type="category" tick={{ fill: textColor, fontSize: 10 }} axisLine={false} tickLine={false} width={80} className="capitalize" />
                                    <Tooltip content={<CustomTooltip active={false} payload={[]} label="" formatter={(val) => `${val} issue${val > 1 ? 's' : ''}`} />} />
                                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={12} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Revenue Properties Row */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-sm transition-colors">
                <h3 className="font-black text-foreground mb-4">Top Revenue Generating Properties</h3>
                {topProps.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground/30 text-sm">No payments recorded yet</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {topProps.map((p, i) => (
                            <div key={p._id} className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-all flex flex-col justify-between relative overflow-hidden group">
                                <div className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 dark:text-violet-400 text-xs font-black flex-shrink-0">
                                    #{i + 1}
                                </div>
                                <div className="space-y-1 pr-6">
                                    <p className="text-sm font-black text-foreground truncate">{p.propertyName || 'Unknown'}</p>
                                    <p className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-wider truncate">{p.propertyAddress || 'No address'}</p>
                                </div>
                                <div className="mt-4 pt-3 border-t border-border/60 flex items-end justify-between">
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Total Earned</p>
                                        <p className="text-base font-black text-foreground mt-0.5">₹{p.totalRevenue?.toLocaleString('en-IN')}</p>
                                    </div>
                                    <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">{p.paymentCount} Paid</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

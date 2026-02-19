import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { analyticsService } from '../services/api';
import { TrendingUp, Building2, CreditCard, BarChart2, Star, RefreshCw } from 'lucide-react';

function BarChart({ data, valueKey, labelKey, color = '#3b82f6', height = 140 }) {
    if (!data?.length) return <div className="text-center py-8 text-white/20 text-sm">No data</div>;
    const max = Math.max(...data.map(d => d[valueKey] || 0)) || 1;
    return (
        <div className="flex items-end gap-1" style={{ height }}>
            {data.map((d, i) => {
                const pct = ((d[valueKey] || 0) / max) * 100;
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`${d[labelKey]}: ₹${(d[valueKey] || 0).toLocaleString('en-IN')}`}>
                        <div className="w-full rounded-t-md transition-all relative" style={{ height: `${pct}%`, minHeight: 4, background: color, opacity: 0.7 }}>
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block text-[9px] text-white/70 font-bold whitespace-nowrap bg-black/60 px-1 py-0.5 rounded">
                                ₹{(d[valueKey] || 0).toLocaleString('en-IN')}
                            </div>
                        </div>
                        <span className="text-[8px] text-white/25 truncate w-full text-center">{d[labelKey]}</span>
                    </div>
                );
            })}
        </div>
    );
}

function DonutChart({ value, max = 100, color = '#10b981', size = 100 }) {
    const r = 38;
    const c = 2 * Math.PI * r;
    const dash = (value / max) * c;
    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
                <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
                    strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s ease' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black text-white">{value}%</span>
            </div>
        </div>
    );
}

function CollectionChart({ data }) {
    if (!data?.length) return <div className="text-center py-4 text-white/20 text-sm">No data</div>;
    const max = 100;
    return (
        <div className="space-y-2">
            {data.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] text-white/30 w-12 text-right flex-shrink-0">{d.month}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }} animate={{ width: `${d.rate}%` }}
                            transition={{ delay: i * 0.05, duration: 0.6 }}
                            className="h-full rounded-full"
                            style={{ background: d.rate >= 80 ? '#10b981' : d.rate >= 60 ? '#f59e0b' : '#f43f5e' }}
                        />
                    </div>
                    <span className="text-xs font-bold text-white/50 w-10 text-right flex-shrink-0">{d.rate}%</span>
                </div>
            ))}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl border border-white/5 bg-white/3">
            <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 text-${color}-400`} />
            </div>
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="text-sm text-white/40 mt-1">{label}</p>
            {sub && <p className="text-xs text-white/20 mt-0.5">{sub}</p>}
        </motion.div>
    );
}

export default function AnalyticsPage() {
    const [revenue, setRevenue] = useState([]);
    const [occupancy, setOccupancy] = useState(null);
    const [collection, setCollection] = useState([]);
    const [summary, setSummary] = useState(null);
    const [topProps, setTopProps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [months, setMonths] = useState(12);

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
            setRevenue(r.data.map(d => ({
                label: `${d._id.month}/${String(d._id.year).slice(2)}`,
                value: d.total,
            })));
            setOccupancy(o.data);
            setCollection(c.data);
            setSummary(s.data);
            setTopProps(t.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, [months]);

    if (loading) return <div className="flex items-center justify-center h-64 text-white/30">Loading analytics...</div>;

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-violet-400 to-purple-600" />
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-400">Insights</p>
                    </div>
                    <h1 className="text-3xl font-black text-white">Analytics</h1>
                </div>
                <div className="flex items-center gap-2">
                    <select value={months} onChange={e => setMonths(Number(e.target.value))}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none appearance-none">
                        <option value={3} className="bg-gray-900">3 Months</option>
                        <option value={6} className="bg-gray-900">6 Months</option>
                        <option value={12} className="bg-gray-900">12 Months</option>
                    </select>
                    <button onClick={fetchAll} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all">
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
                <div className="lg:col-span-2 p-5 rounded-2xl border border-white/5 bg-white/3">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-white">Revenue Over Time</h3>
                        <p className="text-xs text-white/30">₹{revenue.reduce((a, d) => a + d.value, 0).toLocaleString('en-IN')} total</p>
                    </div>
                    <BarChart data={revenue} valueKey="value" labelKey="label" color="#3b82f6" height={160} />
                </div>
                <div className="p-5 rounded-2xl border border-white/5 bg-white/3">
                    <h3 className="font-black text-white mb-4">Occupancy Rate</h3>
                    {occupancy ? (
                        <div className="flex flex-col items-center gap-4">
                            <DonutChart value={occupancy.occupancyRate} color="#10b981" size={110} />
                            <div className="w-full space-y-2">
                                {[
                                    { k: 'occupied', l: 'Occupied', c: '#10b981' },
                                    { k: 'available', l: 'Available', c: '#3b82f6' },
                                    { k: 'maintenance', l: 'Maintenance', c: '#f59e0b' },
                                ].map(({ k, l, c }) => (
                                    <div key={k} className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                                            <span className="text-white/40">{l}</span>
                                        </span>
                                        <span className="font-bold text-white/60">{occupancy[k]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : <div className="text-center text-white/20 py-8">No data</div>}
                </div>
            </div>

            {/* Collection Rate + Top Properties Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-white/5 bg-white/3">
                    <h3 className="font-black text-white mb-4">Payment Collection Rate</h3>
                    <CollectionChart data={collection} />
                </div>
                <div className="p-5 rounded-2xl border border-white/5 bg-white/3">
                    <h3 className="font-black text-white mb-4">Top Revenue Properties</h3>
                    {topProps.length === 0 ? (
                        <div className="text-center py-8 text-white/20 text-sm">No data yet</div>
                    ) : (
                        <div className="space-y-3">
                            {topProps.map((p, i) => (
                                <div key={p._id} className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-xs font-black flex-shrink-0">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white/80 truncate">{p.propertyName || 'Unknown'}</p>
                                        <p className="text-[10px] text-white/30">{p.paymentCount} payments</p>
                                    </div>
                                    <p className="text-sm font-black text-white">₹{p.totalRevenue?.toLocaleString('en-IN')}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

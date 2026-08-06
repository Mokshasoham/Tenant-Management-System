import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { technicianService } from '../services/api';
import useAuthStore from '../context/authStore';
import {
    Users, UserCheck, Clock, ShieldAlert, Star, Search, Filter,
    Plus, X, Wrench, FileText, CheckCircle2, AlertTriangle, Phone,
    Mail, MapPin, Calendar, Award, Shield, Briefcase, Activity,
    Download, RefreshCw, ChevronRight, Edit3, Trash2, Zap, Layers,
    Compass, Check, BarChart2, MessageSquare, Scale, ExternalLink
} from 'lucide-react';
import { cn } from '../utils/cn';

// 1. Status Engine Colors & Icons
const STATUS_ENGINE = {
    available: { label: 'Available', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
    working: { label: 'Working', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-400' },
    travelling: { label: 'Travelling', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
    break: { label: 'Break', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20', dot: 'bg-sky-400' },
    meeting: { label: 'Meeting', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', dot: 'bg-purple-400' },
    emergency_call: { label: 'Emergency Call', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse', dot: 'bg-rose-500' },
    on_leave: { label: 'On Leave', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', dot: 'bg-yellow-400' },
    training: { label: 'Training', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', dot: 'bg-cyan-400' },
    off_duty: { label: 'Off Duty', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', dot: 'bg-slate-400' },
};

function renderStars(rating = 4) {
    const full = Math.floor(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
}

// 8. Technician Comparison Modal
function ComparisonModal({ techA, techB, onClose }) {
    if (!techA || !techB) return null;

    const metrics = [
        { label: 'Employee ID', a: techA.technicianProfile?.employeeId || 'TECH-101', b: techB.technicianProfile?.employeeId || 'TECH-102' },
        { label: 'Current Jobs', a: `${techA.workload?.currentJobs || 2} / ${techA.technicianProfile?.maxCapacity || 5}`, b: `${techB.workload?.currentJobs || 1} / ${techB.technicianProfile?.maxCapacity || 5}` },
        { label: 'Capacity Utilization', a: `${techA.workload?.utilizationPercent || 60}%`, b: `${techB.workload?.utilizationPercent || 40}%` },
        { label: 'Rating', a: `★ ${techA.technicianProfile?.rating || 4.9}`, b: `★ ${techB.technicianProfile?.rating || 4.8}` },
        { label: 'SLA Met %', a: `${techA.performance?.slaMetPercent || 98}%`, b: `${techB.performance?.slaMetPercent || 96}%` },
        { label: 'First Time Fix %', a: `${techA.technicianProfile?.firstTimeFixRate || 95}%`, b: `${techB.technicianProfile?.firstTimeFixRate || 92}%` },
        { label: 'Experience', a: `${techA.technicianProfile?.yearsOfExperience || 6} Years`, b: `${techB.technicianProfile?.yearsOfExperience || 4} Years` },
    ];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                        <Scale className="w-5 h-5 text-amber-500" />
                        <h3 className="text-base font-black text-foreground">8. Side-by-Side Technician Comparison</h3>
                    </div>
                    <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center border-b border-border pb-4">
                    <div className="text-left font-black text-xs uppercase text-muted-foreground">Metric</div>
                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 font-black text-xs text-blue-400">
                        {techA.firstName} {techA.lastName}
                    </div>
                    <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 font-black text-xs text-purple-400">
                        {techB.firstName} {techB.lastName}
                    </div>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {metrics.map(m => (
                        <div key={m.label} className="grid grid-cols-3 gap-3 items-center text-xs py-1 border-b border-border/40">
                            <span className="font-bold text-muted-foreground">{m.label}</span>
                            <span className="font-black text-foreground text-center">{m.a}</span>
                            <span className="font-black text-foreground text-center">{m.b}</span>
                        </div>
                    ))}
                </div>

                <button onClick={onClose} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs">
                    Close Comparison
                </button>
            </motion.div>
        </motion.div>
    );
}

function TechnicianWorkspaceModal({ technician, onClose, onRefresh }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [liveTech, setLiveTech] = useState(technician);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (technician?._id) {
            technicianService.getTechnicianById(technician._id)
                .then(res => setLiveTech(res?.data || res || technician))
                .catch(err => console.error(err));
        }
    }, [technician?._id]);

    const profile = liveTech.technicianProfile || {};
    const workload = liveTech.workload || {};
    const performance = liveTech.performance || {};
    const currentJobs = workload.currentJobs || 3;
    const maxCapacity = profile.maxCapacity || 5;
    const capacityPct = Math.round((currentJobs / maxCapacity) * 100);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="w-full max-w-4xl rounded-3xl border border-border bg-card shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
                
                {/* Header */}
                <div className="p-6 border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            {liveTech.firstName?.charAt(0)}{liveTech.lastName?.charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-foreground">{liveTech.firstName} {liveTech.lastName}</h2>
                                <span className="font-mono text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                    {profile.employeeId || `TECH-${String(liveTech._id).substring(0, 4)}`}
                                </span>
                                <span className={cn('px-2.5 py-0.5 rounded-full border text-[10px] font-black', STATUS_ENGINE[profile.availabilityStatus || 'available']?.color)}>
                                    ● {STATUS_ENGINE[profile.availabilityStatus || 'available']?.label}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {liveTech.email} • {liveTech.phone || '+1 555-0192'} • <span className="font-bold text-foreground capitalize">{profile.employmentType?.replace('_', ' ') || 'Full Time'}</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Workspace Navigation Tabs */}
                <div className="flex items-center gap-1 px-6 border-b border-border bg-card overflow-x-auto">
                    {[
                        { id: 'overview', label: '1. Overview', icon: Users },
                        { id: 'workload', label: '3. Workload Meter', icon: Briefcase },
                        { id: 'skills', label: '2. Skill Matrix', icon: Zap },
                        { id: 'timeline', label: '5. Activity Timeline', icon: Activity },
                        { id: 'certs', label: '6. Certifications', icon: Award },
                        { id: 'territory', label: '4. Territory Map', icon: Compass },
                    ].map(t => {
                        const Icon = t.icon;
                        const isAct = activeTab === t.id;
                        return (
                            <button key={t.id} onClick={() => setActiveTab(t.id)}
                                className={cn('py-3 px-3 text-xs font-extrabold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap',
                                    isAct ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                                )}>
                                <Icon className="w-3.5 h-3.5" />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* Workspace Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* 3. Live Workload Meter */}
                    {activeTab === 'workload' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">3. Live Workload Capacity Meter</h4>
                            <div className="p-5 rounded-3xl border border-border bg-card space-y-3">
                                <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-muted-foreground">Current Jobs Capacity</span>
                                    <span className="font-mono text-amber-500 font-extrabold">{currentJobs} / {maxCapacity} Jobs ({capacityPct}%)</span>
                                </div>
                                <div className="w-full h-3 rounded-full bg-muted overflow-hidden p-0.5 border border-border/40">
                                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500 transition-all" style={{ width: `${capacityPct}%` }} />
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Capacity limit: {maxCapacity} jobs. Technician is operating at {capacityPct}% active load.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* 2. Skill Matrix */}
                    {activeTab === 'skills' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">2. Certified Skill Matrix with Rating</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { name: 'Electrical', stars: 5, yrs: 6, cert: 'Certified Master Electrician' },
                                    { name: 'HVAC', stars: 4, yrs: 4, cert: 'HVAC Type-II License' },
                                    { name: 'Plumbing', stars: 4, yrs: 5, cert: 'State Plumbing Permit' },
                                    { name: 'Networking', stars: 3, yrs: 2, cert: 'Fiber Installer Cert' },
                                ].map((sk) => (
                                    <div key={sk.name} className="p-4 rounded-2xl border border-border bg-card space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xs text-foreground">{sk.name}</span>
                                            <span className="text-amber-400 text-xs font-bold">{renderStars(sk.stars)}</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">{sk.yrs} Years Exp • Cert: {sk.cert}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 5. Technician Activity Timeline */}
                    {activeTab === 'timeline' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">5. Technician Daily Activity Timeline</h4>
                            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                                {[
                                    { time: '09:00 AM', text: 'Started Shift & Checked In', color: 'bg-emerald-500' },
                                    { time: '10:40 AM', text: 'Completed Job #MNT-201 (Plumbing Repair)', color: 'bg-blue-500' },
                                    { time: '11:10 AM', text: 'Assigned New Ticket #MNT-204', color: 'bg-amber-500' },
                                    { time: '12:00 PM', text: 'On Scheduled Lunch Break', color: 'bg-purple-500' },
                                    { time: '02:00 PM', text: 'Arrived at Site Apt B203', color: 'bg-sky-500' },
                                    { time: '04:30 PM', text: 'Completed HVAC Maintenance Visit', color: 'bg-emerald-500' },
                                ].map((ev, i) => (
                                    <div key={i} className="relative flex items-start gap-3">
                                        <div className={cn("absolute -left-6 top-1 w-3 h-3 rounded-full ring-4 ring-card", ev.color)} />
                                        <div className="p-3 rounded-2xl border border-border bg-card w-full flex items-center justify-between text-xs">
                                            <span className="font-bold text-foreground">{ev.text}</span>
                                            <span className="font-mono text-[10px] text-muted-foreground">{ev.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 6. Certifications Compliance Dashboard */}
                    {activeTab === 'certs' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">6. Certifications Compliance &amp; Expiry Tracker</h4>
                            <div className="space-y-2">
                                {[
                                    { title: 'State Electrical License #4409', status: 'expiring_soon', days: 42 },
                                    { title: 'EPA Universal HVAC Certification', status: 'valid', days: 365 },
                                    { title: 'First Aid & Safety Compliance', status: 'valid', days: 180 },
                                    { title: 'Lift Machinery Operator License', status: 'expired', days: -5 },
                                ].map((cert, i) => (
                                    <div key={i} className="p-3.5 rounded-2xl border border-border bg-card flex items-center justify-between text-xs">
                                        <div>
                                            <p className="font-bold text-foreground">{cert.title}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {cert.days < 0 ? 'Expired 5 days ago' : `Expires in ${cert.days} days`}
                                            </p>
                                        </div>
                                        <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold border',
                                            cert.status === 'valid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            cert.status === 'expiring_soon' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                            'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                        )}>
                                            {cert.status === 'valid' ? '✓ Valid' : cert.status === 'expiring_soon' ? `⚠ Renew (${cert.days}d)` : '❌ Expired'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function TechniciansPage() {
    const { user } = useAuthStore();
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedTech, setSelectedTech] = useState(null);
    const [compareSelected, setCompareSelected] = useState([]);
    const [showCompareModal, setShowCompareModal] = useState(false);

    const fetchTechnicians = useCallback(async () => {
        try {
            setLoading(true);
            const res = await technicianService.getAllTechnicians({ search: searchQuery, status: statusFilter });
            setTechnicians(res?.data || res || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, statusFilter]);

    useEffect(() => {
        fetchTechnicians();
    }, [fetchTechnicians]);

    const toggleCompare = (id) => {
        if (compareSelected.includes(id)) {
            setCompareSelected(prev => prev.filter(x => x !== id));
        } else {
            if (compareSelected.length >= 2) {
                setCompareSelected([compareSelected[1], id]);
            } else {
                setCompareSelected(prev => [...prev, id]);
            }
        }
    };

    const techA = technicians.find(t => t._id === compareSelected[0]);
    const techB = technicians.find(t => t._id === compareSelected[1]);

    return (
        <div className="space-y-6 pb-8">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-400 to-indigo-600" />
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-500">Enterprise Workforce Engine</p>
                    </div>
                    <h1 className="text-3xl font-black text-foreground">Technician &amp; Workforce Portal</h1>
                </div>

                {compareSelected.length === 2 && (
                    <button onClick={() => setShowCompareModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg">
                        <Scale className="w-4 h-4" /> Compare 2 Technicians
                    </button>
                )}
            </motion.div>

            {/* 10. Workforce Health Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-2xl border border-border bg-card text-center">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Available</span>
                    <p className="text-xl font-black text-emerald-400">18</p>
                </div>
                <div className="p-3.5 rounded-2xl border border-border bg-card text-center">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Busy</span>
                    <p className="text-xl font-black text-amber-500">9</p>
                </div>
                <div className="p-3.5 rounded-2xl border border-border bg-card text-center">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">On Leave</span>
                    <p className="text-xl font-black text-yellow-400">2</p>
                </div>
                <div className="p-3.5 rounded-2xl border border-border bg-card text-center">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Training</span>
                    <p className="text-xl font-black text-cyan-400">1</p>
                </div>
                <div className="p-3.5 rounded-2xl border border-border bg-card text-center">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Avg Utilization</span>
                    <p className="text-xl font-black text-purple-400">76%</p>
                </div>
                <div className="p-3.5 rounded-2xl border border-border bg-card text-center">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Avg Rating</span>
                    <p className="text-xl font-black text-amber-400">★ 4.8</p>
                </div>
            </div>

            {/* 7. Workforce Filters Bar */}
            <div className="p-4 rounded-3xl border border-border bg-card shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground/40" />
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder="7. Search by Skill, Property, Availability, Shift, Rating, Territory..."
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs font-semibold focus:outline-none" />
                    </div>

                    <div className="flex items-center gap-2">
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                            className="px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-xs font-semibold">
                            <option value="">All Statuses</option>
                            {Object.entries(STATUS_ENGINE).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Table with 9. Quick Actions & 3. Workload Meter */}
            <div className="border border-border bg-card rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            <tr>
                                <th className="p-3 w-10 text-center">Compare</th>
                                <th className="p-3">Technician</th>
                                <th className="p-3">Skill Matrix</th>
                                <th className="p-3">3. Workload Meter</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Rating</th>
                                <th className="p-3 text-right">9. Quick Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {technicians.map((t) => {
                                const st = STATUS_ENGINE[t.technicianProfile?.availabilityStatus || 'available'] || STATUS_ENGINE.available;
                                const isComp = compareSelected.includes(t._id);
                                return (
                                    <tr key={t._id} className="hover:bg-muted/20 transition-all">
                                        <td className="p-3 text-center">
                                            <input type="checkbox" checked={isComp} onChange={() => toggleCompare(t._id)} className="rounded border-border" />
                                        </td>
                                        <td className="p-3 font-bold text-foreground flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                                                {t.firstName?.charAt(0)}
                                            </div>
                                            <div>
                                                <p>{t.firstName} {t.lastName}</p>
                                                <span className="font-mono text-[9px] text-muted-foreground">{t.technicianProfile?.employeeId || 'TECH-101'}</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold text-foreground">Electrical {renderStars(5)}</span>
                                                <span className="text-[9px] text-muted-foreground">HVAC {renderStars(4)}</span>
                                            </div>
                                        </td>
                                        {/* 3. Live Workload Meter */}
                                        <td className="p-3 w-44">
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
                                                    <span>Load</span>
                                                    <span>3 / 5 (60%)</span>
                                                </div>
                                                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '60%' }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className={cn('px-2 py-0.5 rounded-full border text-[9px] font-bold', st.color)}>
                                                ● {st.label}
                                            </span>
                                        </td>
                                        <td className="p-3 font-bold text-amber-400">★ {t.technicianProfile?.rating || 4.9}</td>
                                        {/* 9. Quick Actions Toolbar */}
                                        <td className="p-3 text-right space-x-1">
                                            <a href={`tel:${t.phone || '9999999999'}`} className="px-2 py-1 rounded-lg border border-border bg-card text-[10px] font-bold">
                                                Call
                                            </a>
                                            <button onClick={() => setSelectedTech(t)} className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold">
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {selectedTech && <TechnicianWorkspaceModal technician={selectedTech} onClose={() => setSelectedTech(null)} onRefresh={fetchTechnicians} />}
                {showCompareModal && <ComparisonModal techA={techA} techB={techB} onClose={() => setShowCompareModal(false)} />}
            </AnimatePresence>
        </div>
    );
}

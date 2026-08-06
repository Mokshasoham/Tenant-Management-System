import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { technicianService, propertyService } from '../services/api';
import useAuthStore from '../context/authStore';
import {
    Users, UserCheck, Clock, ShieldAlert, Star, Search, Filter,
    Plus, X, Wrench, FileText, CheckCircle2, AlertTriangle, Phone,
    Mail, MapPin, Calendar, Award, Shield, Briefcase, Activity,
    Download, RefreshCw, ChevronRight, Edit3, Trash2, Zap, Layers
} from 'lucide-react';
import { cn } from '../utils/cn';

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

    const handleUpdateStatus = async (statusField, value) => {
        try {
            setLoading(true);
            const payload = { technicianProfile: { ...profile, [statusField]: value } };
            const res = await technicianService.updateTechnician(liveTech._id, payload);
            const updated = res?.data || res;
            setLiveTech(updated);
            onRefresh();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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

                {/* Manager Quick Controls Bar */}
                <div className="px-6 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between gap-2 overflow-x-auto text-xs">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 shrink-0">Manager Quick Controls:</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleUpdateStatus('availabilityStatus', 'free')} className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-bold text-[10px]">
                            Force Free
                        </button>
                        <button onClick={() => handleUpdateStatus('availabilityStatus', 'on_leave')} className="px-2.5 py-1 rounded-xl bg-amber-600 text-white font-bold text-[10px]">
                            Approve Leave
                        </button>
                        <button onClick={() => handleUpdateStatus('employmentStatus', 'suspended')} className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-bold text-[10px]">
                            Suspend Tech
                        </button>
                    </div>
                </div>

                {/* Workspace Navigation Tabs */}
                <div className="flex items-center gap-1 px-6 border-b border-border bg-card overflow-x-auto">
                    {[
                        { id: 'overview', label: '1. Overview', icon: Users },
                        { id: 'assignments', label: '2. Assignments & Workload', icon: Briefcase },
                        { id: 'schedule', label: '3. Schedule & Territory', icon: Calendar },
                        { id: 'performance', label: '4. Performance Metrics', icon: Award },
                        { id: 'documents', label: '5. Compliance & Docs', icon: Shield },
                        { id: 'skills', label: '6. Skills & Certs', icon: Zap },
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
                    {activeTab === 'overview' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground">Employment Status</span>
                                    <p className="text-xs font-black text-emerald-400 capitalize">{profile.employmentStatus || 'Active'}</p>
                                </div>
                                <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground">Years of Experience</span>
                                    <p className="text-xs font-black text-foreground">{profile.yearsOfExperience || 6} Years</p>
                                </div>
                                <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground">Emergency Contact</span>
                                    <p className="text-xs font-black text-foreground">{liveTech.emergencyContact?.name || 'Jane Doe'} ({liveTech.emergencyContact?.phone || '+1 555-9988'})</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'assignments' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">Live Workload &amp; Active Dispatch</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-4 rounded-2xl border border-border bg-card text-center">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground">Current Jobs</span>
                                    <p className="text-2xl font-black text-amber-500">{workload.currentJobs || 2}</p>
                                </div>
                                <div className="p-4 rounded-2xl border border-border bg-card text-center">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground">Pending Visits</span>
                                    <p className="text-2xl font-black text-blue-400">{workload.pendingJobs || 1}</p>
                                </div>
                                <div className="p-4 rounded-2xl border border-border bg-card text-center">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground">Completed Today</span>
                                    <p className="text-2xl font-black text-emerald-400">{workload.completedToday || 4}</p>
                                </div>
                                <div className="p-4 rounded-2xl border border-border bg-card text-center">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground">Utilization</span>
                                    <p className="text-2xl font-black text-purple-400">{workload.utilizationPercent || 74}%</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'performance' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">Performance Analytics &amp; Rating</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground">Average Rating</span>
                                    <p className="text-xl font-black text-amber-400">★ {performance.avgRating || 4.9}</p>
                                </div>
                                <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground">First Time Fix %</span>
                                    <p className="text-xl font-black text-emerald-400">{performance.firstTimeFixPercent || 95}%</p>
                                </div>
                                <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground">SLA Met Rate</span>
                                    <p className="text-xl font-black text-blue-400">{performance.slaMetPercent || 98}%</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'skills' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">Skills &amp; Certified Specializations</h4>
                            <div className="flex flex-wrap gap-2">
                                {(profile.skills?.length > 0 ? profile.skills : [
                                    { name: 'Electrical', level: 'expert' },
                                    { name: 'Plumbing', level: 'expert' },
                                    { name: 'HVAC', level: 'intermediate' },
                                    { name: 'Fire Safety', level: 'beginner' }
                                ]).map((sk, i) => (
                                    <span key={i} className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold capitalize">
                                        ⚡ {sk.name} ({sk.level})
                                    </span>
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
    const [selectedTech, setSelectedTech] = useState(null);

    const fetchTechnicians = useCallback(async () => {
        try {
            setLoading(true);
            const res = await technicianService.getAllTechnicians({ search: searchQuery });
            setTechnicians(res?.data || res || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        fetchTechnicians();
    }, [fetchTechnicians]);

    return (
        <div className="space-y-6 pb-8">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-400 to-indigo-600" />
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-500">Phase 3.3 — Workforce Management</p>
                    </div>
                    <h1 className="text-3xl font-black text-foreground">Technician &amp; Workforce Portal</h1>
                </div>
            </motion.div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Total Technicians</span>
                    <p className="text-2xl font-black text-foreground">{technicians.length || 12}</p>
                </div>
                <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Available (Free)</span>
                    <p className="text-2xl font-black text-emerald-400">8</p>
                </div>
                <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Busy / Working</span>
                    <p className="text-2xl font-black text-amber-500">3</p>
                </div>
                <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Avg Workforce Rating</span>
                    <p className="text-2xl font-black text-amber-400">★ 4.9</p>
                </div>
            </div>

            {/* Main Table */}
            <div className="border border-border bg-card rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground/40" />
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search technicians by name, skill, employee ID..."
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs font-semibold focus:outline-none" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            <tr>
                                <th className="p-3">Technician</th>
                                <th className="p-3">Skills</th>
                                <th className="p-3">Active Jobs</th>
                                <th className="p-3">Availability</th>
                                <th className="p-3">Rating</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {technicians.map((t) => (
                                <tr key={t._id} className="hover:bg-muted/20 transition-all">
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
                                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold text-[10px]">
                                            Plumbing, Electrical
                                        </span>
                                    </td>
                                    <td className="p-3 font-mono font-bold text-blue-400">2 Jobs</td>
                                    <td className="p-3">
                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                            Free
                                        </span>
                                    </td>
                                    <td className="p-3 font-bold text-amber-400">★ 4.9</td>
                                    <td className="p-3">
                                        <button onClick={() => setSelectedTech(t)} className="px-3 py-1 rounded-xl bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20">
                                            Workspace
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {selectedTech && <TechnicianWorkspaceModal technician={selectedTech} onClose={() => setSelectedTech(null)} onRefresh={fetchTechnicians} />}
            </AnimatePresence>
        </div>
    );
}

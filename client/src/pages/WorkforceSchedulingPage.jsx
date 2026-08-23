import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { workforceSchedulingService, technicianService, maintenanceService, assignmentEngineService } from '../services/api';
import useAuthStore from '../context/authStore';
import {
    Calendar, Clock, Users, UserCheck, ShieldAlert, Sparkles, Filter,
    Plus, X, Wrench, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight,
    Briefcase, Calendar as CalendarIcon, ArrowRight, Zap, RefreshCw, Layers,
    Check, AlertCircle, FileText, Download, Share2
} from 'lucide-react';
import { cn } from '../utils/cn';

export default function WorkforceSchedulingPage() {
    const { user } = useAuthStore();
    const [viewMode, setViewMode] = useState('board'); // 'board' | 'calendar' | 'timeline'
    const [calendarView, setCalendarView] = useState('week'); // 'day' | 'week' | 'month'
    const [technicians, setTechnicians] = useState([]);
    const [unassignedTickets, setUnassignedTickets] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [suggestTarget, setSuggestTarget] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [conflictWarning, setConflictWarning] = useState(null);
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [shiftData, setShiftData] = useState({
        technician: '',
        shiftName: 'morning',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    });

    // Route Optimization state
    const [optimizingRoute, setOptimizingRoute] = useState(false);
    const [routeResult, setRouteResult] = useState(null);

    const handleOptimizeSelectedRoute = async () => {
        if (technicians.length === 0) return;
        const targetTech = technicians[0];
        const activeTicketIds = unassignedTickets.slice(0, 4).map(t => t._id);
        if (activeTicketIds.length === 0) {
            alert('No unassigned tickets available to optimize dispatch sequence.');
            return;
        }

        setOptimizingRoute(true);
        try {
            const res = await assignmentEngineService.optimizeRoute({
                technicianId: targetTech._id,
                ticketIds: activeTicketIds
            });
            setRouteResult(res?.data || res);
        } catch (err) {
            console.error('Route optimization error:', err);
            alert(err.response?.data?.message || 'Failed to optimize dispatch route.');
        } finally {
            setOptimizingRoute(false);
        }
    };

    const [allRequests, setAllRequests] = useState([]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [techRes, reqRes, schedRes] = await Promise.all([
                technicianService.getAllTechnicians(),
                maintenanceService.getAllRequests({ limit: 100 }),
                workforceSchedulingService.getScheduleCalendar()
            ]);
            
            const allTechs = techRes?.data || techRes || [];
            const reqList = reqRes?.data?.data || reqRes?.data || [];
            
            setTechnicians(Array.isArray(allTechs) ? allTechs : []);
            setAllRequests(Array.isArray(reqList) ? reqList : []);
            setUnassignedTickets(Array.isArray(reqList) ? reqList.filter(r => !r.assignedTo || r.status === 'open') : []);
            setSchedules(schedRes?.data || schedRes || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const activeDispatches = (allRequests || []).filter(r => ['in_progress', 'technician_assigned', 'visit_scheduled', 'technician_en_route', 'work_started', 'waiting_parts'].includes(r.status));
    const todaysVisits = (allRequests || []).filter(r => {
        const d = r.scheduledDate || r.requestedVisitDate;
        return d && new Date(d).toDateString() === new Date().toDateString();
    });
    const avgCapacity = technicians.length > 0 
        ? `${Math.round(technicians.reduce((acc, t) => acc + (t.workload?.utilizationPercent || 0), 0) / technicians.length)}%`
        : '0%';

    const handleAutoSuggest = async (ticket) => {
        setSuggestTarget(ticket);
        try {
            const res = await workforceSchedulingService.autoSuggestTechnician(ticket._id);
            setSuggestions(res?.data || res || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDispatch = async (ticketId, techId) => {
        try {
            await workforceSchedulingService.dispatchTicket({ ticketId, technicianId: techId });
            setSuggestTarget(null);
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleCheckConflicts = async (techId, start, end) => {
        try {
            const res = await workforceSchedulingService.detectConflicts({ technicianId: techId, startDate: start, endDate: end });
            setConflictWarning(res?.data || res);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveShift = async (e) => {
        e.preventDefault();
        try {
            await workforceSchedulingService.createShift({
                ...shiftData,
                title: `Shift: ${shiftData.shiftName.toUpperCase()}`,
                startDate: new Date(shiftData.startDate),
                endDate: new Date(shiftData.endDate)
            });
            setShowShiftModal(false);
            fetchData();
        } catch (err) {
            alert(err.message || 'Shift conflict detected');
        }
    };

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-purple-600" />
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Phase 3.3.2 — Dispatch Engine</p>
                    </div>
                    <h1 className="text-3xl font-black text-foreground">Workforce Scheduling &amp; Dispatch</h1>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto">
                    {/* View Switchers */}
                    <div className="p-1 rounded-2xl bg-muted border border-border flex items-center gap-1">
                        {[
                            { id: 'board', label: '3. Dispatch Board', icon: Briefcase },
                            { id: 'calendar', label: '1. Calendar', icon: CalendarIcon },
                            { id: 'timeline', label: '9. Daily Timeline', icon: Clock },
                        ].map(v => (
                            <button key={v.id} onClick={() => setViewMode(v.id)}
                                className={cn("px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5",
                                    viewMode === v.id ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                                )}>
                                <v.icon className="w-3.5 h-3.5" /> {v.label}
                            </button>
                        ))}
                    </div>

                    <button onClick={() => setShowShiftModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-xs hover:bg-indigo-500 transition-all flex items-center gap-1.5 shadow-lg">
                        <Plus className="w-4 h-4" /> 2. Add Shift
                    </button>
                    <button onClick={handleOptimizeSelectedRoute} disabled={optimizingRoute}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs hover:opacity-90 transition-all flex items-center gap-1.5 shadow-lg">
                        {optimizingRoute ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Route Optimizer
                    </button>
                </div>
            </motion.div>

            {/* 10. Workforce Command Center Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-4 rounded-2xl border border-border bg-card shadow-sm text-center">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Live Technicians</span>
                    <p className="text-2xl font-black text-foreground">{technicians.length}</p>
                </div>
                <div className="p-4 rounded-2xl border border-border bg-card shadow-sm text-center">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Unassigned Tickets</span>
                    <p className="text-2xl font-black text-rose-400">{unassignedTickets.length}</p>
                </div>
                <div className="p-4 rounded-2xl border border-border bg-card shadow-sm text-center">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Today's Visits</span>
                    <p className="text-2xl font-black text-blue-400">{todaysVisits.length}</p>
                </div>
                <div className="p-4 rounded-2xl border border-border bg-card shadow-sm text-center">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Active Dispatches</span>
                    <p className="text-2xl font-black text-amber-500">{activeDispatches.length}</p>
                </div>
                <div className="p-4 rounded-2xl border border-border bg-card shadow-sm text-center">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Avg Capacity</span>
                    <p className="text-2xl font-black text-emerald-400">{avgCapacity}</p>
                </div>
            </div>

            {/* 3. Enterprise Dispatch Board */}
            {viewMode === 'board' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Column 1: Unassigned Queue */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                            <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4" /> Unassigned Queue ({unassignedTickets.length})
                            </span>
                        </div>
                        <div className="space-y-3 min-h-[300px]">
                            {unassignedTickets.length === 0 ? (
                                <div className="p-8 border border-dashed rounded-2xl text-center space-y-1 text-muted-foreground">
                                    <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
                                    <p className="text-xs font-bold text-foreground">No unassigned tickets</p>
                                    <p className="text-[10px]">All maintenance requests are assigned.</p>
                                </div>
                            ) : (
                                unassignedTickets.map(t => (
                                    <div key={t._id} className="p-4 rounded-2xl border border-border bg-card space-y-2 hover:border-amber-500/50 transition-all shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-xs text-foreground">{t.title}</h4>
                                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] font-black uppercase">
                                                {t.priority}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">{t.category} • Unit {t.unit || 'A101'}</p>
                                        <button onClick={() => handleAutoSuggest(t)}
                                            className="w-full py-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-black hover:bg-amber-500/20 flex items-center justify-center gap-1">
                                            <Sparkles className="w-3.5 h-3.5" /> 7. Auto-Suggest Technician
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Column 2: Available Technicians */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                <UserCheck className="w-4 h-4" /> Available Technicians ({technicians.length})
                            </span>
                        </div>
                        <div className="space-y-3 min-h-[300px]">
                            {technicians.length === 0 ? (
                                <div className="p-8 border border-dashed rounded-2xl text-center space-y-1 text-muted-foreground">
                                    <UserCheck className="w-6 h-6 mx-auto text-muted-foreground/50 mb-1" />
                                    <p className="text-xs font-bold text-foreground">No technicians available</p>
                                    <p className="text-[10px]">Invite technicians to assign tasks.</p>
                                </div>
                            ) : (
                                technicians.map(tech => (
                                    <div key={tech._id} className="p-4 rounded-2xl border border-border bg-card space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                                                    {tech.firstName?.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-xs text-foreground">{tech.firstName} {tech.lastName}</h4>
                                                    <span className="text-[9px] text-muted-foreground font-mono">{tech.technicianProfile?.employeeId || 'TECH-101'}</span>
                                                </div>
                                            </div>
                                            <span className="text-amber-400 font-bold text-xs">★ {tech.technicianProfile?.rating || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                            <span>Capacity: {tech.workload?.currentJobs || 0} / {tech.technicianProfile?.maxCapacity || 5} Jobs</span>
                                            <span className="text-emerald-400 font-bold">● Free</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Column 3: Active Dispatches */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                            <span className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Zap className="w-4 h-4" /> Active Dispatches ({activeDispatches.length})
                            </span>
                        </div>
                        <div className="space-y-3 min-h-[300px]">
                            {activeDispatches.length === 0 ? (
                                <div className="p-8 border border-dashed rounded-2xl text-center space-y-1 text-muted-foreground">
                                    <Zap className="w-6 h-6 mx-auto text-muted-foreground/50 mb-1" />
                                    <p className="text-xs font-bold text-foreground">No active dispatches</p>
                                    <p className="text-[10px]">Active maintenance dispatches will appear here.</p>
                                </div>
                            ) : (
                                activeDispatches.map(t => (
                                    <div key={t._id} className="p-4 rounded-2xl border border-border bg-card space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-xs font-bold text-amber-500">#{String(t._id).substring(0, 6)} • {t.title}</span>
                                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] font-bold uppercase">{t.status?.replace('_', ' ')}</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            Assigned: {t.assignedTo?.firstName ? `${t.assignedTo.firstName} ${t.assignedTo.lastName || ''}` : 'Technician'} • Priority: {t.priority}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 1. Workforce Calendar View */}
            {viewMode === 'calendar' && (
                <div className="p-6 rounded-3xl border border-border bg-card space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-wider">1. Workforce Shift &amp; Visit Calendar</h3>
                        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl text-xs font-bold">
                            {['day', 'week', 'month'].map(m => (
                                <button key={m} onClick={() => setCalendarView(m)}
                                    className={cn('px-3 py-1 rounded-lg capitalize', calendarView === m ? 'bg-card text-foreground shadow' : 'text-muted-foreground')}>
                                    {m} View
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-center text-xs border-b border-border pb-2 font-black text-muted-foreground">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-2 min-h-[240px]">
                        {[1, 2, 3, 4, 5, 6, 7].map(d => (
                            <div key={d} className="p-2 rounded-2xl border border-border bg-muted/20 min-h-[100px] text-xs font-bold space-y-1">
                                <span className="text-muted-foreground">{d} Aug</span>
                                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] truncate">
                                    Shift: Morning (Mike)
                                </div>
                                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] truncate">
                                    Visit: Apt A101
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 9. Daily Dispatch Timeline View */}
            {viewMode === 'timeline' && (
                <div className="p-6 rounded-3xl border border-border bg-card space-y-4">
                    <h3 className="text-sm font-black text-foreground uppercase tracking-wider">9. Daily Dispatch Timeline</h3>
                    <div className="space-y-3">
                        {[
                            { time: '08:00 AM', event: 'Shift Start & Equipment Check', tag: 'Shift' },
                            { time: '09:00 AM', event: 'Job A: Water Leakage Repair (Apt A402)', tag: 'Job' },
                            { time: '11:30 AM', event: 'Job B: HVAC Inspection (Building B)', tag: 'Job' },
                            { time: '01:00 PM', event: 'Scheduled Lunch Break', tag: 'Break' },
                            { time: '02:00 PM', event: 'Job C: Electrical Panel Fuse Replace', tag: 'Job' },
                            { time: '04:00 PM', event: 'Emergency Dispatch: Generator Backup Check', tag: 'Emergency' },
                            { time: '06:00 PM', event: 'Shift End & Off Duty', tag: 'Shift' },
                        ].map((item, idx) => (
                            <div key={idx} className="p-3.5 rounded-2xl border border-border bg-muted/20 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono font-bold text-amber-500">{item.time}</span>
                                    <span className="font-bold text-foreground">{item.event}</span>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                                    {item.tag}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 7. Auto-Suggest Technician Modal */}
            <AnimatePresence>
                {suggestTarget && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={e => e.target === e.currentTarget && setSuggestTarget(null)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 space-y-4 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-500" />
                                    <h3 className="text-base font-black text-foreground">7. Auto-Scheduling Assistant</h3>
                                </div>
                                <button onClick={() => setSuggestTarget(null)} className="p-2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Recommending best technician for ticket <span className="font-bold text-foreground">#{suggestTarget.title}</span> based on Skill Match, Rating, Distance &amp; Capacity.
                            </p>

                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {suggestions.map((s, idx) => (
                                    <div key={idx} className="p-4 rounded-2xl border border-border bg-muted/30 flex items-center justify-between text-xs gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-foreground">{s.technician.name}</span>
                                                <span className="text-amber-400 font-bold">★ {s.technician.rating}</span>
                                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                                                    Match Score: {s.score}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">{s.recommendationReason}</p>
                                        </div>
                                        <button onClick={() => handleDispatch(suggestTarget._id, s.technician._id)}
                                            className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 shrink-0">
                                            Dispatch
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. Add Shift Modal */}
            <AnimatePresence>
                {showShiftModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={e => e.target === e.currentTarget && setShowShiftModal(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-md rounded-3xl border border-border bg-card p-6 space-y-4 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <h3 className="text-base font-black text-foreground">2. Create Shift &amp; Rotation</h3>
                                <button onClick={() => setShowShiftModal(false)} className="p-2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                            </div>

                            <form onSubmit={handleSaveShift} className="space-y-3 text-xs">
                                <div>
                                    <label className="font-bold text-muted-foreground block mb-1">Select Technician</label>
                                    <select value={shiftData.technician} onChange={e => {
                                        setShiftData({ ...shiftData, technician: e.target.value });
                                        handleCheckConflicts(e.target.value, shiftData.startDate, shiftData.endDate);
                                    }}
                                        required className="w-full p-2.5 rounded-xl bg-muted border border-border text-foreground font-semibold">
                                        <option value="">Choose Technician...</option>
                                        {technicians.map(t => (
                                            <option key={t._id} value={t._id}>{t.firstName} {t.lastName} ({t.technicianProfile?.employeeId || 'TECH'})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="font-bold text-muted-foreground block mb-1">Shift Type</label>
                                    <select value={shiftData.shiftName} onChange={e => setShiftData({ ...shiftData, shiftName: e.target.value })}
                                        className="w-full p-2.5 rounded-xl bg-muted border border-border text-foreground font-semibold capitalize">
                                        {['morning', 'afternoon', 'evening', 'night', 'split_shift', 'custom'].map(s => (
                                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="font-bold text-muted-foreground block mb-1">Start Date</label>
                                        <input type="date" value={shiftData.startDate} onChange={e => setShiftData({ ...shiftData, startDate: e.target.value })}
                                            className="w-full p-2.5 rounded-xl bg-muted border border-border text-foreground font-semibold" />
                                    </div>
                                    <div>
                                        <label className="font-bold text-muted-foreground block mb-1">End Date</label>
                                        <input type="date" value={shiftData.endDate} onChange={e => setShiftData({ ...shiftData, endDate: e.target.value })}
                                            className="w-full p-2.5 rounded-xl bg-muted border border-border text-foreground font-semibold" />
                                    </div>
                                </div>

                                {conflictWarning && conflictWarning.hasConflict && (
                                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 space-y-1">
                                        <span className="font-black text-[10px] uppercase">5. Conflict Warning Detected:</span>
                                        {conflictWarning.warnings.map((w, i) => <p key={i} className="text-[10px]">{w}</p>)}
                                    </div>
                                )}

                                <button type="submit" className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-lg">
                                    Save Shift Schedule
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {/* 11. Route Optimization Result Modal */}
                {routeResult && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={e => e.target === e.currentTarget && setRouteResult(null)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-lg rounded-3xl border border-amber-500/30 bg-card p-6 space-y-4 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-amber-500" />
                                    <h3 className="text-base font-black text-foreground">Auto-Dispatched Daily Route Optimization</h3>
                                </div>
                                <button onClick={() => setRouteResult(null)} className="p-2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                                    <span className="text-[9px] font-black uppercase text-amber-400 block">Est Travel Time</span>
                                    <span className="font-mono font-black text-foreground">{routeResult.estimatedTravelMinutes} mins</span>
                                </div>
                                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                    <span className="text-[9px] font-black uppercase text-emerald-400 block">Total Route Distance</span>
                                    <span className="font-mono font-black text-foreground">{routeResult.routeDistanceKm} km</span>
                                </div>
                                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                                    <span className="text-[9px] font-black uppercase text-blue-400 block">Algorithm Version</span>
                                    <span className="font-mono font-bold text-foreground text-[10px]">{routeResult.optimizedRouteVersion}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Optimized Job Sequence (Job A → Job B → Job C):</span>
                                {routeResult.sequence?.map((step) => (
                                    <div key={step.step} className="p-3 rounded-2xl border border-border bg-muted/20 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-[11px] flex items-center justify-center">
                                                {step.step}
                                            </span>
                                            <div>
                                                <p className="font-bold text-foreground">{step.title} ({step.buildingName})</p>
                                                <p className="text-[10px] text-muted-foreground">Est. Duration: {step.estimatedMinutes}m • Priority: {step.priority}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-emerald-400">Step {step.step} Ready</span>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => setRouteResult(null)} className="w-full py-3 rounded-xl bg-amber-500 text-white text-xs font-black hover:bg-amber-400 transition-all">
                                Accept &amp; Dispatch Sequence
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

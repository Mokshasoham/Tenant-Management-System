import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { maintenanceService } from '../services/api';
import useAuthStore from '../context/authStore';
import {
    Plus, X, Wrench, AlertTriangle, Clock, CheckCircle2, XCircle,
    Filter, RefreshCw, MessageSquare, ArrowRight, ChevronDown
} from 'lucide-react';
import { cn } from '../utils/cn';

const STATUS_COLS = [
    { key: 'open', label: 'Open', color: 'rose', icon: AlertTriangle },
    { key: 'in_progress', label: 'In Progress', color: 'amber', icon: Clock },
    { key: 'resolved', label: 'Resolved', color: 'emerald', icon: CheckCircle2 },
];

const PRIORITY_CONFIG = {
    low: { label: 'Low', class: 'text-muted-foreground/60 bg-muted border-border' },
    medium: { label: 'Medium', class: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
    high: { label: 'High', class: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20' },
    emergency: { label: '🚨 Emergency', class: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse' },
};

const CATEGORY_ICONS = {
    plumbing: '🚿', electrical: '⚡', hvac: '❄️', appliance: '🔧',
    structural: '🏗️', pest: '🐛', cleaning: '🧹', other: '📋',
};

function SubmitModal({ onClose, onSave }) {
    const [form, setForm] = useState({ title: '', description: '', category: 'other', priority: 'medium', unit: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try { await maintenanceService.createRequest(form); onSave(); }
        catch (err) { setError(err.message || 'Failed to submit'); }
        finally { setLoading(false); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl transition-colors">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-10">
                    <h2 className="text-lg font-black text-foreground">Submit Maintenance Request</h2>
                    <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Title *</label>
                        <input required value={form.title} onChange={e => set('title', e.target.value)}
                            placeholder="e.g. Leaking faucet in bathroom"
                            className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Category</label>
                            <select value={form.category} onChange={e => set('category', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all appearance-none">
                                {Object.keys(CATEGORY_ICONS).map(c => (
                                    <option key={c} value={c} className="bg-card">{CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Priority</label>
                            <select value={form.priority} onChange={e => set('priority', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all appearance-none">
                                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                                    <option key={k} value={k} className="bg-card">{v.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Unit / Location</label>
                        <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="e.g. Apt 4B, Kitchen"
                            className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Description *</label>
                        <textarea required value={form.description} onChange={e => set('description', e.target.value)} rows={4}
                            placeholder="Describe the issue in detail..."
                            className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-all resize-none" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all font-bold">Cancel</button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black hover:opacity-90 transition-all disabled:opacity-50 shadow-lg active:scale-95 transition-transform">
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

function RequestCard({ request, isManager, onStatusChange, onAddNote }) {
    const pc = PRIORITY_CONFIG[request.priority] || PRIORITY_CONFIG.medium;
    const [noteOpen, setNoteOpen] = useState(false);
    const [noteText, setNoteText] = useState('');

    const handleNote = async () => {
        if (!noteText.trim()) return;
        await onAddNote(request._id, noteText);
        setNoteText(''); setNoteOpen(false);
    };

    return (
        <motion.div layout className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-border/80 shadow-sm transition-all">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className="text-lg leading-none mt-0.5 flex-shrink-0">{CATEGORY_ICONS[request.category] || '📋'}</span>
                    <div className="min-w-0">
                        <p className="font-bold text-foreground text-sm truncate">{request.title}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{request.requestedBy?.firstName} {request.requestedBy?.lastName}</p>
                    </div>
                </div>
                <div className={cn('flex-shrink-0 px-2 py-0.5 rounded-lg border text-[10px] font-black', pc.class)}>{pc.label}</div>
            </div>
            <p className="text-xs text-muted-foreground/80 line-clamp-2">{request.description}</p>
            {request.unit && <p className="text-[10px] text-muted-foreground/40">📍 {request.unit}</p>}
            {request.notes?.length > 0 && (
                <div className="pl-3 border-l border-border space-y-1">
                    {request.notes.slice(-1).map((n, i) => (
                        <p key={i} className="text-[10px] text-muted-foreground/60 line-clamp-1">💬 {n.text}</p>
                    ))}
                </div>
            )}
            <p className="text-[10px] text-muted-foreground/30">{new Date(request.createdAt).toLocaleDateString()}</p>
            {isManager && (
                <div className="space-y-2">
                    {request.status !== 'resolved' && request.status !== 'closed' && (
                        <div className="flex gap-1.5">
                            {request.status === 'open' && (
                                <button onClick={() => onStatusChange(request._id, 'in_progress')}
                                    className="flex-1 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black hover:bg-amber-500/20 transition-all">
                                    Start →
                                </button>
                            )}
                            {request.status === 'in_progress' && (
                                <button onClick={() => onStatusChange(request._id, 'resolved')}
                                    className="flex-1 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black hover:bg-emerald-500/20 transition-all">
                                    ✓ Resolve
                                </button>
                            )}
                            <button onClick={() => setNoteOpen(p => !p)}
                                className="px-2 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-all">
                                <MessageSquare className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                    {noteOpen && (
                        <div className="flex gap-1.5">
                            <input value={noteText} onChange={e => setNoteText(e.target.value)}
                                placeholder="Add a note..."
                                className="flex-1 px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground text-[10px] placeholder-muted-foreground/20 focus:outline-none focus:border-primary/40 transition-all" />
                            <button onClick={handleNote} className="px-2 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[10px] font-black hover:bg-primary/20 transition-all">
                                Add
                            </button>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}

export default function MaintenancePage() {
    const { user } = useAuthStore();
    const isManager = user?.role === 'manager' || user?.role === 'admin';
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [priorityFilter, setPriorityFilter] = useState('');
    const [showSubmit, setShowSubmit] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [reqRes, statsRes] = await Promise.all([
                maintenanceService.getAllRequests({ priority: priorityFilter, limit: 100 }),
                maintenanceService.getStats(),
            ]);
            setRequests(reqRes.data?.data || reqRes.data || []);
            setStats(statsRes.data?.data || statsRes.data || {});
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [priorityFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleStatusChange = async (id, status) => {
        try { await maintenanceService.updateRequest(id, { status }); fetchData(); }
        catch (e) { console.error(e); }
    };

    const handleAddNote = async (id, text) => {
        try { await maintenanceService.addNote(id, text); fetchData(); }
        catch (e) { console.error(e); }
    };

    const byStatus = (s) => requests.filter(r => r.status === s);

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-amber-400 to-orange-600" />
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400">Work Orders</p>
                    </div>
                    <h1 className="text-3xl font-black text-foreground">Maintenance</h1>
                </div>
                <button onClick={() => setShowSubmit(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-sm hover:opacity-90 transition-all shadow-lg active:scale-95 transition-transform">
                    <Plus className="w-4 h-4" /> Submit Request
                </button>
            </motion.div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Open', value: stats.open, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
                        { label: 'In Progress', value: stats.in_progress, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
                        { label: 'Resolved', value: stats.resolved, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
                        { label: 'Total', value: stats.total, color: 'text-primary', bg: 'bg-primary/10' },
                    ].map(s => (
                        <div key={s.label} className="p-4 rounded-xl border border-border bg-card shadow-sm text-center">
                            <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Priority Filter */}
            <div className="flex gap-2 flex-wrap">
                {[{ k: '', l: 'All Priorities' }, ...Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({ k, l: v.label }))].map(({ k, l }) => (
                    <button key={k} onClick={() => setPriorityFilter(k)}
                        className={cn('px-3 py-1.5 rounded-lg text-xs font-bold border transition-all', priorityFilter === k
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-300'
                            : 'bg-muted border-border text-muted-foreground hover:border-muted-foreground/30')}>
                        {l}
                    </button>
                ))}
            </div>

            {/* Kanban Columns */}
            {loading ? (
                <div className="text-center py-20 text-muted-foreground/30">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {STATUS_COLS.map(col => {
                        const cards = byStatus(col.key);
                        const ColIcon = col.icon;
                        return (
                            <div key={col.key} className="space-y-3">
                                <div className={cn('flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted border border-border shadow-sm')}>
                                    <div className="flex items-center gap-2">
                                        <ColIcon className={cn('w-4 h-4',
                                            col.key === 'open' ? 'text-rose-500' :
                                                col.key === 'in_progress' ? 'text-amber-500' : 'text-emerald-500'
                                        )} />
                                        <span className="text-sm font-black text-foreground">{col.label}</span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-md bg-muted-foreground/10 text-muted-foreground text-[10px] font-black">{cards.length}</span>
                                </div>
                                <div className="space-y-3 min-h-[200px]">
                                    {cards.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground/15 text-sm border border-dashed border-border rounded-xl">No requests</div>
                                    ) : cards.map(r => (
                                        <RequestCard key={r._id} request={r} isManager={isManager}
                                            onStatusChange={handleStatusChange} onAddNote={handleAddNote} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <AnimatePresence>
                {showSubmit && (
                    <SubmitModal onClose={() => setShowSubmit(false)} onSave={() => { setShowSubmit(false); fetchData(); }} />
                )}
            </AnimatePresence>
        </div>
    );
}

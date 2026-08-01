import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { maintenanceService } from '../services/api';
import useAuthStore from '../context/authStore';
import {
    Plus, X, Wrench, AlertTriangle, Clock, CheckCircle2, XCircle,
    Filter, RefreshCw, MessageSquare, ArrowRight, ChevronDown,
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check
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

const SLOT_CONFIG = {
    morning: { label: 'Morning', icon: '🌅', time: '8 AM - 12 PM', class: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    afternoon: { label: 'Afternoon', icon: '☀️', time: '12 PM - 4 PM', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    evening: { label: 'Evening', icon: '🌙', time: '4 PM - 8 PM', class: 'bg-violet-500/10 text-violet-500 border-violet-500/20' },
};

function SubmitModal({ onClose, onSave }) {
    const [form, setForm] = useState({ 
        title: '', 
        description: '', 
        category: 'other', 
        priority: 'medium', 
        unit: '',
        scheduledDate: '',
        scheduledSlot: 'morning'
    });
    const [hasSchedule, setHasSchedule] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        
        const payload = { ...form };
        if (!hasSchedule) {
            delete payload.scheduledDate;
            delete payload.scheduledSlot;
        }

        try { 
            await maintenanceService.createRequest(payload); 
            onSave(); 
        } catch (err) { 
            setError(err.message || 'Failed to submit'); 
        } finally { 
            setLoading(false); 
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl transition-colors overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-10">
                    <h2 className="text-lg font-black text-foreground">Submit Maintenance Request</h2>
                    <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
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
                                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer">
                                {Object.keys(CATEGORY_ICONS).map(c => (
                                    <option key={c} value={c} className="bg-card">{CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Priority</label>
                            <select value={form.priority} onChange={e => set('priority', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer">
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
                        <textarea required value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                            placeholder="Describe the issue in detail..."
                            className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-all resize-none" />
                    </div>

                    {/* Schedule visit section */}
                    <div className="pt-2 border-t border-border/60 space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={hasSchedule} onChange={e => setHasSchedule(e.target.checked)}
                                className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer" />
                            <span className="text-xs font-bold text-foreground">Schedule a repair visit slot now</span>
                        </label>

                        {hasSchedule && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-border/80 bg-muted/20">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Visit Date *</label>
                                    <input required={hasSchedule} type="date" min={new Date().toISOString().split('T')[0]}
                                        value={form.scheduledDate} onChange={e => set('scheduledDate', e.target.value)}
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs focus:outline-none focus:border-primary/50" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Time Slot *</label>
                                    <select value={form.scheduledSlot} onChange={e => set('scheduledSlot', e.target.value)}
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs focus:outline-none focus:border-primary/50 appearance-none cursor-pointer">
                                        {Object.entries(SLOT_CONFIG).map(([k, v]) => (
                                            <option key={k} value={k} className="bg-card">{v.icon} {v.label} ({v.time})</option>
                                        ))}
                                    </select>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-border/60">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all font-bold text-sm">Cancel</button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black hover:opacity-90 transition-all disabled:opacity-50 shadow-lg active:scale-95 transition-transform text-sm">
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

function BookingModal({ request, onClose, onSave }) {
    const [date, setDate] = useState(request.scheduledDate ? new Date(request.scheduledDate).toISOString().split('T')[0] : '');
    const [slot, setSlot] = useState(request.scheduledSlot || 'morning');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleBook = async (e) => {
        e.preventDefault();
        if (!date) {
            setError('Please select a visit date');
            return;
        }
        setLoading(true); setError('');
        try {
            await maintenanceService.updateRequest(request._id, {
                scheduledDate: date,
                scheduledSlot: slot
            });
            onSave();
        } catch (err) {
            setError(err.message || 'Failed to book slot');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl transition-colors p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-black text-foreground">Schedule Repair Visit</h2>
                    <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"><X className="w-4.5 h-4.5" /></button>
                </div>
                <form onSubmit={handleBook} className="space-y-4">
                    {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{error}</div>}
                    
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Select Date *</label>
                        <input required type="date" min={new Date().toISOString().split('T')[0]}
                            value={date} onChange={e => setDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Select Time Slot *</label>
                        <div className="grid grid-cols-1 gap-2">
                            {Object.entries(SLOT_CONFIG).map(([k, v]) => {
                                const selected = slot === k;
                                return (
                                    <button type="button" key={k} onClick={() => setSlot(k)}
                                        className={cn('w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-left', 
                                            selected 
                                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-sm'
                                                : 'bg-muted border-border text-muted-foreground hover:border-muted-foreground/20'
                                        )}>
                                        <span className="flex items-center gap-2">
                                            <span>{v.icon}</span>
                                            <span>{v.label}</span>
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/60">{v.time}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black hover:opacity-90 transition-all disabled:opacity-50 shadow-lg active:scale-95 transition-transform text-sm mt-2">
                        {loading ? 'Confirming...' : 'Confirm Appointment'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}

function RequestCard({ request, isManager, onStatusChange, onAddNote, onSchedule, highlighted, highlightedTicketId }) {
    const pc = PRIORITY_CONFIG[request.priority] || PRIORITY_CONFIG.medium;
    const [noteOpen, setNoteOpen] = useState(false);
    const [noteText, setNoteText] = useState('');

    const handleNote = async () => {
        if (!noteText.trim()) return;
        await onAddNote(request._id, noteText);
        setNoteText(''); setNoteOpen(false);
    };

    const sc = SLOT_CONFIG[request.scheduledSlot];

    return (
        <motion.div 
            layout 
            id={`maintenance-card-${request._id}`}
            className={cn(
                "rounded-xl border bg-card p-4 space-y-3 shadow-sm transition-all flex flex-col justify-between",
                (highlighted || highlightedTicketId === request._id)
                    ? "border-amber-500 dark:border-amber-400 shadow-lg shadow-amber-500/25 ring-2 ring-amber-500/30 scale-[1.02]"
                    : "border-border hover:border-border/80"
            )}
        >
            <div className="space-y-3">
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
                
                {/* Scheduled details stamp */}
                {request.scheduledDate ? (
                    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-black w-fit', sc?.class)}>
                        <span>{sc?.icon || '📅'}</span>
                        <span>
                            {new Date(request.scheduledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                        <span>{sc?.label} ({sc?.time})</span>
                    </div>
                ) : (
                    (request.status === 'open' || request.status === 'in_progress') && (
                        <button onClick={onSchedule}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black hover:bg-amber-500/20 transition-all w-fit mt-1">
                            <CalendarIcon className="w-3.5 h-3.5" /> Book Repair Visit
                        </button>
                    )
                )}

                {request.notes?.length > 0 && (
                    <div className="pl-3 border-l border-border space-y-1">
                        {request.notes.slice(-1).map((n, i) => (
                            <p key={i} className="text-[10px] text-muted-foreground/60 line-clamp-1">💬 {n.text}</p>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40 mt-1">
                <div className="flex items-center justify-between">
                    <p className="text-[9px] text-muted-foreground/30">{new Date(request.createdAt).toLocaleDateString()}</p>
                    {request.status === 'resolved' && (
                        <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Resolved
                        </span>
                    )}
                </div>

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
            </div>
        </motion.div>
    );
}

function CalendarView({ requests, onScheduleRequest, user }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDayRequests, setSelectedDayRequests] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const [showBookableModal, setShowBookableModal] = useState(false);

    // List of unscheduled requests for quick booking on calendar click
    const unscheduledRequests = requests.filter(r => !r.scheduledDate && (r.status === 'open' || r.status === 'in_progress'));

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const daysInMonth = () => {
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        
        const arr = [];
        // pad previous month days
        for (let i = 0; i < firstDayIndex; i++) {
            arr.push(null);
        }
        for (let d = 1; d <= totalDays; d++) {
            arr.push(new Date(year, month, d));
        }
        return arr;
    };

    const getLocalDateString = (date) => {
        if (!date) return '';
        if (typeof date === 'string') {
            return date.split('T')[0];
        }
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getRequestsForDate = (date) => {
        if (!date) return [];
        const dateStr = getLocalDateString(date);
        return requests.filter(r => {
            if (!r.scheduledDate) return false;
            const rDateStr = getLocalDateString(r.scheduledDate);
            return rDateStr === dateStr;
        });
    };

    const dayGrid = daysInMonth();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const handleDayClick = (date, dayRequests) => {
        if (!date) return;
        setSelectedDay(date);
        setSelectedDayRequests(dayRequests);
        setShowBookableModal(true);
    };

    return (
        <div className="space-y-4">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between bg-card border border-border p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-amber-500" />
                    <h2 className="text-base font-black text-foreground">
                        {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </h2>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={handlePrevMonth} className="p-2 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-all">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={handleNextMonth} className="p-2 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-all">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
                {/* Week Headers */}
                <div className="grid grid-cols-7 border-b border-border bg-muted/40">
                    {weekDays.map(d => (
                        <div key={d} className="py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Day Cells */}
                <div className="grid grid-cols-7 divide-x divide-y divide-border">
                    {dayGrid.map((date, i) => {
                        const dayReqs = getRequestsForDate(date);
                        const isToday = date && date.toDateString() === new Date().toDateString();
                        
                        return (
                            <div key={i} onClick={() => date && handleDayClick(date, dayReqs)}
                                className={cn('min-h-[100px] p-2 flex flex-col justify-between transition-all select-none',
                                    date ? 'hover:bg-muted/30 cursor-pointer bg-card' : 'bg-muted/5'
                                )}>
                                <div className="flex justify-between items-start">
                                    <span className={cn('text-xs font-black w-6 h-6 flex items-center justify-center rounded-full',
                                        isToday ? 'bg-amber-500 text-white shadow-sm' : 'text-foreground/75'
                                    )}>
                                        {date ? date.getDate() : ''}
                                    </span>
                                    {dayReqs.length > 0 && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-black">
                                            {dayReqs.length} Visit{dayReqs.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-1 mt-2">
                                    {dayReqs.slice(0, 2).map(r => {
                                        const sc = SLOT_CONFIG[r.scheduledSlot];
                                        return (
                                            <div key={r._id} className={cn('px-1.5 py-0.5 rounded text-[8px] font-extrabold truncate border', sc?.class)}>
                                                {CATEGORY_ICONS[r.category]} {r.title}
                                            </div>
                                        );
                                    })}
                                    {dayReqs.length > 2 && (
                                        <div className="text-[7px] text-muted-foreground/40 font-black uppercase tracking-wide text-right">
                                            + {dayReqs.length - 2} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Day Inspection Drawer / Dialog */}
            <AnimatePresence>
                {showBookableModal && selectedDay && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={e => e.target === e.currentTarget && setShowBookableModal(false)}>
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                            className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl transition-colors p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">Day details</p>
                                    <h3 className="text-base font-black text-foreground">
                                        {selectedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                    </h3>
                                </div>
                                <button onClick={() => setShowBookableModal(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                                    <X className="w-4.5 h-4.5" />
                                </button>
                            </div>

                            {/* Scheduled visits */}
                            <div className="space-y-3 pt-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 border-b border-border/60 pb-1">Scheduled visits ({selectedDayRequests.length})</h4>
                                {selectedDayRequests.length === 0 ? (
                                    <p className="text-xs text-muted-foreground/50 italic py-2">No visits scheduled for this day.</p>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {selectedDayRequests.map(r => {
                                            const sc = SLOT_CONFIG[r.scheduledSlot];
                                            return (
                                                <div key={r._id} className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/10">
                                                    <div className="min-w-0 space-y-0.5">
                                                        <p className="text-xs font-bold text-foreground truncate">{CATEGORY_ICONS[r.category]} {r.title}</p>
                                                        <p className="text-[9px] text-muted-foreground/50">{r.requestedBy?.firstName} {r.requestedBy?.lastName} - Unit: {r.unit || 'N/A'}</p>
                                                    </div>
                                                    <span className={cn('px-2 py-0.5 rounded-lg border text-[9px] font-black capitalize flex-shrink-0', sc?.class)}>
                                                        {r.scheduledSlot}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Book visit panel for Tenant */}
                            {(user?.role === 'tenant' || user?.role === 'user') && unscheduledRequests.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-border/60">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Schedule one of your requests here</h4>
                                    <div className="space-y-2">
                                        {unscheduledRequests.map(r => (
                                            <div key={r._id} className="flex items-center justify-between p-2 rounded-xl border border-border/80 bg-muted/20">
                                                <div className="min-w-0 pr-2">
                                                    <p className="text-xs font-bold text-foreground truncate">{CATEGORY_ICONS[r.category]} {r.title}</p>
                                                    <p className="text-[9px] text-muted-foreground/40 truncate">{r.description}</p>
                                                </div>
                                                <button onClick={() => {
                                                    setShowBookableModal(false);
                                                    onScheduleRequest(r);
                                                }}
                                                    className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-black hover:opacity-90 active:scale-95 transition-all">
                                                    Schedule
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function MaintenancePage() {
    const { user } = useAuthStore();
    const location = useLocation();
    const searchId = location.state?.searchId;
    const isManager = user?.role === 'manager' || user?.role === 'admin';
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [priorityFilter, setPriorityFilter] = useState('');
    const [showSubmit, setShowSubmit] = useState(false);
    const [activeTab, setActiveTab] = useState('board'); // 'board' or 'calendar'
    const [bookingTarget, setBookingTarget] = useState(null);
    const [highlightedTicketId, setHighlightedTicketId] = useState(null);

    // Deep link parser to handle auto-scroll and glow highlights
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const targetId = location.state?.targetEntityId || params.get('maintenanceId') || searchId;

        if (targetId && !loading && requests.length > 0) {
            const matched = requests.find(r => r._id === targetId);
            if (matched) {
                setHighlightedTicketId(targetId);

                setTimeout(() => {
                    const el = document.getElementById(`maintenance-card-${targetId}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);

                const timer = setTimeout(() => {
                    setHighlightedTicketId(null);
                }, 3000);

                return () => clearTimeout(timer);
            }
        }
    }, [location.state, location.search, searchId, requests, loading]);

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
                <div className="flex items-center gap-3">
                    {/* View Switcher Tabs */}
                    <div className="flex items-center bg-muted border border-border p-1 rounded-xl">
                        <button onClick={() => setActiveTab('board')}
                            className={cn('px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5',
                                activeTab === 'board' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            )}>
                            <Wrench className="w-3.5 h-3.5" /> Board
                        </button>
                        <button onClick={() => setActiveTab('calendar')}
                            className={cn('px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5',
                                activeTab === 'calendar' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            )}>
                            <CalendarIcon className="w-3.5 h-3.5" /> Calendar
                        </button>
                    </div>

                    <button onClick={() => setShowSubmit(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-sm hover:opacity-90 transition-all shadow-lg active:scale-95 transition-transform">
                        <Plus className="w-4 h-4" /> Submit Request
                    </button>
                </div>
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

            {/* Board vs Calendar View selection */}
            {activeTab === 'board' ? (
                <div className="space-y-4">
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
                        <div className="text-center py-20 text-muted-foreground/30 font-bold">Loading...</div>
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
                                                    onStatusChange={handleStatusChange} onAddNote={handleAddNote}
                                                    onSchedule={() => setBookingTarget(r)}
                                                    highlighted={r._id === searchId}
                                                    highlightedTicketId={highlightedTicketId} />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                /* Calendar View wrapper */
                loading ? (
                    <div className="text-center py-20 text-muted-foreground/30 font-bold">Loading...</div>
                ) : (
                    <CalendarView 
                        requests={requests} 
                        user={user}
                        onScheduleRequest={(r) => setBookingTarget(r)} 
                    />
                )
            )}

            <AnimatePresence>
                {showSubmit && (
                    <SubmitModal onClose={() => setShowSubmit(false)} onSave={() => { setShowSubmit(false); fetchData(); }} />
                )}
                {bookingTarget && (
                    <BookingModal request={bookingTarget} onClose={() => setBookingTarget(null)} onSave={() => { setBookingTarget(null); fetchData(); }} />
                )}
            </AnimatePresence>
        </div>
    );
}

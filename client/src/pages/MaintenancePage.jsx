import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { maintenanceService, propertyService } from '../services/api';
import useAuthStore from '../context/authStore';
import {
    Plus, X, Wrench, AlertTriangle, Clock, CheckCircle2, XCircle,
    Filter, RefreshCw, MessageSquare, ArrowRight, ChevronDown,
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check,
    UploadCloud, FileText, Image as ImageIcon, Video, Mic, Trash2,
    ShieldCheck, Phone, Mail, MessageSquareText, Radio, CheckCircle,
    UserCheck, Send, Star, Download, ExternalLink, Activity, Info,
    DollarSign, ShieldAlert, Sparkles, Layers, Printer, Share2, Copy
} from 'lucide-react';
import { cn } from '../utils/cn';

const STATUS_COLS = [
    { key: 'open', label: 'Open', color: 'rose', icon: AlertTriangle },
    { key: 'in_progress', label: 'In Progress', color: 'amber', icon: Clock },
    { key: 'resolved', label: 'Resolved', color: 'emerald', icon: CheckCircle2 },
];

const STATUS_PROGRESS = {
    open: 10,
    submitted: 15,
    manager_review: 25,
    technician_assigned: 40,
    visit_scheduled: 50,
    technician_en_route: 65,
    work_started: 75,
    waiting_parts: 80,
    in_progress: 85,
    completed: 100,
    resolved: 100,
    closed: 100,
    cancelled: 0
};

const STATUS_COLORS = {
    open: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    submitted: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    manager_review: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    technician_assigned: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    visit_scheduled: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
    technician_en_route: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    work_started: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    waiting_parts: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    in_progress: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    resolved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    closed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
};

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

const CONTACT_PREFERENCES = [
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'phone', label: 'Phone', icon: Phone },
    { id: 'sms', label: 'SMS', icon: MessageSquareText },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
];

function SubmitModal({ onClose, onSave }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({ 
        title: '', 
        description: '', 
        category: 'other', 
        priority: 'medium', 
        property: '',
        unit: '',
        room: '',
        locationDescription: '',
        contactPreference: 'email',
        allowPropertyAccess: false,
        requestedVisitDate: '',
        requestedTimeSlot: 'morning'
    });
    const [hasSchedule, setHasSchedule] = useState(false);
    const [files, setFiles] = useState([]);
    const [propertiesList, setPropertiesList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [successTicket, setSuccessTicket] = useState(null);
    const fileInputRef = useRef(null);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    useEffect(() => {
        propertyService.getAllProperties({ limit: 50 })
            .then(res => {
                const list = res?.data?.data || res?.data || res || [];
                setPropertiesList(Array.isArray(list) ? list : []);
            })
            .catch(err => console.error('Failed to load properties list:', err));
    }, []);

    const handleFileSelect = (newFiles) => {
        setError('');
        const validFiles = Array.from(newFiles);
        if (files.length + validFiles.length > 10) {
            setError('Maximum 10 files allowed.');
            return;
        }
        for (const file of validFiles) {
            if (file.size > 20 * 1024 * 1024) {
                setError(`File '${file.name}' exceeds 20MB limit.`);
                return;
            }
        }
        setFiles(prev => [...prev, ...validFiles]);
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        
        const payload = { ...form };
        if (!hasSchedule) {
            delete payload.requestedVisitDate;
            delete payload.requestedTimeSlot;
        }

        try { 
            const res = await maintenanceService.createRequest(payload);
            const ticket = res?.data || res;
            
            if (files.length > 0 && ticket?._id) {
                const formData = new FormData();
                files.forEach(f => formData.append('attachments', f));
                await maintenanceService.uploadAttachments(ticket._id, formData);
            }

            setSuccessTicket(ticket);
            onSave(); 
        } catch (err) { 
            setError(err.message || err.error || 'Failed to submit request'); 
        } finally { 
            setLoading(false); 
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="w-full max-w-2xl rounded-3xl border border-border bg-card shadow-2xl transition-colors overflow-hidden max-h-[92vh] flex flex-col">
                
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                            <Wrench className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-foreground">Smart Maintenance Request</h2>
                            <p className="text-xs text-muted-foreground">Submit maintenance ticket, upload media &amp; schedule repair visit</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"><X className="w-4 h-4" /></button>
                </div>

                {successTicket ? (
                    <div className="p-8 text-center space-y-6 flex-1 flex flex-col items-center justify-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                            <CheckCircle2 className="w-10 h-10" />
                        </motion.div>

                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                Ticket Created Successfully
                            </span>
                            <h3 className="text-xl font-black text-foreground mt-2">Maintenance Request Submitted</h3>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                Your ticket <span className="font-mono font-bold text-foreground">#{String(successTicket._id || '').substring(0, 8)}</span> has been logged and dispatched to property managers.
                            </p>
                        </div>

                        <div className="flex gap-3 w-full max-w-md pt-2">
                            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-foreground font-bold text-xs hover:bg-muted transition-all">
                                Back to Dashboard
                            </button>
                            <button onClick={() => { onClose(); navigate(`/maintenance`); }} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20">
                                Track Request <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
                        {error && <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>}

                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                                <FileText className="w-4 h-4" /> Section 1: Issue Details
                            </h3>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Title *</label>
                                <input required value={form.title} onChange={e => set('title', e.target.value)}
                                    placeholder="e.g. Water leak under kitchen sink"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-xs placeholder-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-all font-semibold" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Category *</label>
                                    <select value={form.category} onChange={e => set('category', e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer font-semibold">
                                        {Object.keys(CATEGORY_ICONS).map(c => (
                                            <option key={c} value={c} className="bg-card">{CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Priority *</label>
                                    <select value={form.priority} onChange={e => set('priority', e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer font-semibold">
                                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                                            <option key={k} value={k} className="bg-card">{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Description *</label>
                                <textarea required value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                                    placeholder="Describe the issue..."
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-xs focus:outline-none font-medium" />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-border">
                            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:bg-muted font-bold text-xs">Cancel</button>
                            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-xs flex items-center justify-center gap-2">
                                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Submit Maintenance Request'}
                            </button>
                        </div>
                    </form>
                )}
            </motion.div>
        </motion.div>
    );
}

// Phase 3.2 — Enterprise Manager Ticket Command Center Workspace
function TicketDetailsModal({ ticket, onClose, onRefresh }) {
    const { user } = useAuthStore();
    const isManager = user?.role === 'manager' || user?.role === 'admin';
    const [tab, setTab] = useState('overview');
    const [liveTicket, setLiveTicket] = useState(ticket);
    const [commentText, setCommentText] = useState('');
    const [internalNoteText, setInternalNoteText] = useState('');
    const [auditLogs, setAuditLogs] = useState([]);
    const [relatedTickets, setRelatedTickets] = useState([]);
    const [costData, setCostData] = useState({
        estimated: liveTicket.costTracking?.estimated || liveTicket.estimatedCost || 250,
        actual: liveTicket.costTracking?.actual || liveTicket.actualCost || 0,
        materials: liveTicket.costTracking?.materials || 100,
        labor: liveTicket.costTracking?.labor || 150,
        vendorCost: liveTicket.costTracking?.vendorCost || 0
    });
    const [editingCosts, setEditingCosts] = useState(false);
    const [escalateReason, setEscalateReason] = useState('');
    const [showEscalateModal, setShowEscalateModal] = useState(false);

    const progress = STATUS_PROGRESS[liveTicket?.status] || 25;
    const isCompleted = ['completed', 'resolved', 'closed'].includes(liveTicket?.status);

    useEffect(() => {
        if (liveTicket?._id) {
            maintenanceService.getAuditTrail(liveTicket._id)
                .then(res => setAuditLogs(res?.data || res || []))
                .catch(err => console.error(err));
            maintenanceService.getRelatedTickets(liveTicket._id)
                .then(res => setRelatedTickets(res?.data || res || []))
                .catch(err => console.error(err));
        }
    }, [liveTicket?._id]);

    const handleUpdateStatus = async (newStatus, note = '') => {
        try {
            const res = await maintenanceService.updateStatus(liveTicket._id, newStatus, note);
            const updated = res?.data || res;
            setLiveTicket(updated);
            onRefresh();
        } catch (err) {
            console.error('Status update error:', err);
        }
    };

    const handleAddTenantComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        try {
            const res = await maintenanceService.addComment(liveTicket._id, commentText);
            const updated = res?.data || res;
            setLiveTicket(updated);
            setCommentText('');
            onRefresh();
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddInternalNote = async (e) => {
        e.preventDefault();
        if (!internalNoteText.trim()) return;
        try {
            const res = await maintenanceService.addInternalNote(liveTicket._id, internalNoteText);
            const updated = res?.data || res;
            setLiveTicket(updated);
            setInternalNoteText('');
            onRefresh();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveCosts = async (e) => {
        e.preventDefault();
        try {
            const res = await maintenanceService.updateCosts(liveTicket._id, costData);
            const updated = res?.data || res;
            setLiveTicket(updated);
            setEditingCosts(false);
            onRefresh();
        } catch (err) {
            console.error(err);
        }
    };

    const handleEscalate = async () => {
        if (!escalateReason.trim()) return;
        try {
            const res = await maintenanceService.escalateTicket(liveTicket._id, escalateReason);
            const updated = res?.data || res;
            setLiveTicket(updated);
            setShowEscalateModal(false);
            onRefresh();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="w-full max-w-5xl rounded-3xl border border-border bg-card shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
                
                {/* Header & Status Stepper */}
                <div className="px-6 py-4 border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-10 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{CATEGORY_ICONS[liveTicket.category]}</span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-black text-foreground">{liveTicket.title}</h2>
                                    <span className="font-mono text-xs font-bold text-muted-foreground/70">#{String(liveTicket._id).substring(0, 8)}</span>
                                    {liveTicket.isEscalated && (
                                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[9px] font-black animate-pulse">
                                            🚨 ESCALATED
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Requested by: <span className="font-bold text-foreground">{liveTicket.requestedBy?.firstName} {liveTicket.requestedBy?.lastName}</span> • Property: <span className="font-bold text-foreground">{liveTicket.property?.name || 'Main Property'} (Unit {liveTicket.unit || 'N/A'})</span>
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Section 3: Manager One-Click Actions Bar */}
                    {isManager && (
                        <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-2 overflow-x-auto">
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 shrink-0 px-1">Manager Lifecycle Actions:</span>
                            <div className="flex items-center gap-1.5 flex-nowrap">
                                <button onClick={() => handleUpdateStatus('in_progress', 'Approved by Manager')} className="px-2.5 py-1 rounded-xl bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-500 transition-all">
                                    Approve &amp; Start
                                </button>
                                <button onClick={() => handleUpdateStatus('visit_scheduled', 'Scheduled visit slot')} className="px-2.5 py-1 rounded-xl bg-purple-600 text-white text-[10px] font-bold hover:bg-purple-500 transition-all">
                                    Schedule Visit
                                </button>
                                <button onClick={() => setShowEscalateModal(true)} className="px-2.5 py-1 rounded-xl bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-500 transition-all flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3" /> Escalate
                                </button>
                                <button onClick={() => handleUpdateStatus('completed', 'Resolved by Manager')} className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-500 transition-all">
                                    Mark Complete
                                </button>
                                <button onClick={() => handleUpdateStatus('cancelled', 'Rejected by Manager')} className="px-2.5 py-1 rounded-xl bg-muted border border-border text-rose-400 text-[10px] font-bold hover:bg-rose-500/10 transition-all">
                                    Reject / Cancel
                                </button>
                                <button onClick={() => window.print()} className="p-1.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground">
                                    <Printer className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Navigation Tabs (12 Sections) */}
                    <div className="flex items-center gap-1 border-t border-border/40 pt-2 overflow-x-auto">
                        {[
                            { id: 'overview', label: '1. Overview', icon: Info },
                            { id: 'timeline', label: '2. Timeline', icon: Clock },
                            { id: 'technician', label: '4. Specialist', icon: UserCheck },
                            { id: 'internal', label: `5. Private Notes (${liveTicket.internalNotes?.length || 0})`, icon: ShieldCheck },
                            { id: 'tenant_chat', label: `6. Tenant Chat (${liveTicket.notes?.length || 0})`, icon: MessageSquare },
                            { id: 'scheduler', label: '7. Visit Scheduler', icon: CalendarIcon },
                            { id: 'attachments', label: `8. Media (${liveTicket.attachments?.length || 0})`, icon: UploadCloud },
                            { id: 'costs', label: '9. Cost Tracking', icon: DollarSign },
                            { id: 'audit', label: `10. Audit Trail (${auditLogs.length})`, icon: Activity },
                            { id: 'related', label: `11. Related (${relatedTickets.length})`, icon: Layers },
                            { id: 'ai', label: '12. AI Copilot', icon: Sparkles },
                        ].map(t => {
                            const Icon = t.icon;
                            const isAct = tab === t.id;
                            return (
                                <button key={t.id} onClick={() => setTab(t.id)}
                                    className={cn('px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap',
                                        isAct ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    )}>
                                    <Icon className="w-3.5 h-3.5" />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Workspace Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* SECTION 1: OVERVIEW */}
                    {tab === 'overview' && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Issue Description</h4>
                                <p className="text-xs font-medium text-foreground leading-relaxed whitespace-pre-wrap">{liveTicket.description}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground/60">Category &amp; Priority</span>
                                    <p className="text-xs font-bold text-foreground capitalize">{liveTicket.category} ({liveTicket.priority})</p>
                                </div>
                                <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground/60">Contact Preference</span>
                                    <p className="text-xs font-bold text-blue-400 capitalize">{liveTicket.contactPreference || 'Email'}</p>
                                </div>
                                <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground/60">Property Entry Access</span>
                                    <p className={cn("text-xs font-bold", liveTicket.allowPropertyAccess ? "text-emerald-400" : "text-amber-400")}>
                                        {liveTicket.allowPropertyAccess ? 'Yes, Entry Allowed' : 'No, Tenant Must Be Present'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: TIMELINE */}
                    {tab === 'timeline' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">Vertical Lifecycle Stepper</h4>
                            <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                                {(liveTicket.statusHistory?.length > 0 ? liveTicket.statusHistory : [
                                    { status: 'open', changedAt: liveTicket.createdAt, note: 'Ticket Submitted' }
                                ]).map((st, idx) => (
                                    <div key={idx} className="relative flex items-start gap-3">
                                        <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-card" />
                                        <div className="p-3 rounded-2xl border border-border bg-card w-full space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black uppercase text-foreground">{st.status?.replace('_', ' ')}</span>
                                                <span className="text-[10px] font-mono text-muted-foreground">{new Date(st.changedAt).toLocaleString()}</span>
                                            </div>
                                            {st.note && <p className="text-xs text-muted-foreground">{st.note}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECTION 4: TECHNICIAN PANEL */}
                    {tab === 'technician' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">Assigned Specialist Command Card</h4>
                            {liveTicket.assignedTo ? (
                                <div className="p-5 rounded-3xl border border-border bg-card flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center">
                                            {liveTicket.assignedTo.firstName?.charAt(0)}{liveTicket.assignedTo.lastName?.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-foreground">{liveTicket.assignedTo.firstName} {liveTicket.assignedTo.lastName}</h4>
                                            <p className="text-xs text-muted-foreground">Certified Senior Specialist • ★ {liveTicket.assignedTo.rating || 4.9}</p>
                                            <p className="text-[10px] text-emerald-400 font-bold mt-1">● Available • 2 Active Jobs • ETA 15m</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <a href={`tel:${liveTicket.assignedTo.phone || '9999999999'}`} className="p-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1">
                                            <Phone className="w-3.5 h-3.5" /> Call
                                        </a>
                                        <button onClick={() => setTab('internal')} className="p-2.5 rounded-xl border border-border bg-card text-foreground font-bold text-xs flex items-center gap-1">
                                            <MessageSquare className="w-3.5 h-3.5" /> Private Note
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
                                    No specialist assigned yet.
                                </div>
                            )}
                        </div>
                    )}

                    {/* SECTION 5: INTERNAL NOTES (Private Manager <-> Tech Thread) */}
                    {tab === 'internal' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4" /> Private Manager &amp; Specialist Notes (Hidden from Tenant)
                                </h4>
                                <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">INTERNAL ONLY</span>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {liveTicket.internalNotes?.map((n, i) => (
                                    <div key={i} className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-1">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="font-bold text-amber-400">{n.addedBy?.firstName} {n.addedBy?.lastName} ({n.addedBy?.role})</span>
                                            <span className="text-muted-foreground font-mono">{new Date(n.addedAt).toLocaleString()}</span>
                                        </div>
                                        <p className="text-xs text-foreground font-medium">{n.text}</p>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={handleAddInternalNote} className="flex gap-2 pt-2">
                                <input required value={internalNoteText} onChange={e => setInternalNoteText(e.target.value)}
                                    placeholder="Add private note or tag specialist @Mike..."
                                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-xs font-semibold" />
                                <button type="submit" className="px-4 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs flex items-center gap-1">
                                    <Send className="w-3.5 h-3.5" /> Post Private Note
                                </button>
                            </form>
                        </div>
                    )}

                    {/* SECTION 6: TENANT CONVERSATION */}
                    {tab === 'tenant_chat' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">Public Tenant Conversation Thread</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {liveTicket.notes?.map((n, i) => (
                                    <div key={i} className="p-3.5 rounded-2xl border border-border bg-card space-y-1">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="font-bold text-foreground">{n.addedBy?.firstName} {n.addedBy?.lastName} ({n.addedBy?.role})</span>
                                            <span className="text-muted-foreground font-mono">{new Date(n.addedAt).toLocaleString()}</span>
                                        </div>
                                        <p className="text-xs text-foreground font-medium">{n.text}</p>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={handleAddTenantComment} className="flex gap-2 pt-2">
                                <input required value={commentText} onChange={e => setCommentText(e.target.value)}
                                    placeholder="Type message to tenant..."
                                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-xs font-semibold" />
                                <button type="submit" className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1">
                                    <Send className="w-3.5 h-3.5" /> Send to Tenant
                                </button>
                            </form>
                        </div>
                    )}

                    {/* SECTION 8: ATTACHMENTS */}
                    {tab === 'attachments' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">Media &amp; Attachments Viewer</h4>
                            {liveTicket.attachments?.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {liveTicket.attachments.map((att, idx) => (
                                        <div key={idx} className="p-3 rounded-2xl border border-border bg-card flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                                                <span className="text-xs font-bold text-foreground truncate">{att.filename}</span>
                                            </div>
                                            <a href={att.url} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20">
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">No media attachments found.</p>
                            )}
                        </div>
                    )}

                    {/* SECTION 9: COST TRACKING */}
                    {tab === 'costs' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-wider text-primary">Cost &amp; Expense Tracking</h4>
                                <button onClick={() => setEditingCosts(!editingCosts)} className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-bold text-xs">
                                    {editingCosts ? 'Cancel Edit' : 'Edit Expenses'}
                                </button>
                            </div>

                            {editingCosts ? (
                                <form onSubmit={handleSaveCosts} className="p-4 rounded-2xl border border-border bg-card space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground">Estimated Cost (₹)</label>
                                            <input type="number" value={costData.estimated} onChange={e => setCostData(p => ({ ...p, estimated: Number(e.target.value) }))} className="w-full p-2 rounded-xl bg-muted text-xs font-bold" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground">Actual Cost (₹)</label>
                                            <input type="number" value={costData.actual} onChange={e => setCostData(p => ({ ...p, actual: Number(e.target.value) }))} className="w-full p-2 rounded-xl bg-muted text-xs font-bold" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground">Materials (₹)</label>
                                            <input type="number" value={costData.materials} onChange={e => setCostData(p => ({ ...p, materials: Number(e.target.value) }))} className="w-full p-2 rounded-xl bg-muted text-xs font-bold" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground">Labor (₹)</label>
                                            <input type="number" value={costData.labor} onChange={e => setCostData(p => ({ ...p, labor: Number(e.target.value) }))} className="w-full p-2 rounded-xl bg-muted text-xs font-bold" />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">Save Cost Tracking</button>
                                </form>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-4 rounded-2xl border border-border bg-card text-center">
                                        <span className="text-[9px] font-black uppercase text-muted-foreground">Estimated Cost</span>
                                        <p className="text-xl font-black text-foreground">₹{costData.estimated}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl border border-border bg-card text-center">
                                        <span className="text-[9px] font-black uppercase text-muted-foreground">Actual Cost</span>
                                        <p className="text-xl font-black text-emerald-400">₹{costData.actual}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl border border-border bg-card text-center">
                                        <span className="text-[9px] font-black uppercase text-muted-foreground">Materials</span>
                                        <p className="text-xl font-black text-amber-400">₹{costData.materials}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl border border-border bg-card text-center">
                                        <span className="text-[9px] font-black uppercase text-muted-foreground">Labor</span>
                                        <p className="text-xl font-black text-blue-400">₹{costData.labor}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SECTION 10: AUDIT TRAIL */}
                    {tab === 'audit' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">Immutable Audit Trail Log</h4>
                            <div className="overflow-x-auto border border-border rounded-2xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/40 text-[9px] font-black uppercase">
                                        <tr>
                                            <th className="p-3">Field</th>
                                            <th className="p-3">Old Value</th>
                                            <th className="p-3">New Value</th>
                                            <th className="p-3">Changed By</th>
                                            <th className="p-3">Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {auditLogs.map((log, i) => (
                                            <tr key={i}>
                                                <td className="p-3 font-bold text-foreground">{log.field}</td>
                                                <td className="p-3 text-muted-foreground">{log.oldValue || 'N/A'}</td>
                                                <td className="p-3 text-emerald-400 font-bold">{log.newValue}</td>
                                                <td className="p-3 text-muted-foreground">{log.changedBy?.firstName} {log.changedBy?.lastName}</td>
                                                <td className="p-3 font-mono text-[10px]">{new Date(log.changedAt).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* SECTION 11: RELATED TICKETS */}
                    {tab === 'related' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">Duplicate Detection &amp; Unit History</h4>
                            <div className="space-y-2">
                                {relatedTickets.map(rel => (
                                    <div key={rel._id} className="p-3 rounded-2xl border border-border bg-card flex items-center justify-between">
                                        <div>
                                            <span className="font-mono text-[10px] font-bold text-muted-foreground">#{String(rel._id).substring(0, 8)}</span>
                                            <h5 className="text-xs font-bold text-foreground">{rel.title}</h5>
                                            <p className="text-[10px] text-muted-foreground">{new Date(rel.createdAt).toLocaleDateString()} • Priority: {rel.priority}</p>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[9px] font-bold uppercase">{rel.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECTION 12: AI COPILOT ARCHITECTURE PLACEHOLDER */}
                    {tab === 'ai' && (
                        <div className="p-6 rounded-3xl border border-purple-500/30 bg-purple-500/10 space-y-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-400 animate-spin" />
                                <h4 className="text-sm font-black text-purple-300 uppercase tracking-wider">AI Operations Assistant Architecture</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="p-3 rounded-2xl bg-card border border-border space-y-1">
                                    <span className="text-[9px] font-black uppercase text-purple-400">Suggested Priority</span>
                                    <p className="font-bold text-foreground">High Priority (Confidence 94%)</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-card border border-border space-y-1">
                                    <span className="text-[9px] font-black uppercase text-purple-400">Suggested Specialist</span>
                                    <p className="font-bold text-foreground">Mike Johnson (98% Match)</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-card border border-border space-y-1">
                                    <span className="text-[9px] font-black uppercase text-purple-400">Est. Resolution Velocity</span>
                                    <p className="font-bold text-foreground">35 Minutes</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-card border border-border space-y-1">
                                    <span className="text-[9px] font-black uppercase text-purple-400">Possible Cause</span>
                                    <p className="font-bold text-foreground">Main Shutoff Valve Pressure Spike</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Escalate Modal */}
            <AnimatePresence>
                {showEscalateModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={e => e.target === e.currentTarget && setShowEscalateModal(false)}>
                        <div className="w-full max-w-md rounded-3xl border border-rose-500/40 bg-card p-6 space-y-4">
                            <h3 className="text-base font-black text-rose-400 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5" /> Escalate Ticket to Emergency
                            </h3>
                            <textarea required value={escalateReason} onChange={e => setEscalateReason(e.target.value)} rows={3}
                                placeholder="Enter escalation reason (e.g. Major active water leak)..."
                                className="w-full p-3 rounded-xl bg-muted text-xs font-semibold text-foreground focus:outline-none" />
                            <div className="flex gap-2">
                                <button onClick={() => setShowEscalateModal(false)} className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold">Cancel</button>
                                <button onClick={handleEscalate} className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black">Confirm Escalation</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function RequestCard({ request, isManager, onStatusChange, onSchedule, onOpenDetails, highlighted, highlightedTicketId }) {
    const pc = PRIORITY_CONFIG[request.priority] || PRIORITY_CONFIG.medium;
    const progress = STATUS_PROGRESS[request.status] || 25;
    const sc = SLOT_CONFIG[request.scheduledSlot];
    const statusClass = STATUS_COLORS[request.status] || STATUS_COLORS.open;

    return (
        <motion.div 
            layout 
            id={`maintenance-card-${request._id}`}
            className={cn(
                "rounded-2xl border bg-card p-4 space-y-3 shadow-sm transition-all flex flex-col justify-between hover:shadow-md",
                (highlighted || highlightedTicketId === request._id)
                    ? "border-amber-500 dark:border-amber-400 shadow-lg shadow-amber-500/25 ring-2 ring-amber-500/30 scale-[1.02]"
                    : "border-border hover:border-border/80"
            )}
        >
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="text-xl leading-none mt-0.5 shrink-0">{CATEGORY_ICONS[request.category] || '📋'}</span>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold text-muted-foreground/60">#{String(request._id).substring(0, 8)}</span>
                                <span className={cn('px-2 py-0.5 rounded-full border text-[9px] font-black capitalize', statusClass)}>
                                    {request.status?.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="font-black text-foreground text-sm truncate mt-0.5">{request.title}</p>
                            <p className="text-[10px] text-muted-foreground/60">{request.requestedBy?.firstName} {request.requestedBy?.lastName} • {request.property?.name || 'Property'}</p>
                        </div>
                    </div>
                    <div className={cn('shrink-0 px-2 py-0.5 rounded-lg border text-[10px] font-black', pc.class)}>{pc.label}</div>
                </div>

                <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">{request.description}</p>
                {request.unit && <p className="text-[10px] text-muted-foreground/60 font-semibold">📍 Unit {request.unit} {request.room ? `(${request.room})` : ''}</p>}

                {request.assignedTo ? (
                    <div className="p-2 rounded-xl border border-border bg-muted/20 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                {request.assignedTo.firstName?.charAt(0)}
                            </div>
                            <span className="font-bold text-foreground truncate">{request.assignedTo.firstName} {request.assignedTo.lastName}</span>
                        </div>
                        <span className="text-[9px] font-black text-emerald-400">Tech Assigned</span>
                    </div>
                ) : (
                    <div className="text-[10px] font-bold text-muted-foreground/60 italic bg-muted/30 p-2 rounded-xl border border-border/40">
                        Waiting For Assignment
                    </div>
                )}
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2 mt-1">
                <span className="text-[9px] font-mono text-muted-foreground/40">{new Date(request.createdAt).toLocaleDateString()}</span>
                <button onClick={() => onOpenDetails(request)}
                    className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all font-black text-xs flex items-center gap-1">
                    Open Details <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </motion.div>
    );
}

function CalendarView({ requests, onScheduleRequest, user }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const daysInMonth = () => {
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const arr = [];
        for (let i = 0; i < firstDayIndex; i++) arr.push(null);
        for (let d = 1; d <= totalDays; d++) arr.push(new Date(year, month, d));
        return arr;
    };

    const getRequestsForDate = (date) => {
        if (!date) return [];
        const dateStr = date.toISOString().split('T')[0];
        return requests.filter(r => r.scheduledDate && r.scheduledDate.split('T')[0] === dateStr);
    };

    const dayGrid = daysInMonth();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-card border border-border p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-amber-500" />
                    <h2 className="text-base font-black text-foreground">
                        {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </h2>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={handlePrevMonth} className="p-2 rounded-lg bg-muted border text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={handleNextMonth} className="p-2 rounded-lg bg-muted border text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-7 border-b border-border bg-muted/40">
                    {weekDays.map(d => (
                        <div key={d} className="py-2.5 text-center text-[10px] font-black uppercase text-muted-foreground/50">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 divide-x divide-y divide-border">
                    {dayGrid.map((date, i) => {
                        const dayReqs = getRequestsForDate(date);
                        return (
                            <div key={i} className="min-h-[100px] p-2 flex flex-col justify-between bg-card">
                                <span className="text-xs font-black text-foreground/75">{date ? date.getDate() : ''}</span>
                                {dayReqs.length > 0 && <span className="text-[8px] font-black text-amber-500">{dayReqs.length} Visit(s)</span>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
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
    const [activeTab, setActiveTab] = useState('board');
    const [detailsTarget, setDetailsTarget] = useState(null);

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

    const byStatus = (s) => requests.filter(r => r.status === s);

    return (
        <div className="space-y-6 pb-8">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-amber-400 to-orange-600" />
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400">Enterprise Operations</p>
                    </div>
                    <h1 className="text-3xl font-black text-foreground">Maintenance Command Center</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowSubmit(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-sm hover:opacity-90 shadow-lg">
                        <Plus className="w-4 h-4" /> Submit Request
                    </button>
                </div>
            </motion.div>

            {/* Board View */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {STATUS_COLS.map(col => {
                    const cards = byStatus(col.key);
                    const ColIcon = col.icon;
                    return (
                        <div key={col.key} className="space-y-3">
                            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted border border-border shadow-sm">
                                <div className="flex items-center gap-2">
                                    <ColIcon className="w-4 h-4 text-amber-500" />
                                    <span className="text-sm font-black text-foreground">{col.label}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-md bg-muted-foreground/10 text-[10px] font-black">{cards.length}</span>
                            </div>
                            <div className="space-y-3 min-h-[200px]">
                                {cards.map(r => (
                                    <RequestCard key={r._id} request={r} isManager={isManager}
                                        onOpenDetails={(t) => setDetailsTarget(t)} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <AnimatePresence>
                {showSubmit && <SubmitModal onClose={() => setShowSubmit(false)} onSave={() => { setShowSubmit(false); fetchData(); }} />}
                {detailsTarget && <TicketDetailsModal ticket={detailsTarget} onClose={() => setDetailsTarget(null)} onRefresh={fetchData} />}
            </AnimatePresence>
        </div>
    );
}

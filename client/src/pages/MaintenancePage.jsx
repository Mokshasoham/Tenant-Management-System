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
    UserCheck, Send, Star, Download, ExternalLink, Activity, Info
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
                            <p className="text-xs text-muted-foreground">Submit maintenance ticket, upload media & schedule repair visit</p>
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

                        <div className="grid grid-cols-2 gap-3 w-full max-w-md p-4 rounded-2xl border border-border bg-muted/30 text-left">
                            <div>
                                <span className="text-[9px] font-black uppercase text-muted-foreground">Status & Priority</span>
                                <div className="text-xs font-bold text-foreground capitalize mt-0.5 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                    {successTicket.priority} Priority ({successTicket.status})
                                </div>
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase text-muted-foreground">Est. Response Time</span>
                                <div className="text-xs font-bold text-emerald-400 mt-0.5">
                                    {successTicket.priority === 'emergency' ? '< 30 Minutes' : '< 24 Hours'}
                                </div>
                            </div>
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

                        {form.priority === 'emergency' && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 animate-bounce text-rose-400" />
                                <div className="text-xs space-y-1">
                                    <p className="font-black text-rose-300 uppercase tracking-wider">🚨 EMERGENCY MAINTENANCE PROTOCOL</p>
                                    <p className="text-rose-200/80 leading-relaxed">
                                        Property Manager and On-Call Technician will be notified immediately. Response SLA timer set to **30 minutes**.
                                    </p>
                                </div>
                            </motion.div>
                        )}

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

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5 sm:col-span-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Property</label>
                                    <select value={form.property} onChange={e => set('property', e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer font-semibold">
                                        <option value="">Select Property...</option>
                                        {propertiesList.map(p => (
                                            <option key={p._id} value={p._id} className="bg-card">{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Unit / Apartment</label>
                                    <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="e.g. Apt 4B"
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-xs placeholder-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-all font-semibold" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Room / Area</label>
                                    <input value={form.room} onChange={e => set('room', e.target.value)} placeholder="e.g. Kitchen, Master Bath"
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-xs placeholder-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-all font-semibold" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Location Description</label>
                                <input value={form.locationDescription} onChange={e => set('locationDescription', e.target.value)} placeholder="e.g. Under main sink behind water heater valve"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-xs placeholder-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-all font-semibold" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Description *</label>
                                <textarea required value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                                    placeholder="Describe the issue, symptoms, and any actions already taken..."
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-xs placeholder-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-all resize-none font-medium" />
                            </div>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-border/60">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                                    <UploadCloud className="w-4 h-4" /> Section 2: Attachments (Images, Videos, Docs, Voice)
                                </h3>
                                <span className="text-[10px] font-bold text-muted-foreground">{files.length} / 10 files selected</span>
                            </div>

                            <div
                                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={e => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files); }}
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2",
                                    isDragging
                                        ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
                                        : "border-border hover:border-blue-500/40 bg-muted/20 hover:bg-muted/30"
                                )}
                            >
                                <input ref={fileInputRef} type="file" multiple onChange={e => handleFileSelect(e.target.files)} className="hidden" />
                                <UploadCloud className="w-8 h-8 text-blue-400 opacity-80" />
                                <div>
                                    <p className="text-xs font-bold text-foreground">Click or Drag & Drop media files here</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Images, Videos, PDFs, Word docs, Voice notes (Max 20MB per file)</p>
                                </div>
                            </div>

                            {files.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                    {files.map((file, idx) => {
                                        const isImg = file.type.startsWith('image/');
                                        const isVid = file.type.startsWith('video/');
                                        const isAudio = file.type.startsWith('audio/');
                                        return (
                                            <div key={idx} className="p-2.5 rounded-xl border border-border bg-card/60 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="p-2 rounded-lg bg-muted shrink-0">
                                                        {isImg && <ImageIcon className="w-4 h-4 text-emerald-400" />}
                                                        {isVid && <Video className="w-4 h-4 text-blue-400" />}
                                                        {isAudio && <Mic className="w-4 h-4 text-purple-400" />}
                                                        {!isImg && !isVid && !isAudio && <FileText className="w-4 h-4 text-amber-400" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-foreground truncate">{file.name}</p>
                                                        <p className="text-[9px] text-muted-foreground font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => removeFile(idx)} className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 pt-3 border-t border-border/60">
                            <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                                <Phone className="w-4 h-4" /> Section 3: Contact Preference
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {CONTACT_PREFERENCES.map(pref => {
                                    const Icon = pref.icon;
                                    const isSel = form.contactPreference === pref.id;
                                    return (
                                        <button
                                            type="button"
                                            key={pref.id}
                                            onClick={() => set('contactPreference', pref.id)}
                                            className={cn(
                                                "p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all",
                                                isSel
                                                    ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20"
                                                    : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {pref.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-border/60">
                            <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4" /> Section 4: Property Access Permission
                            </h3>
                            <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
                                <p className="text-xs font-semibold text-foreground">Can technician enter property if tenant is unavailable?</p>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                                        <input
                                            type="radio"
                                            name="allowPropertyAccess"
                                            checked={form.allowPropertyAccess === true}
                                            onChange={() => set('allowPropertyAccess', true)}
                                            className="w-4 h-4 text-blue-600 border-border bg-card"
                                        />
                                        Yes, permission granted
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                                        <input
                                            type="radio"
                                            name="allowPropertyAccess"
                                            checked={form.allowPropertyAccess === false}
                                            onChange={() => set('allowPropertyAccess', false)}
                                            className="w-4 h-4 text-blue-600 border-border bg-card"
                                        />
                                        No, tenant must be present
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-border/60">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={hasSchedule} onChange={e => setHasSchedule(e.target.checked)}
                                    className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-0 cursor-pointer" />
                                <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                                    <CalendarIcon className="w-4 h-4" /> Section 5: Schedule Repair Visit Slot
                                </span>
                            </label>

                            {hasSchedule && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl border border-border bg-muted/20">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Requested Visit Date *</label>
                                        <input required={hasSchedule} type="date" min={new Date().toISOString().split('T')[0]}
                                            value={form.requestedVisitDate} onChange={e => set('requestedVisitDate', e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl bg-card border border-border text-foreground text-xs focus:outline-none focus:border-primary/50 font-bold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Time Slot *</label>
                                        <select value={form.requestedTimeSlot} onChange={e => set('requestedTimeSlot', e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl bg-card border border-border text-foreground text-xs focus:outline-none focus:border-primary/50 appearance-none cursor-pointer font-bold">
                                            {Object.entries(SLOT_CONFIG).map(([k, v]) => (
                                                <option key={k} value={k} className="bg-card">{v.icon} {v.label} ({v.time})</option>
                                            ))}
                                        </select>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-border">
                            <button type="button" onClick={onClose}
                                className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all font-bold text-xs">Cancel</button>
                            <button type="submit" disabled={loading}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black hover:opacity-90 transition-all disabled:opacity-50 shadow-lg active:scale-95 text-xs flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" /> Submitting & Uploading...
                                    </>
                                ) : (
                                    'Submit Maintenance Request'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </motion.div>
        </motion.div>
    );
}

function TicketDetailsModal({ ticket, onClose, onRefresh }) {
    const { user } = useAuthStore();
    const [tab, setTab] = useState('overview');
    const [commentText, setCommentText] = useState('');
    const [commentFile, setCommentFile] = useState(null);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [ratingScore, setRatingScore] = useState(ticket?.rating?.score || 5);
    const [ratingFeedback, setRatingFeedback] = useState(ticket?.rating?.feedback || '');
    const [submittingRating, setSubmittingRating] = useState(false);
    const [ratingDone, setRatingDone] = useState(!!ticket?.rating?.score);
    const [liveTicket, setLiveTicket] = useState(ticket);

    const progress = STATUS_PROGRESS[liveTicket?.status] || 25;
    const isCompleted = ['completed', 'resolved', 'closed'].includes(liveTicket?.status);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        setSubmittingComment(true);
        try {
            let fileUrl = null;
            if (commentFile) {
                const formData = new FormData();
                formData.append('attachments', commentFile);
                const res = await maintenanceService.uploadAttachments(liveTicket._id, formData);
                const updated = res?.data || res;
                fileUrl = updated.attachments?.slice(-1)[0]?.url;
            }

            const res = await maintenanceService.addComment(liveTicket._id, commentText, fileUrl);
            const updated = res?.data || res;
            setLiveTicket(updated);
            setCommentText('');
            setCommentFile(null);
            onRefresh();
        } catch (err) {
            console.error('Comment error:', err);
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleSubmitRating = async (e) => {
        e.preventDefault();
        setSubmittingRating(true);
        try {
            const res = await maintenanceService.submitRating(liveTicket._id, ratingScore, ratingFeedback);
            const updated = res?.data || res;
            setLiveTicket(updated);
            setRatingDone(true);
            onRefresh();
        } catch (err) {
            console.error('Rating submission error:', err);
        } finally {
            setSubmittingRating(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="w-full max-w-3xl rounded-3xl border border-border bg-card shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-10 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xl">{CATEGORY_ICONS[liveTicket.category]}</span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-black text-foreground">{liveTicket.title}</h2>
                                    <span className="font-mono text-xs font-bold text-muted-foreground/70">#{String(liveTicket._id).substring(0, 8)}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Created on {new Date(liveTicket.createdAt).toLocaleString()} • Priority: <span className="capitalize font-bold text-foreground">{liveTicket.priority}</span>
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Progress Bar & Live Status */}
                    <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                            <span className={cn('px-2.5 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-black', STATUS_COLORS[liveTicket.status] || STATUS_COLORS.open)}>
                                Status: {liveTicket.status?.replace('_', ' ')}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">Progress: {progress}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500" />
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-1 border-t border-border/40 pt-2 overflow-x-auto">
                        {[
                            { id: 'overview', label: 'Overview', icon: Info },
                            { id: 'timeline', label: 'Timeline & History', icon: Clock },
                            { id: 'technician', label: 'Technician & Visit', icon: UserCheck },
                            { id: 'attachments', label: `Media (${liveTicket.attachments?.length || 0})`, icon: UploadCloud },
                            { id: 'comments', label: `Comments (${liveTicket.notes?.length || 0})`, icon: MessageSquare },
                            ...(isCompleted ? [{ id: 'completion', label: 'Resolution & Rating', icon: Star }] : [])
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

                {/* Body Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* TAB 1: OVERVIEW */}
                    {tab === 'overview' && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Description</h4>
                                <p className="text-xs font-medium text-foreground leading-relaxed whitespace-pre-wrap">{liveTicket.description}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Location Details</h4>
                                    <div className="text-xs space-y-1 font-semibold text-foreground">
                                        <p>📍 Property: {liveTicket.property?.name || 'Main Property'}</p>
                                        <p>🚪 Unit: {liveTicket.unit || 'N/A'}</p>
                                        <p>🛋️ Room: {liveTicket.room || 'N/A'}</p>
                                        <p>🔍 Spec: {liveTicket.locationDescription || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Preferences & Permissions</h4>
                                    <div className="text-xs space-y-1 font-semibold text-foreground">
                                        <p>📞 Contact via: <span className="capitalize font-bold text-blue-400">{liveTicket.contactPreference || 'Email'}</span></p>
                                        <p>🔑 Technician Entry Permission: <span className={cn('font-bold', liveTicket.allowPropertyAccess ? 'text-emerald-400' : 'text-amber-400')}>{liveTicket.allowPropertyAccess ? 'Yes, Allowed' : 'No, Tenant Must Be Present'}</span></p>
                                        <p>💻 Submitted via: <span className="font-mono text-muted-foreground">{liveTicket.submissionSource || 'Web'} ({liveTicket.createdFromIP || '127.0.0.1'})</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: TIMELINE */}
                    {tab === 'timeline' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">Enterprise Lifecycle Timeline</h4>
                            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                                {(liveTicket.statusHistory?.length > 0 ? liveTicket.statusHistory : [
                                    { status: 'open', changedAt: liveTicket.createdAt, note: 'Ticket Submitted' }
                                ]).map((st, idx) => (
                                    <div key={idx} className="relative flex items-start gap-3">
                                        <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-card" />
                                        <div className="p-3.5 rounded-2xl border border-border bg-muted/20 w-full space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black uppercase text-foreground">{st.status?.replace('_', ' ')}</span>
                                                <span className="text-[10px] font-mono text-muted-foreground">{new Date(st.changedAt).toLocaleString()}</span>
                                            </div>
                                            {st.note && <p className="text-xs text-muted-foreground">{st.note}</p>}
                                            {st.changedBy && (
                                                <p className="text-[9px] text-muted-foreground/60 font-semibold">By: {st.changedBy.firstName} {st.changedBy.lastName} ({st.changedBy.role})</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: TECHNICIAN */}
                    {tab === 'technician' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">Assigned Specialist & Visit Schedule</h4>
                            {liveTicket.assignedTo ? (
                                <div className="p-5 rounded-3xl border border-border bg-muted/30 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-lg">
                                            {liveTicket.assignedTo.firstName?.charAt(0)}{liveTicket.assignedTo.lastName?.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-foreground">{liveTicket.assignedTo.firstName} {liveTicket.assignedTo.lastName}</h4>
                                            <p className="text-xs text-muted-foreground capitalize">{liveTicket.assignedTo.role || 'Certified Maintenance Technician'}</p>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-amber-400 font-bold">
                                                <span>★ {liveTicket.assignedTo.rating || 4.9}</span>
                                                <span className="text-muted-foreground font-normal">• {liveTicket.assignedTo.experience || '5+ Yrs Exp'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Active Technician</span>
                                        {liveTicket.assignedTo.phone && (
                                            <p className="text-xs font-mono font-bold text-foreground mt-2">📞 {liveTicket.assignedTo.phone}</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 rounded-2xl border border-dashed border-border bg-muted/10 text-center text-muted-foreground space-y-1">
                                    <UserCheck className="w-8 h-8 opacity-40 mx-auto" />
                                    <p className="text-xs font-bold">Waiting For Technician Assignment</p>
                                    <p className="text-[10px] opacity-60">Property manager is dispatching an on-call specialist.</p>
                                </div>
                            )}

                            {/* Visit Info */}
                            <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Scheduled Repair Slot</h4>
                                {liveTicket.requestedVisitDate || liveTicket.scheduledDate ? (
                                    <div className="text-xs font-bold text-foreground flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-amber-500" />
                                        <span>Visit Date: {new Date(liveTicket.requestedVisitDate || liveTicket.scheduledDate).toLocaleDateString()}</span>
                                        <span className="uppercase text-blue-400 font-black">({liveTicket.requestedTimeSlot || liveTicket.scheduledSlot || 'Morning'})</span>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground/60 italic">No visit date scheduled yet.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: ATTACHMENTS */}
                    {tab === 'attachments' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">Media & Document Attachments</h4>
                            {liveTicket.attachments?.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {liveTicket.attachments.map((att, idx) => (
                                        <div key={idx} className="p-3 rounded-2xl border border-border bg-muted/20 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="p-2.5 rounded-xl bg-card border border-border text-blue-400">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-foreground truncate">{att.filename}</p>
                                                    <p className="text-[9px] text-muted-foreground font-mono">{(att.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                            </div>
                                            <a href={att.url} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all shrink-0">
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground/60 italic">No media files attached to this request.</p>
                            )}
                        </div>
                    )}

                    {/* TAB 5: COMMENTS */}
                    {tab === 'comments' && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">Conversation & Technical Notes</h4>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                {liveTicket.notes?.map((n, i) => (
                                    <div key={i} className="p-3.5 rounded-2xl border border-border bg-muted/20 space-y-1">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="font-black text-foreground">{n.addedBy?.firstName} {n.addedBy?.lastName} ({n.addedBy?.role || 'User'})</span>
                                            <span className="text-muted-foreground font-mono">{new Date(n.addedAt).toLocaleString()}</span>
                                        </div>
                                        <p className="text-xs text-foreground/90 font-medium">{n.text}</p>
                                        {n.attachmentUrl && (
                                            <a href={n.attachmentUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-400 hover:underline flex items-center gap-1 pt-1">
                                                <ExternalLink className="w-3 h-3" /> View Attachment
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Add Comment Form */}
                            <form onSubmit={handleAddComment} className="pt-2 flex gap-2">
                                <input required value={commentText} onChange={e => setCommentText(e.target.value)}
                                    placeholder="Type a comment or technical note..."
                                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-xs placeholder-muted-foreground/40 focus:outline-none focus:border-primary/50 font-semibold" />
                                <button type="submit" disabled={submittingComment}
                                    className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20">
                                    <Send className="w-3.5 h-3.5" /> Post
                                </button>
                            </form>
                        </div>
                    )}

                    {/* TAB 6: COMPLETION & RATING */}
                    {tab === 'completion' && isCompleted && (
                        <div className="space-y-4">
                            <div className="p-5 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4" /> Work Order Completed
                                </h4>
                                <p className="text-xs text-emerald-200/80">
                                    Resolved on {new Date(liveTicket.completedAt || liveTicket.resolvedAt || Date.now()).toLocaleString()}. Resolution Time: <span className="font-bold font-mono">{liveTicket.actualResolutionTimeMinutes || 45} mins</span>.
                                </p>
                            </div>

                            {/* Tenant Rating Form */}
                            <div className="p-5 rounded-3xl border border-border bg-card space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Rate Technician Service & Quality</h4>
                                {ratingDone ? (
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold text-center space-y-1">
                                        <p>★ Rating Submitted: {liveTicket.rating?.score || ratingScore} / 5 Stars</p>
                                        <p className="text-muted-foreground font-normal italic">"{liveTicket.rating?.feedback || ratingFeedback || 'Great work!'}"</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmitRating} className="space-y-3">
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <button type="button" key={s} onClick={() => setRatingScore(s)}
                                                    className={cn('w-9 h-9 rounded-xl border text-sm font-black transition-all',
                                                        ratingScore >= s ? 'bg-amber-500 text-white border-amber-400 shadow-md' : 'bg-muted border-border text-muted-foreground'
                                                    )}>
                                                    ★ {s}
                                                </button>
                                            ))}
                                        </div>
                                        <textarea value={ratingFeedback} onChange={e => setRatingFeedback(e.target.value)} rows={2}
                                            placeholder="Leave feedback on repair quality, punctuality..."
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-xs placeholder-muted-foreground/40 focus:outline-none focus:border-primary/50 resize-none font-medium" />
                                        <button type="submit" disabled={submittingRating}
                                            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-xs hover:bg-emerald-500 transition-all shadow-md shadow-emerald-500/20">
                                            {submittingRating ? 'Submitting...' : 'Submit Rating & Review'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
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
                {/* Header */}
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

                {/* Technician Card snippet */}
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

                {/* Progress Bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
                        <span>Progress</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-amber-500" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                {/* Scheduled details stamp */}
                {request.scheduledDate ? (
                    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-black w-fit', sc?.class)}>
                        <span>{sc?.icon || '📅'}</span>
                        <span>{new Date(request.scheduledDate).toLocaleDateString()}</span>
                        <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                        <span>{sc?.label} ({sc?.time})</span>
                    </div>
                ) : (
                    (request.status === 'open' || request.status === 'in_progress') && (
                        <button onClick={onSchedule}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black hover:bg-amber-500/20 transition-all w-fit">
                            <CalendarIcon className="w-3.5 h-3.5" /> Book Visit Slot
                        </button>
                    )
                )}
            </div>

            {/* Actions */}
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
    const [selectedDayRequests, setSelectedDayRequests] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const [showBookableModal, setShowBookableModal] = useState(false);

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
        if (typeof date === 'string') return date.split('T')[0];
        const d = new Date(date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const getRequestsForDate = (date) => {
        if (!date) return [];
        const dateStr = getLocalDateString(date);
        return requests.filter(r => {
            if (!r.scheduledDate) return false;
            return getLocalDateString(r.scheduledDate) === dateStr;
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

            <div className="border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-7 border-b border-border bg-muted/40">
                    {weekDays.map(d => (
                        <div key={d} className="py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                            {d}
                        </div>
                    ))}
                </div>

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
                                </div>
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
    const location = useLocation();
    const { id: urlMaintId } = useParams();
    const searchId = location.state?.searchId;
    const isManager = user?.role === 'manager' || user?.role === 'admin';
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [priorityFilter, setPriorityFilter] = useState('');
    const [showSubmit, setShowSubmit] = useState(false);
    const [activeTab, setActiveTab] = useState('board');
    const [bookingTarget, setBookingTarget] = useState(null);
    const [detailsTarget, setDetailsTarget] = useState(null);
    const [highlightedTicketId, setHighlightedTicketId] = useState(null);

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
        try { await maintenanceService.updateStatus(id, status); fetchData(); }
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
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400">Enterprise Operations</p>
                    </div>
                    <h1 className="text-3xl font-black text-foreground">Maintenance Command Center</h1>
                </div>
                <div className="flex items-center gap-3">
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
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-sm hover:opacity-90 transition-all shadow-lg active:scale-95">
                        <Plus className="w-4 h-4" /> Submit Request
                    </button>
                </div>
            </motion.div>

            {/* Tenant Analytics KPI Bar */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    {[
                        { label: 'Open Requests', value: stats.open || 0, color: 'text-rose-500' },
                        { label: 'In Progress', value: stats.in_progress || 0, color: 'text-amber-500' },
                        { label: 'Completed', value: stats.completed || 0, color: 'text-emerald-500' },
                        { label: 'Emergency', value: stats.emergency || 0, color: 'text-rose-600 font-bold' },
                        { label: 'Avg Response', value: `${stats.avgResponseTimeMins || 25} m`, color: 'text-blue-400' },
                        { label: 'Avg Resolution', value: `${stats.avgResolutionTimeHours || 18.5} h`, color: 'text-purple-400' },
                    ].map(s => (
                        <div key={s.label} className="p-3.5 rounded-2xl border border-border bg-card shadow-sm text-center">
                            <p className={cn('text-xl font-black', s.color)}>{s.value}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Board View */}
            {activeTab === 'board' ? (
                <div className="space-y-4">
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

                    {loading ? (
                        <div className="text-center py-20 text-muted-foreground/30 font-bold">Loading Work Orders...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {STATUS_COLS.map(col => {
                                const cards = byStatus(col.key);
                                const ColIcon = col.icon;
                                return (
                                    <div key={col.key} className="space-y-3">
                                        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted border border-border shadow-sm">
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
                                                    onStatusChange={handleStatusChange}
                                                    onSchedule={() => setBookingTarget(r)}
                                                    onOpenDetails={(t) => setDetailsTarget(t)}
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
                <CalendarView requests={requests} user={user} onScheduleRequest={(r) => setBookingTarget(r)} />
            )}

            <AnimatePresence>
                {showSubmit && (
                    <SubmitModal onClose={() => setShowSubmit(false)} onSave={() => { setShowSubmit(false); fetchData(); }} />
                )}
                {detailsTarget && (
                    <TicketDetailsModal ticket={detailsTarget} onClose={() => setDetailsTarget(null)} onRefresh={fetchData} />
                )}
            </AnimatePresence>
        </div>
    );
}

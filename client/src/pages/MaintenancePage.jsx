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
    ShieldCheck, Phone, Mail, MessageSquareText, Radio, CheckCircle
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
            
            // Upload attachments if any files selected
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
                
                {/* Header */}
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

                {/* Section 7: Success View */}
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

                        {/* Ticket Stats Pill */}
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

                        {/* Action Buttons */}
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

                        {/* Section 6: Emergency Warning Banner */}
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

                        {/* SECTION 1: Issue Details */}
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

                        {/* SECTION 2: Attachments (Drag & Drop, Preview, Replace, Remove) */}
                        <div className="space-y-3 pt-3 border-t border-border/60">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                                    <UploadCloud className="w-4 h-4" /> Section 2: Attachments (Images, Videos, Docs, Voice)
                                </h3>
                                <span className="text-[10px] font-bold text-muted-foreground">{files.length} / 10 files selected</span>
                            </div>

                            {/* Drag and drop dropzone */}
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

                            {/* File List Previews */}
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

                        {/* SECTION 3: Contact Preference */}
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

                        {/* SECTION 4: Property Access Permission */}
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

                        {/* SECTION 5: Visit Scheduling */}
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

                        {/* Submit Action Toolbar */}
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
    const { id: urlMaintId } = useParams();
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
        console.log('[MaintenancePage] Destination page loaded', { urlMaintId, state: location.state });
        const params = new URLSearchParams(location.search);
        const targetId = urlMaintId || location.state?.targetEntityId || params.get('maintenanceId') || searchId;

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

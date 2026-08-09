import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { maintenanceService } from '../services/api';
import {
  Wrench,
  CheckCircle2,
  Clock,
  ArrowLeft,
  MessageSquare,
  Send,
  AlertCircle,
  FileText,
  User,
  ShieldCheck,
  Camera,
  Mic,
  FileSignature,
  Navigation,
  PhoneCall
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../utils/cn';

import CheckInOutPanel from '../components/technician/CheckInOutPanel';
import PhotoWorkflowCapture from '../components/technician/PhotoWorkflowCapture';
import VoiceNoteRecorder from '../components/technician/VoiceNoteRecorder';
import SignaturePad from '../components/technician/SignaturePad';

export default function TechnicianJobDetailPage() {
  const { id } = useParams();
  const { theme } = useTheme();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchJobDetail();
  }, [id]);

  const fetchJobDetail = async () => {
    try {
      const res = await maintenanceService.getRequestById(id);
      if (res?.data) setJob(res.data?.data || res.data);
    } catch (err) {
      console.error('Failed to load job detail', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    setUpdatingStatus(true);
    setErrorMessage('');
    try {
      await maintenanceService.updateStatus(id, newStatus, `Status updated to ${newStatus} by technician.`);
      fetchJobDetail();
    } catch (err) {
      console.error('Failed to update job status', err);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await maintenanceService.addNote(id, noteText);
      setNoteText('');
      fetchJobDetail();
    } catch (err) {
      console.error('Failed to add note', err);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-muted-foreground text-xs font-bold">Loading job details...</div>;
  }

  if (!job) {
    return (
      <div className="py-16 text-center text-muted-foreground text-xs font-bold space-y-2">
        <p>Ticket not found or permission denied.</p>
        <Link to="/technician/jobs" className="text-cyan-500 underline font-black">Return to jobs list</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 transition-colors duration-300">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/technician/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </Link>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs px-3 py-1 rounded-full font-black uppercase tracking-wider border",
            job.priority === 'emergency' ? "bg-rose-500/20 text-rose-500 border-rose-500/40" : "bg-cyan-500/20 text-cyan-500 border-cyan-500/30"
          )}>
            {job.priority || 'Medium'} Priority
          </span>
          <span className="text-xs px-3 py-1 rounded-full font-mono font-bold bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 capitalize">
            {job.status?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Completion Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 font-bold flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="whitespace-pre-line">{errorMessage}</div>
        </div>
      )}

      {/* Main Ticket Info Card */}
      <div className={cn(
        "rounded-3xl border p-6 backdrop-blur-xl space-y-4 shadow-xl transition-all",
        theme === 'light' ? "bg-white border-slate-200 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-black text-foreground">{job.title}</h1>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Ticket ID: <span className="font-mono text-cyan-500 font-bold">{job.ticketNumber || job._id}</span>
              {job.unit && <span className="ml-3 font-bold text-foreground">Unit: {job.unit}</span>}
            </p>
          </div>
          {job.tenant?.phone && (
            <a
              href={`tel:${job.tenant.phone}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-xs font-black hover:bg-emerald-500/30 self-start sm:self-center transition-all cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Call Tenant
            </a>
          )}
        </div>

        <div className={cn(
          "p-4 rounded-2xl border text-xs font-medium text-foreground",
          theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-white/5"
        )}>
          {job.description}
        </div>

        {/* Action Tabs Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-2 border-t border-border/40">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'checkin', label: 'GPS Check-In', icon: Navigation },
            { id: 'photos', label: 'Photos', icon: Camera },
            { id: 'voicenotes', label: 'Voice Notes', icon: Mic },
            { id: 'signature', label: 'Signatures', icon: FileSignature },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer",
                  isActive
                    ? "bg-cyan-600 text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'checkin' && (
        <CheckInOutPanel ticket={job} onUpdate={fetchJobDetail} />
      )}

      {activeTab === 'photos' && (
        <PhotoWorkflowCapture ticket={job} ticketId={job._id} onUploadSuccess={fetchJobDetail} onPhotoUploaded={fetchJobDetail} />
      )}

      {activeTab === 'voicenotes' && (
        <VoiceNoteRecorder ticketId={job._id} onUploadSuccess={fetchJobDetail} />
      )}

      {activeTab === 'signature' && (
        <SignaturePad ticket={job} onSaveSuccess={fetchJobDetail} />
      )}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Check-in Summary */}
          <CheckInOutPanel ticket={job} onUpdate={fetchJobDetail} />

          {/* Status Actions */}
          <div className={cn(
            "rounded-3xl border p-6 backdrop-blur-xl space-y-4 shadow-xl transition-all",
            theme === 'light' ? "bg-white border-slate-200 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
          )}>
            <h2 className="text-sm font-black text-foreground flex items-center justify-between">
              <span>Job Status Controls</span>
              <span className="text-xs font-mono text-cyan-500 font-bold capitalize">Current: {job.status?.replace('_', ' ')}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {['work_started', 'in_progress', 'waiting_parts', 'resolved'].map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusUpdate(st)}
                  disabled={updatingStatus || job.status === st}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black capitalize transition-all cursor-pointer",
                    job.status === st
                      ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 border border-slate-200 dark:border-slate-700"
                  )}
                >
                  Set {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Notes & Activity Section */}
          <div className={cn(
            "rounded-3xl border p-6 backdrop-blur-xl space-y-4 shadow-xl transition-all",
            theme === 'light' ? "bg-white border-slate-200 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
          )}>
            <h2 className="text-sm font-black text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-500" />
              Technician Field Notes
            </h2>

            <form onSubmit={handleAddNote} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add a field work update or note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className={cn(
                  "flex-1 px-4 py-2 rounded-xl text-xs font-medium border focus:outline-none",
                  theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10"
                )}
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-black text-xs hover:bg-cyan-500 flex items-center gap-1 cursor-pointer shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                Add Note
              </button>
            </form>

            {job.notes?.length > 0 ? (
              <div className="space-y-2 pt-2">
                {job.notes.map((n, idx) => (
                  <div key={idx} className={cn(
                    "p-3 rounded-2xl border text-xs text-foreground font-medium",
                    theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-white/5"
                  )}>
                    <p>{n.text}</p>
                    <span className="text-[10px] text-muted-foreground mt-1 block font-mono">
                      {new Date(n.createdAt || Date.now()).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground py-2 italic font-medium">No field notes added yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

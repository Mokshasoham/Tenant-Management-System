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
  PhoneCall,
  Star,
  Check,
  ThumbsUp
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

  // Work completion form state
  const [completionForm, setCompletionForm] = useState({
    workPerformed: '',
    partsUsed: '',
    completionNotes: '',
  });
  const [submittingCompletion, setSubmittingCompletion] = useState(false);
  const [completionSuccess, setCompletionSuccess] = useState('');

  useEffect(() => {
    fetchJobDetail();
  }, [id]);

  const fetchJobDetail = async () => {
    try {
      const res = await maintenanceService.getRequestById(id);
      if (res?.data) {
        const d = res.data?.data || res.data;
        setJob(d);
        if (d.completionDetails) {
          setCompletionForm({
            workPerformed: d.completionDetails.workPerformed || '',
            partsUsed: d.completionDetails.partsUsed || '',
            completionNotes: d.completionDetails.completionNotes || '',
          });
        }
      }
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

  const handleCompletionSubmit = async (e) => {
    e.preventDefault();
    if (!completionForm.workPerformed.trim()) {
      setErrorMessage('Please describe the work performed before submitting completion.');
      return;
    }

    setSubmittingCompletion(true);
    setErrorMessage('');
    setCompletionSuccess('');

    try {
      await maintenanceService.submitCompletion(id, completionForm);
      setCompletionSuccess('Work completion successfully submitted! Tenant has been notified to verify.');
      fetchJobDetail();
    } catch (err) {
      console.error('Failed to submit work completion', err);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to submit work completion.');
    } finally {
      setSubmittingCompletion(false);
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

  const isResolvedJob = ['resolved', 'completed', 'closed'].includes(job.status);
  const hasFeedback = Boolean(job.rating?.score || job.rating?.rating);
  const feedbackScore = Number(job.rating?.score || job.rating?.rating || 5);
  const feedbackComment = job.rating?.comment || job.rating?.feedback || '';
  const feedbackTags = Array.isArray(job.rating?.tags) ? job.rating.tags : [];
  const feedbackDate = job.rating?.ratedAt || job.rating?.submittedAt ? new Date(job.rating.ratedAt || job.rating.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

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

          {/* ══ TENANT FEEDBACK CARD ON JOB DETAILS ══ */}
          {isResolvedJob && (
            <div className={cn(
              "rounded-3xl border p-6 backdrop-blur-xl space-y-4 shadow-xl transition-all",
              theme === 'light' ? "bg-white border-slate-200 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
            )}>
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-foreground">TENANT FEEDBACK</h2>
                </div>
                {feedbackDate && (
                  <span className="text-[11px] font-mono font-bold text-muted-foreground">Reviewed {feedbackDate}</span>
                )}
              </div>

              {hasFeedback ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-amber-400 tracking-tight">{'★'.repeat(feedbackScore)}</span>
                    <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-400 font-extrabold text-sm border border-amber-500/30">
                      {feedbackScore.toFixed(1)} / 5.0
                    </span>
                    {job.rating?.wouldRecommend && (
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30 flex items-center gap-1">
                        <ThumbsUp className="w-3.5 h-3.5" /> Recommended
                      </span>
                    )}
                  </div>

                  {feedbackComment && (
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs font-medium text-foreground italic leading-relaxed">
                      "{feedbackComment}"
                    </div>
                  )}

                  {feedbackTags.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Highlight Tags</span>
                      <div className="flex flex-wrap gap-2">
                        {feedbackTags.map((tag, i) => (
                          <span key={i} className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 border border-dashed rounded-2xl text-center space-y-1 text-muted-foreground">
                  <Star className="w-6 h-6 mx-auto text-muted-foreground/40 mb-1" />
                  <p className="text-xs font-bold text-foreground">Waiting for tenant feedback</p>
                  <p className="text-[10px] text-muted-foreground">No tenant review has been submitted yet for this completed job.</p>
                </div>
              )}
            </div>
          )}

          {/* Work Completion Form */}
          {job.status !== 'resolved' && (
            <div className={cn(
              "rounded-3xl border p-6 backdrop-blur-xl space-y-4 shadow-xl transition-all",
              theme === 'light' ? "bg-white border-slate-200 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
            )}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-foreground flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-400" />
                  <span>Submit Work Completion</span>
                </h2>
                {job.status === 'awaiting_tenant_confirmation' && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Awaiting Tenant Confirmation
                  </span>
                )}
              </div>

              {completionSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{completionSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCompletionSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                    Work Performed *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe the diagnosis and repairs completed..."
                    value={completionForm.workPerformed}
                    onChange={(e) => setCompletionForm(prev => ({ ...prev, workPerformed: e.target.value }))}
                    className={cn(
                      "w-full p-3 rounded-2xl border font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                      theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-white/10 text-white"
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                      Parts / Supplies Used
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1 PVC valve, seal tape"
                      value={completionForm.partsUsed}
                      onChange={(e) => setCompletionForm(prev => ({ ...prev, partsUsed: e.target.value }))}
                      className={cn(
                        "w-full p-2.5 rounded-xl border font-medium focus:outline-none",
                        theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-white/10 text-white"
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                      Completion Notes
                    </label>
                    <input
                      type="text"
                      placeholder="Optional remarks for tenant..."
                      value={completionForm.completionNotes}
                      onChange={(e) => setCompletionForm(prev => ({ ...prev, completionNotes: e.target.value }))}
                      className={cn(
                        "w-full p-2.5 rounded-xl border font-medium focus:outline-none",
                        theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-white/10 text-white"
                      )}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingCompletion}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{submittingCompletion ? 'Submitting Completion...' : 'Mark Work Completed (Send to Tenant)'}</span>
                </button>
              </form>
            </div>
          )}

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

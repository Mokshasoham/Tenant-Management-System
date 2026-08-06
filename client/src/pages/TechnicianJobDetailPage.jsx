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

import CheckInOutPanel from '../components/technician/CheckInOutPanel';
import PhotoWorkflowCapture from '../components/technician/PhotoWorkflowCapture';
import VoiceNoteRecorder from '../components/technician/VoiceNoteRecorder';
import SignaturePad from '../components/technician/SignaturePad';

export default function TechnicianJobDetailPage() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'checkin' | 'photos' | 'voicenotes' | 'signature'

  useEffect(() => {
    fetchJobDetail();
  }, [id]);

  const fetchJobDetail = async () => {
    try {
      const res = await maintenanceService.getRequestById(id);
      if (res?.data) setJob(res.data);
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
    return <div className="py-12 text-center text-slate-500 text-sm">Loading ticket details...</div>;
  }

  if (!job) {
    return (
      <div className="py-12 text-center text-slate-400 text-sm">
        Ticket not found. <Link to="/technician/jobs" className="text-cyan-400 underline">Return to jobs</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/technician/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </Link>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase ${
            job.priority === 'emergency' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
            'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
          }`}>
            {job.priority || 'Medium'} Priority
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700 capitalize">
            {job.status?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Completion Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="whitespace-pre-line">{errorMessage}</div>
        </div>
      )}

      {/* Main Ticket Info Card */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-white">{job.title}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Ticket ID: <span className="font-mono text-cyan-300">{job._id}</span>
              {job.unit && <span className="ml-3 font-semibold text-slate-300">Unit: {job.unit}</span>}
            </p>
          </div>
          {job.tenant?.phone && (
            <a
              href={`tel:${job.tenant.phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30 self-start sm:self-center"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Call Tenant
            </a>
          )}
        </div>

        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200">
          {job.description}
        </div>

        {/* Action Tabs Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 pt-2 border-t border-slate-800">
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
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
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
        <PhotoWorkflowCapture ticket={job} onUploadSuccess={fetchJobDetail} />
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
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center justify-between">
              <span>Job Status Controls</span>
              <span className="text-xs font-mono text-slate-400 capitalize">Current: {job.status?.replace('_', ' ')}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {['work_started', 'in_progress', 'waiting_parts', 'completed'].map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusUpdate(st)}
                  disabled={updatingStatus || job.status === st}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                    job.status === st
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  Set {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Notes & Activity Section */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              Technician Field Notes
            </h2>

            <form onSubmit={handleAddNote} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add a field work update or note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400 flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Add Note
              </button>
            </form>

            {job.notes?.length > 0 ? (
              <div className="space-y-2 pt-2">
                {job.notes.map((n, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 text-xs text-slate-300">
                    <p>{n.text}</p>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {new Date(n.createdAt || Date.now()).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-2 italic">No field notes added yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


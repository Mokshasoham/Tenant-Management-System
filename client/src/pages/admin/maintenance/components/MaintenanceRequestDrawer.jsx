import React, { useState } from 'react';
import {
  X, CheckCircle2, Clock, Wrench, UserCheck, ShieldAlert,
  AlertTriangle, DollarSign, Send, FileText, History, ArrowRight, UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../../utils/cn';

export default function MaintenanceRequestDrawer({ request, onClose, onUpdateStatus, theme }) {
  const [internalNote, setInternalNote] = useState('');
  const [notesList, setNotesList] = useState([
    { id: 'n1', time: '11:10 AM', author: 'Alex Mercer (Admin)', text: 'Verified SLA status. Technician Ravi Kumar is en route to site.' }
  ]);

  if (!request) return null;

  const handleAddNote = () => {
    if (!internalNote.trim()) return;
    const newNote = {
      id: `n_${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: 'Admin',
      text: internalNote,
    };
    setNotesList([newNote, ...notesList]);
    setInternalNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "w-full max-w-xl h-full border-l p-6 flex flex-col justify-between shadow-2xl overflow-y-auto space-y-6",
          theme === 'light' ? "bg-white border-slate-200 text-slate-900" : "bg-[#0c0d15] border-white/10 text-white"
        )}
      >
        {/* Drawer Header */}
        <div className="space-y-3 pb-4 border-b border-border/50">
          <div className="flex justify-between items-start">
            <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-xs font-mono font-black">
              {request.id}
            </span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-lg font-black tracking-tight">{request.title}</h2>
          <p className="text-xs text-muted-foreground font-medium">
            📍 {request.propertyName} · {request.unit} ({request.city})
          </p>
        </div>

        {/* ══ LIFECYCLE STEP TIMELINE ══ */}
        <div className={cn(
          "p-4 rounded-3xl border space-y-3 backdrop-blur-xl shadow-lg",
          theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-white/5"
        )}>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Request Lifecycle Timeline
          </h4>

          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 scrollbar-none">
            {(request.lifecycleTimeline || []).map((step, idx) => (
              <div key={idx} className="flex items-center gap-1.5 flex-shrink-0">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] border shadow-sm",
                  step.completed
                    ? "bg-emerald-500 text-white border-emerald-400"
                    : "bg-slate-800 text-slate-500 border-slate-700"
                )}>
                  {step.completed ? '✓' : idx + 1}
                </div>
                <div className="text-[10px] font-bold">
                  <p className={step.completed ? "text-emerald-500" : "text-muted-foreground"}>{step.step}</p>
                  <p className="text-[9px] text-muted-foreground font-normal">{step.time}</p>
                </div>
                {idx < request.lifecycleTimeline.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-700 mx-1 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ══ COST BREAKDOWN ══ */}
        <div className={cn(
          "p-4 rounded-3xl border space-y-2 backdrop-blur-xl shadow-lg",
          theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-white/5"
        )}>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Maintenance Cost Breakdown</span>
            <span className="text-emerald-500 font-extrabold">Total: ₹{request.estimatedCost?.toLocaleString()}</span>
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-muted-foreground block font-bold">Parts & Materials</span>
              <p className="font-mono font-black text-indigo-400">₹{request.partsCost?.toLocaleString()}</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-muted-foreground block font-bold">Labour & Service Charge</span>
              <p className="font-mono font-black text-emerald-400">₹{request.labourCost?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* ══ TECHNICIAN & STAKEHOLDER CARDS ══ */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className={cn(
            "p-3.5 rounded-2xl border space-y-1 backdrop-blur-xl",
            theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-white/5"
          )}>
            <span className="text-[10px] font-bold text-muted-foreground block">Assigned Technician</span>
            <p className="font-extrabold text-indigo-400">{request.assignedTechnician?.name || 'Unassigned'}</p>
            <p className="text-[11px] text-muted-foreground">{request.assignedTechnician?.phone}</p>
          </div>

          <div className={cn(
            "p-3.5 rounded-2xl border space-y-1 backdrop-blur-xl",
            theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-white/5"
          )}>
            <span className="text-[10px] font-bold text-muted-foreground block">Property Manager</span>
            <p className="font-extrabold text-emerald-400">{request.manager?.name}</p>
            <p className="text-[11px] text-muted-foreground">{request.manager?.contact}</p>
          </div>
        </div>

        {/* ══ ADMIN ACTIONS (NO REQUEST CREATION) ══ */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Administrative Operations & Escalations
          </h4>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onUpdateStatus && onUpdateStatus(request.id, 'in_progress')}
              className="px-4 py-2 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
            >
              Set In Progress
            </button>
            <button
              onClick={() => onUpdateStatus && onUpdateStatus(request.id, 'resolved')}
              className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
            >
              Mark Resolved
            </button>
            <button
              onClick={() => alert(`Reassigned request ${request.id} to Senior Technician`)}
              className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" /> Reassign Tech
            </button>
          </div>
        </div>

        {/* ══ INTERNAL NOTES STREAM ══ */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Internal Compliance Notes
          </h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Add administrative compliance note..."
              className={cn(
                "flex-1 px-4 py-2 rounded-full border text-xs focus:outline-none",
                theme === 'light' ? "bg-slate-100 border-slate-200 text-slate-900" : "bg-slate-950 border-white/10 text-white"
              )}
            />
            <button
              onClick={handleAddNote}
              className="px-4 py-2 rounded-full bg-indigo-600 text-white font-extrabold text-xs cursor-pointer shadow-md"
            >
              Add
            </button>
          </div>

          <div className="space-y-2 max-h-32 overflow-y-auto">
            {notesList.map((n) => (
              <div key={n.id} className={cn(
                "p-2.5 rounded-2xl border text-xs space-y-0.5",
                theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-white/5"
              )}>
                <div className="flex justify-between text-[10px] font-bold text-indigo-400">
                  <span>{n.author}</span>
                  <span>{n.time}</span>
                </div>
                <p className="text-muted-foreground text-[11px]">{n.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══ IMMUTABLE AUDIT LOGS ══ */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-indigo-400" /> Immutable Audit Trail
          </h4>
          <div className="space-y-1.5 text-[11px]">
            {(request.auditLogs || []).map((log, idx) => (
              <div key={idx} className="p-2 rounded-xl bg-slate-900/60 border border-white/5 text-muted-foreground flex justify-between">
                <span><strong>{log.admin}</strong>: {log.details}</span>
                <span className="text-[10px] text-slate-500 font-mono">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

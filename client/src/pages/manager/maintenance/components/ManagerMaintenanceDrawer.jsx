import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Wrench, UserCheck, ShieldAlert, CheckCircle2, DollarSign, Activity } from 'lucide-react';
import { maintenanceService } from '../../../../services/api';
import { cn } from '../../../../utils/cn';

export default function ManagerMaintenanceDrawer({ request, onOpenAssignModal, onClose, onRefresh, theme }) {
  const [escalateReason, setEscalateReason] = useState('');
  const [showEscalateInput, setShowEscalateInput] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!request) return null;

  const handleEscalate = async () => {
    if (!escalateReason.trim()) return;
    setLoading(true);
    try {
      await maintenanceService.escalateTicket(request._id, escalateReason);
      setShowEscalateInput(false);
      onRefresh && onRefresh();
    } catch (err) {
      console.error('Error escalating ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setLoading(true);
    try {
      await maintenanceService.updateStatus(request._id, newStatus, 'Manager status update');
      onRefresh && onRefresh();
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setLoading(false);
    }
  };

  const dt = request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A';
  const techName = request.assignedTo ? `${request.assignedTo.firstName || ''} ${request.assignedTo.lastName || ''}`.trim() : 'Unassigned';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[600] flex justify-end p-0"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: '0%' }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "w-full max-w-lg h-full p-6 space-y-6 overflow-y-auto border-l shadow-2xl backdrop-blur-2xl",
          theme === 'light' ? "bg-white text-slate-900 border-slate-200" : "bg-[#0c0d15] text-white border-white/15 shadow-black"
        )}
      >
        <div className="flex justify-between items-center pb-3 border-b border-border/40">
          <div>
            <span className="text-[10px] font-mono font-bold text-purple-400">
              {request.ticketNumber || request._id}
            </span>
            <h3 className="text-lg font-black tracking-tight">{request.title}</h3>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location & Tenant info */}
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
          <p className="font-extrabold text-foreground">
            📍 {request.property?.name || 'Assigned Property'} · Unit {request.unit || 'N/A'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Submitted by: <strong className="text-foreground">{request.requestedBy ? `${request.requestedBy.firstName || ''} ${request.requestedBy.lastName || ''}`.trim() : 'Tenant'}</strong> · Date: {dt}
          </p>
        </div>

        {/* Priority & Status Controls */}
        <div className="space-y-2 text-xs">
          <span className="text-[10px] font-black uppercase text-muted-foreground block">
            Update Status Phase
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'open', label: 'Open' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'resolved', label: 'Resolved' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => handleStatusChange(st.id)}
                disabled={loading}
                className={cn(
                  "py-2 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer",
                  request.status === st.id
                    ? "bg-purple-600 text-white border-purple-500 shadow-md"
                    : "bg-slate-900/40 border-white/5 text-muted-foreground hover:text-foreground"
                )}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Technician Assignment Section */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-purple-400">Assigned Technician</span>
            <button
              onClick={() => onOpenAssignModal && onOpenAssignModal(request)}
              className="text-xs font-black text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" /> Reassign
            </button>
          </div>
          <p className="font-extrabold text-sm text-foreground">{techName}</p>
        </div>

        {/* Escalation Section */}
        {showEscalateInput ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2 text-xs">
            <h4 className="font-black text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> Escalate Ticket to Emergency
            </h4>
            <textarea
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              rows={2}
              placeholder="Reason for escalation..."
              className="w-full p-2.5 rounded-xl bg-slate-900 text-xs border border-white/10 text-white focus:outline-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowEscalateInput(false)} className="flex-1 py-2 rounded-xl border border-border font-bold">Cancel</button>
              <button onClick={handleEscalate} disabled={loading} className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-black">Confirm Escalation</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowEscalateInput(true)}
            className="w-full py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" /> Escalate to Emergency Ticket
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

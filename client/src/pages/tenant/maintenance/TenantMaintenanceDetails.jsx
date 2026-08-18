import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Wrench, Calendar as CalendarIcon, Clock, UserCheck, 
  CheckCircle2, FileText, Activity, QrCode, Download, ShieldCheck, RefreshCw 
} from 'lucide-react';
import { maintenanceService } from '../../../services/api';
import { cn } from '../../../utils/cn';

export default function TenantMaintenanceDetails({ ticket, onClose, onResolved, theme }) {
  const [resolving, setResolving] = useState(false);
  const [resolveSuccess, setResolveSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!ticket) return null;

  const dt = ticket.requestedVisitDate || ticket.scheduledDate || ticket.createdAt;
  const formattedDate = dt ? new Date(dt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
  const ticketIdDisplay = ticket.ticketCode || ticket.ticketNumber || ticket._id;

  const isAwaitingConfirmation = ['awaiting_tenant_confirmation', 'completed_by_technician'].includes(ticket.status);
  const isResolved = ['resolved', 'completed', 'closed'].includes(ticket.status);

  const handleResolveDirect = async () => {
    setResolving(true);
    setError('');
    try {
      await maintenanceService.resolveTicket(ticket._id, {
        resolutionMethod: 'direct',
        notes: 'Verified and confirmed resolution via ticket details drawer.'
      });
      setResolveSuccess(true);
      if (onResolved) onResolved();
    } catch (err) {
      console.error('Failed to resolve ticket:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to resolve ticket');
    } finally {
      setResolving(false);
    }
  };

  const downloadQr = () => {
    if (!ticket.qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = ticket.qrCodeDataUrl;
    a.download = `QR_${ticketIdDisplay}.png`;
    a.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[600] flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className={cn(
          "w-full max-w-lg p-6 rounded-[2.5rem] border shadow-2xl space-y-5 my-8 max-h-[85vh] overflow-y-auto scrollbar-none",
          theme === 'light' ? "bg-white text-slate-900 border-slate-200" : "bg-[#0c0d15] text-white border-white/15 shadow-black"
        )}
      >
        <div className="flex justify-between items-center pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">{ticket.title}</h3>
              <p className="text-[10px] text-muted-foreground font-mono font-bold flex items-center gap-1.5 flex-wrap">
                <span className="text-amber-500">ID: {ticketIdDisplay}</span>
                {ticket.property?.name && (
                  <span className="text-amber-400 font-sans font-bold">
                    • 🏠 {ticket.property.name}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Header */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400 font-black text-xs">
            <Activity className="w-4 h-4 animate-spin" />
            <span>Status: <strong className="uppercase">{ticket.status?.replace(/_/g, ' ')}</strong></span>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500 text-white shadow-md">
            {ticket.priority || 'Medium'} Priority
          </span>
        </div>

        {/* Error alert */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
            {error}
          </div>
        )}

        {/* QR Code Section */}
        {ticket.qrCodeDataUrl && (
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 flex items-center justify-between gap-4">
            <img
              src={ticket.qrCodeDataUrl}
              alt="Ticket QR"
              className="w-16 h-16 rounded-xl bg-white p-1 border border-border shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-black uppercase text-amber-400 block font-mono">Ticket QR Code</span>
              <p className="text-xs font-mono font-bold text-foreground truncate">{ticketIdDisplay}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Use for quick technician/on-site verification</p>
            </div>
            <button
              onClick={downloadQr}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
              title="Download QR Code"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Technician Completion Block */}
        {ticket.completionDetails && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-black text-[11px] uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" /> Technician Work Completed
            </div>
            <div className="space-y-1 text-slate-300">
              <p><strong className="text-foreground">Work Performed:</strong> {ticket.completionDetails.workPerformed}</p>
              {ticket.completionDetails.partsUsed && (
                <p><strong className="text-foreground">Parts / Supplies:</strong> {ticket.completionDetails.partsUsed}</p>
              )}
              {ticket.completionDetails.completionNotes && (
                <p><strong className="text-foreground">Notes:</strong> {ticket.completionDetails.completionNotes}</p>
              )}
              <p className="text-[10px] text-muted-foreground pt-1">
                Technician: <strong className="text-foreground">{ticket.technicianName || 'Specialist'}</strong>
                {ticket.technicianCompletedAt && ` · ${new Date(ticket.technicianCompletedAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        )}

        {/* Details List */}
        <div className="space-y-3 text-xs">
          <div>
            <span className="text-[10px] font-black uppercase text-muted-foreground block mb-0.5">Description</span>
            <p className="p-3 rounded-xl bg-slate-900/40 border border-white/5 text-muted-foreground font-medium">
              {ticket.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 space-y-0.5">
              <span className="text-[9px] font-black uppercase text-sky-400 block">Scheduled Date</span>
              <p className="font-mono font-bold text-foreground">{formattedDate}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 space-y-0.5">
              <span className="text-[9px] font-black uppercase text-purple-400 block">Assigned Technician</span>
              <p className="font-bold text-foreground">
                {ticket.assignedTo ? `${ticket.assignedTo.firstName || ''} ${ticket.assignedTo.lastName || ''}`.trim() : (ticket.technicianName || 'Assigned Soon')}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {isAwaitingConfirmation && !resolveSuccess ? (
          <div className="space-y-2 pt-2">
            <button
              onClick={handleResolveDirect}
              disabled={resolving}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
            >
              {resolving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Verify &amp; Confirm Resolution</span>
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs transition-all cursor-pointer"
          >
            Close Details
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

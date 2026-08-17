import React from 'react';
import { motion } from 'framer-motion';
import { X, Wrench, Calendar as CalendarIcon, Clock, UserCheck, CheckCircle2, FileText, Activity } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function TenantMaintenanceDetails({ ticket, onClose, theme }) {
  if (!ticket) return null;

  const dt = ticket.requestedVisitDate || ticket.scheduledDate || ticket.createdAt;
  const formattedDate = dt ? new Date(dt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[600] flex items-center justify-center p-4"
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
                <span>Ticket ID: {ticket.ticketNumber || ticket._id}</span>
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
                {ticket.assignedTo ? `${ticket.assignedTo.firstName || ''} ${ticket.assignedTo.lastName || ''}`.trim() : 'Assigned Soon'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs transition-all cursor-pointer"
        >
          Close Details
        </button>
      </motion.div>
    </motion.div>
  );
}

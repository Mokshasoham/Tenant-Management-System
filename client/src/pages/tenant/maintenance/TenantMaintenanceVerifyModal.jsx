import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, QrCode, Search, CheckCircle2, AlertTriangle, 
  Wrench, UserCheck, Star, Clock, ShieldCheck, ArrowRight, RefreshCw 
} from 'lucide-react';
import { maintenanceService } from '../../../services/api';
import { cn } from '../../../utils/cn';

export default function TenantMaintenanceVerifyModal({ onClose, onResolved, theme }) {
  const [ticketInput, setTicketInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticketData, setTicketData] = useState(null);
  const [canResolve, setCanResolve] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [resolvedSuccess, setResolvedSuccess] = useState(false);

  const handleLookup = async (e) => {
    e?.preventDefault();
    const code = ticketInput.trim();
    if (!code) {
      setError('Please enter a valid maintenance ticket ID or QR code.');
      return;
    }

    setLoading(true);
    setError('');
    setTicketData(null);
    setResolvedSuccess(false);

    try {
      // Clean up raw QR string if scanned with prefix
      const cleanCode = code.replace(/^TMS-MNT-VERIFY:/, '').split(':')[0];
      const res = await maintenanceService.verifyTicket(cleanCode);
      const data = res?.data?.data || res?.data || res;
      setTicketData(data);
      setCanResolve(res?.data?.canResolve ?? true);
    } catch (err) {
      console.error('Error verifying ticket:', err);
      setError(err?.response?.data?.message || err?.message || 'Maintenance ticket not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!ticketData) return;
    setResolving(true);
    setError('');

    try {
      await maintenanceService.resolveTicket(ticketData._id || ticketData.ticketCode, {
        resolutionMethod: ticketInput.includes('VERIFY') ? 'qr' : 'ticket_id',
        rating,
        comment: comment.trim() || 'Work verified and confirmed resolved by tenant.',
      });
      setResolvedSuccess(true);
      if (onResolved) onResolved();
    } catch (err) {
      console.error('Error resolving ticket:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to resolve ticket.');
    } finally {
      setResolving(false);
    }
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
          "w-full max-w-lg p-6 rounded-[2.5rem] border shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto scrollbar-none",
          theme === 'light' ? "bg-white text-slate-900 border-slate-200" : "bg-[#0c0d15] text-white border-white/15 shadow-black"
        )}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Verify Maintenance Ticket</h3>
              <p className="text-[10px] text-muted-foreground font-medium">
                Enter Ticket ID or scan QR to inspect and resolve
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleLookup} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. TMS-MNT-20260818-A7K92P"
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              className={cn(
                "flex-1 px-4 py-3 rounded-2xl border text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50",
                theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-white/10 text-white"
              )}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Verify</span>
            </button>
          </div>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Verified Ticket Card */}
        {ticketData && (
          <div className="space-y-4 pt-2">
            <div className={cn(
              "p-5 rounded-3xl border space-y-4",
              theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-white/10"
            )}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-500 font-mono">
                    {ticketData.ticketCode || ticketData.ticketNumber || ticketData._id}
                  </span>
                  <h4 className="text-base font-black text-foreground mt-0.5">{ticketData.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    🏠 {ticketData.property?.name || 'Property'} {ticketData.property?.unit ? `· Unit ${ticketData.property.unit}` : ''}
                  </p>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                  ticketData.status === 'resolved' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                )}>
                  {ticketData.status?.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Technician Completion Block */}
              {ticketData.completionDetails && (
                <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-black text-[11px] uppercase tracking-wider">
                    <Wrench className="w-3.5 h-3.5" /> Technician Work Completed
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">Work Performed:</strong> {ticketData.completionDetails.workPerformed}
                    </p>
                    {ticketData.completionDetails.partsUsed && (
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">Parts / Supplies:</strong> {ticketData.completionDetails.partsUsed}
                      </p>
                    )}
                    {ticketData.completionDetails.completionNotes && (
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">Technician Notes:</strong> {ticketData.completionDetails.completionNotes}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground pt-1">
                      Completed by <strong className="text-foreground">{ticketData.technicianName || 'Technician'}</strong>
                      {ticketData.technicianCompletedAt && ` on ${new Date(ticketData.technicianCompletedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              )}

              {/* QR Code display */}
              {ticketData.qrCodeDataUrl && (
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5">
                  <img
                    src={ticketData.qrCodeDataUrl}
                    alt="Ticket QR Code"
                    className="w-20 h-20 rounded-xl bg-white p-1 border border-border"
                  />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-foreground">Official QR Reference</p>
                    <p className="text-[10px] text-muted-foreground">
                      This QR securely links to maintenance record {ticketData.ticketCode}.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Resolution Form / Success State */}
            {resolvedSuccess || ['resolved', 'completed', 'closed'].includes(ticketData.status) ? (
              <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                <h4 className="text-sm font-black text-emerald-400">Maintenance Ticket Resolved</h4>
                <p className="text-xs text-muted-foreground">
                  The maintenance work has been verified and confirmed resolved.
                </p>
                <button
                  onClick={onClose}
                  className="mt-2 w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : canResolve ? (
              <div className="space-y-3 p-5 rounded-3xl bg-slate-900/40 border border-white/5">
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Confirm Work Resolution</h4>
                <p className="text-[11px] text-muted-foreground">
                  Rate your satisfaction with the repair work to complete resolution:
                </p>

                {/* 5-star rating */}
                <div className="flex items-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star className={cn("w-6 h-6", rating >= star ? "fill-amber-400 text-amber-400" : "text-slate-600")} />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-400 ml-2">{rating} / 5 Stars</span>
                </div>

                <input
                  type="text"
                  placeholder="Optional review or comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl border text-xs font-medium focus:outline-none",
                    theme === 'light' ? "bg-white border-slate-200" : "bg-slate-950 border-white/10 text-white"
                  )}
                />

                <button
                  onClick={handleResolve}
                  disabled={resolving}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                >
                  {resolving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Confirm &amp; Resolve Ticket</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-medium">
                You can view this ticket. Resolution is reserved for the requesting tenant, assigned technician, or property manager.
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

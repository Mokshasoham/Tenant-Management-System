import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, UserCheck, Check, AlertCircle } from 'lucide-react';
import { maintenanceService } from '../../../../services/api';
import { cn } from '../../../../utils/cn';

export default function ManagerAssignTechnicianModal({ request, technicians = [], onClose, onSave, theme }) {
  const [selectedTechId, setSelectedTechId] = useState(request?.assignedTo?._id || request?.assignedTo || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!request) return null;

  const handleAssign = async () => {
    if (!selectedTechId) {
      setError('Please select a technician to assign.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await maintenanceService.assignTechnician(request._id, selectedTechId);
      onSave && onSave();
    } catch (err) {
      console.error('Error assigning technician:', err);
      setError(err?.message || 'Failed to assign technician.');
    } finally {
      setLoading(false);
    }
  };

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
          "w-full max-w-md p-6 rounded-[2.5rem] border shadow-2xl space-y-5 my-8 max-h-[85vh] overflow-y-auto scrollbar-none",
          theme === 'light' ? "bg-white text-slate-900 border-slate-200" : "bg-[#0c0d15] text-white border-white/15 shadow-black"
        )}
      >
        <div className="flex justify-between items-center pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Assign Technician</h3>
              <p className="text-[10px] text-muted-foreground font-mono font-bold">
                Ticket: {request.ticketNumber || request._id}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
          <p className="font-extrabold text-foreground">{request.title}</p>
          <p className="text-[10px] text-muted-foreground">
            📍 {request.property?.name || 'Assigned Property'} · Unit {request.unit || 'N/A'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-muted-foreground block">
            Select Available Field Technician
          </label>

          {technicians.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 border border-dashed rounded-xl text-center">
              No technician accounts available in database.
            </p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-none">
              {technicians.map((t) => {
                const tId = t._id || t.id;
                const isSelected = selectedTechId === tId;
                const name = `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Technician';

                return (
                  <button
                    key={tId}
                    type="button"
                    onClick={() => setSelectedTechId(tId)}
                    className={cn(
                      "w-full p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer",
                      isSelected
                        ? "bg-purple-600 text-white border-purple-500 shadow-md"
                        : "bg-slate-900/40 border-white/5 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black flex items-center justify-center text-xs">
                        {t.firstName?.charAt(0) || 'T'}
                      </div>
                      <div className="text-left">
                        <p className="font-extrabold text-xs">{name}</p>
                        <p className="text-[9px] opacity-80">{t.technicianProfile?.skills?.[0]?.name || 'General Field Tech'}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-border text-xs font-black hover:bg-muted transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? 'Assigning...' : 'Confirm Assignment'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

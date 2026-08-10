import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, UserCheck, Check, AlertCircle, RefreshCw, Search, Loader2 } from 'lucide-react';
import { maintenanceService, userService } from '../../../../services/api';
import { cn } from '../../../../utils/cn';

export default function ManagerAssignTechnicianModal({ request, technicians: initialTechs = [], onClose, onSave, theme }) {
  const [selectedTechId, setSelectedTechId] = useState(request?.assignedTo?._id || request?.assignedTo || '');
  const [techList, setTechList] = useState(initialTechs);
  const [loadingTechs, setLoadingTechs] = useState(initialTechs.length === 0);
  const [techError, setTechError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'available'

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchTechnicians = useCallback(async () => {
    setLoadingTechs(true);
    setTechError('');
    try {
      const res = await userService.getAvailableTechnicians();
      const list = res?.data?.data || res?.data || (Array.isArray(res) ? res : []);
      setTechList(list);
    } catch (err) {
      console.error('Error fetching available technicians:', err);
      // Fallback query to getPeople role technician
      try {
        const fallbackRes = await userService.getPeople({ role: 'technician', limit: 100 });
        const list = fallbackRes?.data?.data || fallbackRes?.data || [];
        setTechList(list.map(t => ({
          _id: t._id,
          id: t._id,
          name: `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Technician',
          email: t.email,
          specialty: t.technicianProfile?.skills?.[0]?.name || 'Field Technician',
          status: 'available',
          activeJobs: 0
        })));
      } catch (fbErr) {
        setTechError('Unable to load technicians. Please try again.');
      }
    } finally {
      setLoadingTechs(false);
    }
  }, []);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  if (!request) return null;

  const handleAssign = async () => {
    if (!selectedTechId) {
      setSubmitError('Please select a technician to assign.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      await maintenanceService.assignTechnician(request._id, selectedTechId);
      if (onSave) onSave();
      onClose();
    } catch (err) {
      console.error('Error assigning technician:', err);
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to assign technician.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter technicians based on search query and status tab
  const filteredTechs = techList.filter(t => {
    const nameStr = (t.name || `${t.firstName || ''} ${t.lastName || ''}`).toLowerCase();
    const specStr = (t.specialty || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || nameStr.includes(query) || specStr.includes(query);

    if (filterTab === 'available') {
      return matchesSearch && (t.status === 'available' || t.activeJobs === 0);
    }
    return matchesSearch;
  });

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
          "w-full max-w-md p-6 rounded-[2.5rem] border shadow-2xl space-y-4 my-8 max-h-[88vh] flex flex-col justify-between",
          theme === 'light' ? "bg-white text-slate-900 border-slate-200" : "bg-[#0c0d15] text-white border-white/15 shadow-black"
        )}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Assign Technician</h3>
              <p className="text-[10px] text-muted-foreground font-mono font-bold">
                Ticket: REQ-{String(request._id).substring(0, 8)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ticket Details Summary Card */}
        <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1 shrink-0">
          <p className="font-extrabold text-foreground">{request.title}</p>
          <p className="text-[10px] text-muted-foreground">
            📍 {request.property?.name || request.propertyName || 'Assigned Property'} · Unit {request.unit || 'N/A'}
          </p>
        </div>

        {submitError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Main Selection Area */}
        <div className="space-y-3 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
              Select Available Field Technician
            </label>
            <span className="text-[10px] font-mono font-bold text-purple-400">
              {techList.length} Accounts in DB
            </span>
          </div>

          {/* Search & Filter Bar */}
          {techList.length > 0 && (
            <div className="space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search technician by name or skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs font-medium focus:outline-none",
                    theme === 'light' ? "bg-slate-100 border-slate-200 text-slate-900" : "bg-[#06070a] border-white/10 text-white"
                  )}
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={cn(
                    "px-3 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer",
                    filterTab === 'all'
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  All ({techList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('available')}
                  className={cn(
                    "px-3 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer",
                    filterTab === 'available'
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  Available ({techList.filter(t => t.status === 'available' || t.activeJobs === 0).length})
                </button>
              </div>
            </div>
          )}

          {/* Technician Cards List Area */}
          <div className="flex-1 min-h-[160px] max-h-[260px] overflow-y-auto pr-1 scrollbar-none space-y-2">
            {loadingTechs ? (
              <div className="p-8 border border-dashed rounded-2xl text-center space-y-2 text-muted-foreground my-auto">
                <Loader2 className="w-6 h-6 mx-auto animate-spin text-purple-400" />
                <p className="text-xs font-bold text-foreground">Loading available technicians...</p>
                <p className="text-[10px]">Fetching real technician accounts from MongoDB User collection</p>
              </div>
            ) : techError ? (
              <div className="p-6 border border-dashed border-rose-500/30 rounded-2xl text-center space-y-2 text-rose-400 my-auto">
                <AlertCircle className="w-6 h-6 mx-auto text-rose-500" />
                <p className="text-xs font-bold">Unable to load technicians.</p>
                <button
                  type="button"
                  onClick={fetchTechnicians}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            ) : techList.length === 0 ? (
              <div className="p-6 border border-dashed rounded-2xl text-center space-y-1 text-muted-foreground my-auto">
                <p className="text-xs font-bold text-foreground">No technician accounts available in database.</p>
                <p className="text-[10px]">Add technician users in Admin People Command Center first.</p>
              </div>
            ) : filteredTechs.length === 0 ? (
              <div className="p-6 border border-dashed rounded-2xl text-center space-y-1 text-muted-foreground my-auto">
                <p className="text-xs font-bold text-foreground">No technicians match your search/filter.</p>
                <p className="text-[10px]">Try clearing your search query or selecting "All".</p>
              </div>
            ) : (
              filteredTechs.map((t) => {
                const tId = String(t._id || t.id);
                const isSelected = String(selectedTechId) === tId;
                const techName = t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Technician';
                const specialty = t.specialty || 'Field Technician';
                const activeJobsCount = t.activeJobs ?? 0;
                const isAvailable = t.status === 'available' || activeJobsCount === 0;

                return (
                  <div
                    key={tId}
                    onClick={() => setSelectedTechId(tId)}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer active:scale-[0.99]",
                      isSelected
                        ? "bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/40 shadow-lg shadow-purple-600/20"
                        : theme === 'light'
                        ? "bg-slate-50 border-slate-200 hover:border-purple-300"
                        : "bg-slate-900/60 border-white/10 hover:border-purple-500/40"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-9 h-9 rounded-2xl font-black text-xs flex items-center justify-center shrink-0 shadow-md",
                        isSelected ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-200 border border-border/40"
                      )}>
                        {t.firstName?.charAt(0) || techName.charAt(0) || 'T'}
                      </div>
                      <div className="min-w-0 text-left">
                        <h4 className="font-extrabold text-xs text-foreground truncate">{techName}</h4>
                        <p className="text-[10px] text-muted-foreground font-medium truncate">{specialty}</p>
                        <div className="flex items-center gap-2 pt-0.5 text-[10px]">
                          <span className={cn(
                            "font-bold flex items-center gap-1",
                            isAvailable ? "text-emerald-400" : "text-amber-400"
                          )}>
                            ● {isAvailable ? 'Available' : 'On Job'}
                          </span>
                          <span className="text-muted-foreground/80 font-mono">
                            · {activeJobsCount} active job{activeJobsCount === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                      isSelected
                        ? "bg-purple-600 border-purple-400 text-white shadow-sm"
                        : "border-border/60 bg-muted/20"
                    )}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 pt-3 border-t border-border/40 shrink-0">
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
            disabled={submitting || !selectedTechId || loadingTechs}
            className={cn(
              "flex-1 py-3 rounded-2xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              selectedTechId && !submitting
                ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30"
                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-border/40 shadow-none"
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Assigning...
              </>
            ) : (
              'Confirm Assignment'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

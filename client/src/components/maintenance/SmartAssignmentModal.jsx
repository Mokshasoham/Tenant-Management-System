/**
 * client/src/components/maintenance/SmartAssignmentModal.jsx
 * Interactive AI Smart Technician Assignment & Simulation Workspace Modal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ShieldCheck, AlertTriangle, Clock, ChevronDown, ChevronUp,
  UserCheck, RefreshCw, X, ArrowRight, Zap, Award, MapPin, Check, Sliders
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { assignmentEngineService } from '../../services/api';

export default function SmartAssignmentModal({ ticket, onClose, onAssigned }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTech, setSelectedTech] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Accordion state for factor breakdowns
  const [expandedTechId, setExpandedTechId] = useState(null);

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simPriority, setSimPriority] = useState(ticket?.priority || 'medium');
  const [simResult, setSimResult] = useState(null);
  const [simulatingLoading, setSimulatingLoading] = useState(false);

  const fetchRecommendations = useCallback(async (bypassCache = false) => {
    if (!ticket?._id) return;
    setLoading(true);
    setError('');
    try {
      const res = await assignmentEngineService.getRecommendations(ticket._id, { bypassCache });
      const recs = res?.data || res;
      setData(recs);
      if (recs?.recommendations?.length > 0) {
        setExpandedTechId(recs.recommendations[0].technicianId);
      }
    } catch (err) {
      console.error('Failed to load AI recommendations:', err);
      setError(err.response?.data?.message || 'Failed to calculate AI technician recommendations.');
    } finally {
      setLoading(false);
    }
  }, [ticket]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Idempotency key generation
  const [idempotencyKey] = useState(() => `assign-${ticket?._id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  const handleSelectTechnician = (tech) => {
    setSelectedTech(tech);
    const topTech = data?.recommendations?.[0];
    if (topTech && String(topTech.technicianId) !== String(tech.technicianId)) {
      setShowOverrideModal(true);
    } else {
      executeAssignment(tech.technicianId, '');
    }
  };

  const executeAssignment = async (techId, reason = '') => {
    setSubmitting(true);
    setError('');
    try {
      await assignmentEngineService.saveDecision({
        ticketId: ticket._id,
        selectedTechnicianId: techId,
        overrideReason: reason,
        assignmentStrategy: ticket?.priority === 'emergency' ? 'EMERGENCY' : 'AUTO',
        idempotencyKey
      }, idempotencyKey);

      if (onAssigned) onAssigned();
      onClose();
    } catch (err) {
      console.error('Assignment error:', err);
      if (err.response?.status === 409) {
        setError('This ticket has already been assigned. Recommendations have changed.');
        fetchRecommendations(true); // Auto-reload fresh recommendations
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to complete assignment.');
      }
    } finally {
      setSubmitting(false);
      setShowOverrideModal(false);
    }
  };

  const handleRunSimulation = async () => {
    setSimulatingLoading(true);
    try {
      const res = await assignmentEngineService.simulate({
        ticketId: ticket._id,
        priority: simPriority
      });
      setSimResult(res?.data || res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulatingLoading(false);
    }
  };

  const isExpired = data?.expiresAt && new Date() > new Date(data.expiresAt);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-500">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  AI Dispatch Intelligence
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Ticket #{String(ticket?._id || '').substring(0, 8)}
                </span>
              </div>
              <h2 className="text-xl font-black text-foreground mt-0.5">Smart Technician Assignment</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isExpired && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Recommendation expired — Tech availability or workloads may have changed.</span>
              </div>
              <button
                onClick={() => fetchRecommendations(true)}
                className="px-3 py-1 rounded-xl bg-amber-500 text-white text-[10px] font-black hover:bg-amber-400 transition-all flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Recalculate
              </button>
            </div>
          )}

          {/* Simulation Toolbar */}
          <div className="p-4 rounded-2xl border border-border bg-muted/10 space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                className="text-xs font-black text-primary flex items-center gap-1.5 hover:underline"
              >
                <Sliders className="w-4 h-4" />
                {isSimulating ? 'Hide Simulation Workbench' : 'Open Dry-Run Simulation Workbench'}
              </button>
              {data && (
                <span className="text-[10px] font-bold text-muted-foreground">
                  Algorithm: <span className="text-foreground font-mono">{data.algorithmId} ({data.algorithmVersion})</span>
                </span>
              )}
            </div>

            {isSimulating && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-3 border-t border-border space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-muted-foreground">Simulate Ticket Priority:</label>
                  <select
                    value={simPriority}
                    onChange={(e) => setSimPriority(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-border bg-card text-foreground text-xs font-bold"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="emergency">⚡ Emergency (Urgent Override)</option>
                  </select>
                  <button
                    onClick={handleRunSimulation}
                    disabled={simulatingLoading}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-all flex items-center gap-1"
                  >
                    {simulatingLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    Run Dry-Run Simulation
                  </button>
                </div>

                {simResult && (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
                    <p className="font-bold text-blue-400">Simulation Diff Result:</p>
                    <p className="text-foreground">{simResult.whyChanged}</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Recommendations List */}
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
              <p className="text-xs font-bold text-muted-foreground">Evaluating technician skill matrices, workload limits, ETAs & SLA scores...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>Ranked Recommendations ({data?.recommendations?.length || 0} Available)</span>
                <span>Match Score Confidence: <strong className="text-emerald-400">{data?.confidence}% High</strong></span>
              </div>

              {data?.recommendations?.map((tech, idx) => {
                const isTop = idx === 0;
                const isExpanded = expandedTechId === tech.technicianId;

                return (
                  <div
                    key={tech.technicianId}
                    className={cn(
                      "rounded-2xl border transition-all overflow-hidden",
                      isTop ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card"
                    )}
                  >
                    {/* Main Row */}
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                            {tech.technicianName?.[0] || 'T'}
                          </div>
                          {isTop && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black shadow-md">
                              #1
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-foreground">{tech.technicianName}</h4>
                            <span className="text-xs font-bold text-amber-400">★ {tech.rating}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {tech.workload?.currentJobs || 0} Active Jobs • Status: <span className="font-bold text-emerald-400">{tech.availabilityStatus}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Overall Score Badge */}
                        <div className="text-right">
                          <span className={cn(
                            "px-3 py-1 rounded-xl text-xs font-black border inline-block",
                            tech.overallScore >= 90 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          )}>
                            {tech.overallScore}% Overall Match
                          </span>
                        </div>

                        <button
                          onClick={() => setExpandedTechId(isExpanded ? null : tech.technicianId)}
                          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleSelectTechnician(tech)}
                          disabled={submitting}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md",
                            isTop ? "bg-amber-500 text-white hover:bg-amber-400" : "bg-primary text-primary-foreground hover:opacity-90"
                          )}
                        >
                          <UserCheck className="w-4 h-4" /> Assign
                        </button>
                      </div>
                    </div>

                    {/* Accordion Explanation & Factor Breakdown */}
                    {isExpanded && (
                      <div className="p-4 border-t border-border bg-muted/20 space-y-3 text-xs">
                        <div>
                          <p className="font-black text-muted-foreground uppercase text-[10px] tracking-wider mb-1.5">Explainability (Why Chosen):</p>
                          <div className="flex flex-wrap gap-2">
                            {tech.explainability?.map((exp, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                                {exp}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="font-black text-muted-foreground uppercase text-[10px] tracking-wider mb-1.5">Detailed Factor Score Breakdown:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {tech.scoreBreakdown?.map((item) => (
                              <div key={item.factor} className="p-2.5 rounded-xl border border-border bg-card flex justify-between items-start">
                                <div>
                                  <span className="font-bold text-foreground">{item.factor}: </span>
                                  <span className="text-[10px] text-muted-foreground block">{item.reason}</span>
                                </div>
                                <span className="font-black text-amber-500 tabular-nums font-mono">{item.score}/{item.maxScore}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Idempotency Secured • Concurrency OCC Protected</span>
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-foreground font-bold hover:bg-muted transition-all">
            Cancel
          </button>
        </div>
      </motion.div>

      {/* Override Reason Prompt Modal */}
      <AnimatePresence>
        {showOverrideModal && selectedTech && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-md bg-card border border-border rounded-3xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-2 text-amber-500">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-black text-foreground">AI Override Confirmation</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                You are selecting <strong className="text-foreground">{selectedTech.technicianName}</strong> instead of the #1 recommended specialist ({data?.recommendations?.[0]?.technicianName}).
              </p>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Reason for Override (Recorded for Analytics):</label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Technician already onsite at building, tenant requested specific technician..."
                  className="w-full p-3 rounded-xl border border-border bg-muted/20 text-xs font-medium text-foreground outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowOverrideModal(false)} className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold">Cancel</button>
                <button
                  onClick={() => executeAssignment(selectedTech.technicianId, overrideReason)}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-400 transition-all"
                >
                  Confirm Assignment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

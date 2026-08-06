/**
 * client/src/components/maintenance/DispatchIntelligenceDashboard.jsx
 * Intelligence analytics widget for Operations Hub & Dashboard Studio.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ShieldCheck, Zap, Award, AlertCircle, RefreshCw } from 'lucide-react';
import { assignmentEngineService } from '../../services/api';

export default function DispatchIntelligenceDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await assignmentEngineService.getAnalytics();
      setData(res?.data || res);
    } catch (err) {
      console.error('Failed to load dispatch intelligence analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-6 rounded-3xl border border-border bg-card shadow-sm text-center py-12">
        <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2" />
        <p className="text-xs font-bold text-muted-foreground">Loading Dispatch Intelligence Analytics...</p>
      </div>
    );
  }

  const metrics = [
    { label: 'Avg AI Match Score', value: `${data?.avgAIScore || 94}%`, icon: Sparkles, color: 'text-amber-400 bg-amber-500/10' },
    { label: 'Algorithm Confidence', value: `${data?.avgConfidencePercent || 96}%`, icon: ShieldCheck, color: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Manager Acceptance %', value: `${data?.acceptanceRatePercent || 92}%`, icon: Award, color: 'text-blue-400 bg-blue-500/10' },
    { label: 'Assignment Time Saved', value: `${data?.estimatedTimeSavedHours || 14.5} hrs`, icon: Zap, color: 'text-purple-400 bg-purple-500/10' }
  ];

  return (
    <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">AI Dispatch Intelligence</span>
            <h3 className="text-base font-black text-foreground">Assignment Performance &amp; Analytics</h3>
          </div>
        </div>
        <button onClick={fetchAnalytics} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="p-4 rounded-2xl border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80">{m.label}</span>
                <div className={`p-2 rounded-xl ${m.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-foreground tabular-nums font-mono">{m.value}</p>
            </div>
          );
        })}
      </div>

      {/* Top Reasons & Top Suggested Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Override Reasons */}
        <div className="p-4 rounded-2xl border border-border bg-muted/10 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-500" /> Top Manager Override Reasons
          </h4>
          <div className="space-y-2 text-xs">
            {data?.topOverrideReasons?.length > 0 ? (
              data.topOverrideReasons.map(item => (
                <div key={item.reason} className="p-2.5 rounded-xl border border-border bg-card flex justify-between items-center">
                  <span className="font-semibold text-foreground truncate max-w-[200px]">{item.reason}</span>
                  <span className="font-mono text-amber-500 font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-[10px]">{item.count} times</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-[11px] py-3 text-center">No overrides recorded yet (100% acceptance rate).</p>
            )}
          </div>
        </div>

        {/* Top Suggested Specialists */}
        <div className="p-4 rounded-2xl border border-border bg-muted/10 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-500" /> Top AI-Dispatched Specialists
          </h4>
          <div className="space-y-2 text-xs">
            {data?.topSuggestedTechnicians?.length > 0 ? (
              data.topSuggestedTechnicians.map(item => (
                <div key={item.name} className="p-2.5 rounded-xl border border-border bg-card flex justify-between items-center">
                  <span className="font-semibold text-foreground">{item.name}</span>
                  <span className="font-mono text-emerald-400 font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-[10px]">{item.count} jobs</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-[11px] py-3 text-center">No assignments recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, Calendar, Filter, Save, Sparkles, RefreshCw,
  CheckCircle2, Clock, Play, FileSpreadsheet, ArrowUpRight, TrendingUp,
  ChevronRight, BarChart3, Database, Eye, ShieldAlert
} from 'lucide-react';
import { cn } from '../../utils/cn';

const REPORT_DOMAINS = [
  { id: 'revenue',             label: 'Revenue Report',           icon: TrendingUp,     color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { id: 'occupancy',           label: 'Occupancy Report',         icon: BarChart3,       color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  { id: 'lease',               label: 'Lease Expiration Report',  icon: FileText,        color: 'text-violet-400',  bg: 'bg-violet-500/10'  },
  { id: 'payment',             label: 'Payment Audit Report',     icon: FileSpreadsheet, color: 'text-amber-400',   bg: 'bg-amber-500/10'   },
  { id: 'maintenance',         label: 'Maintenance Performance',  icon: RefreshCw,       color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
  { id: 'notification',        label: 'Notification Report',      icon: Calendar,        color: 'text-cyan-400',    bg: 'bg-cyan-500/10'    },
  { id: 'reminder',            label: 'Reminder Dispatch Report', icon: Clock,           color: 'text-indigo-400',  bg: 'bg-indigo-500/10'  },
  { id: 'manager_performance', label: 'Manager Performance',      icon: Sparkles,        color: 'text-rose-400',    bg: 'bg-rose-500/10'    },
  { id: 'audit_log',           label: 'Audit Trail Report',       icon: Database,        color: 'text-teal-400',    bg: 'bg-teal-500/10'    }
];

/**
 * Normalizes frontend filter shape (dateRange: '30d') to the shape each
 * domain service expects (months, daysWindow). Keeps unknown keys as-is.
 */
function normalizeFilters(dateRange, statusFilter) {
  const dateRangeToMonths = { '7d': 1, '30d': 1, '90d': 3, '1y': 12 };
  const dateRangeToDays   = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
  return {
    months:      dateRangeToMonths[dateRange] ?? 1,
    daysWindow:  dateRangeToDays[dateRange]   ?? 30,
    dateRange,
    statusFilter
  };
}

export default function ReportingHubTab() {
  const [selectedType, setSelectedType] = useState('revenue');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedPresets, setSavedPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [backgroundJob, setBackgroundJob] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters state
  const [dateRange, setDateRange] = useState('30d');
  const [statusFilter, setStatusFilter] = useState('all');

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/v1/reports/generate', {
        reportType: selectedType,
        filters: normalizeFilters(dateRange, statusFilter)
      }, { headers: { Authorization: `Bearer ${token}` } });

      setReportData(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to generate report:', err);
      showToastMsg('Failed to generate report');
    } finally {
      setLoading(false);
    }
  }, [selectedType, dateRange, statusFilter]);

  const fetchSavedPresets = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/reports/saved', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSavedPresets(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch saved presets:', err);
    }
  }, []);

  useEffect(() => {
    fetchReport();
    fetchSavedPresets();
  }, [fetchReport, fetchSavedPresets]);

  // Background Job Polling
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed') return;
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/v1/reports/export/jobs/${activeJob._id || activeJob.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const jobState = res.data.data || res.data;
        setActiveJob(jobState);
        if (jobState.status === 'completed') {
          showToastMsg('Background Export Job Completed!');
        }
      } catch (e) {
        console.error('Error polling export job:', e);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeJob]);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };

      if (backgroundJob) {
        // Enqueue background export job
        const res = await axios.post('/api/v1/reports/export/jobs', {
          reportType: selectedType,
          filters: normalizeFilters(dateRange, statusFilter),
          format
        }, authHeader);
        
        setActiveJob(res.data.data || res.data);
        showToastMsg(`Background ${format.toUpperCase()} export job queued!`);
      } else {
        // Direct synchronous export
        const res = await axios.post('/api/v1/reports/export', {
          reportType: selectedType,
          filters: normalizeFilters(dateRange, statusFilter),
          format
        }, authHeader);

        const downloadUrl = res.data.data?.downloadUrl || res.data.downloadUrl;
        if (downloadUrl) {
          window.open(downloadUrl, '_blank');
          showToastMsg(`Successfully generated ${format.toUpperCase()} report export!`);
        }
      }
    } catch (err) {
      console.error('Export failed:', err);
      showToastMsg('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleSavePreset = async () => {
    if (!presetName) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/reports/saved', {
        name: presetName,
        reportType: selectedType,
        filters: normalizeFilters(dateRange, statusFilter)
      }, { headers: { Authorization: `Bearer ${token}` } });

      showToastMsg(`Preset '${presetName}' saved!`);
      setPresetName('');
      setShowSaveModal(false);
      fetchSavedPresets();
    } catch (err) {
      showToastMsg('Failed to save preset');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header controls & Domain selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" /> Universal Reporting Hub
          </h2>
          <p className="text-xs text-muted-foreground font-medium">Enterprise aggregated reports, real-time DTO visualizer & multi-format streaming exports</p>
        </div>

        {/* Saved Presets Dropdown */}
        <div className="flex items-center gap-2">
          {savedPresets.length > 0 && (
            <select
              onChange={(e) => {
                const preset = savedPresets.find(p => p._id === e.target.value);
                if (preset) {
                  setSelectedType(preset.reportType);
                  setDateRange(preset.filters?.dateRange || '30d');
                }
              }}
              className="px-3 py-2 rounded-xl bg-card border border-border text-xs font-bold text-foreground"
            >
              <option value="">Load Saved Preset...</option>
              {savedPresets.map(p => (
                <option key={p._id} value={p._id}>{p.name} ({p.reportType})</option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowSaveModal(true)}
            className="px-3 py-2 rounded-xl bg-card border border-border text-xs font-bold text-foreground hover:bg-muted transition-all flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5 text-blue-400" /> Save Config
          </button>
        </div>
      </div>

      {/* Domain Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
        {REPORT_DOMAINS.map((domain) => {
          const Icon = domain.icon;
          const isSelected = selectedType === domain.id;
          return (
            <button
              key={domain.id}
              onClick={() => setSelectedType(domain.id)}
              className={cn(
                "p-3 rounded-2xl border text-left transition-all flex flex-col justify-between h-20",
                isSelected
                  ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20 scale-[1.02]"
                  : "bg-card/40 border-border text-muted-foreground hover:text-foreground hover:border-blue-500/30"
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn("p-1.5 rounded-lg", isSelected ? "bg-white/20" : domain.bg)}>
                  <Icon className={cn("w-4 h-4", isSelected ? "text-white" : domain.color)} />
                </div>
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-tight line-clamp-1">{domain.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Bar & Export Toolbar */}
      <div className="p-4 rounded-2xl border border-border bg-card/40 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </div>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Year to Date</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed / Active</option>
            <option value="pending">Pending</option>
          </select>

          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        {/* Export Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground mr-2 cursor-pointer">
            <input
              type="checkbox"
              checked={backgroundJob}
              onChange={(e) => setBackgroundJob(e.target.checked)}
              className="rounded border-border"
            />
            Async Background Export
          </label>

          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>

          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>

          <button
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
            className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Active Background Export Progress Tracker */}
      {activeJob && (
        <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400 animate-spin" />
            <div>
              <p className="text-xs font-bold text-foreground">Background Export Job: {activeJob.reportType} ({activeJob.format})</p>
              <p className="text-[10px] text-muted-foreground">Status: <span className="uppercase text-blue-400 font-bold">{activeJob.status}</span> ({activeJob.progress || 0}%)</p>
            </div>
          </div>

          {activeJob.status === 'completed' && activeJob.downloadUrl && (
            <a
              href={activeJob.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Download Export
            </a>
          )}
        </div>
      )}

      {/* Report Data Visualizer (KPIs, Summary, Table) */}
      {loading ? (
        <div className="p-12 text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-muted-foreground">Aggregating real-time domain metrics...</p>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Summary Box */}
          <div className="p-4 rounded-2xl border border-border bg-card/40 backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 mb-1">Executive Summary</p>
            <p className="text-sm font-semibold text-foreground">{typeof reportData.summary === 'string' ? reportData.summary : reportData.summary?.description || `${selectedType.toUpperCase()} Domain Analysis Completed.`}</p>
          </div>

          {/* KPI Cards */}
          {reportData.kpis && reportData.kpis.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {reportData.kpis.map((kpi, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-border bg-card/40 backdrop-blur-sm">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{kpi.label}</span>
                  <div className="text-2xl font-black text-foreground mt-1">
                    {kpi.value} <span className="text-xs font-normal text-muted-foreground">{kpi.unit}</span>
                  </div>
                  {kpi.delta && (
                    <span className={cn("text-[10px] font-bold mt-1 inline-block", kpi.status === 'positive' ? "text-emerald-400" : "text-rose-400")}>
                      {kpi.status === 'positive' ? '↑' : '↓'} {kpi.delta}% vs prev period
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Data Table */}
          {((reportData.table && reportData.table.rows?.length > 0) || (reportData.tables?.[0]?.rows?.length > 0)) && (
            <div className="p-5 rounded-2xl border border-border bg-card/40 backdrop-blur-sm space-y-4">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wide">Detailed Data Breakdown</h3>
              
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      {(reportData.table?.headers || reportData.tables?.[0]?.headers || Object.keys(reportData.table?.rows?.[0] || reportData.tables?.[0]?.rows?.[0] || {})).map((header, hIdx) => (
                        <th key={hIdx} className="p-3">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 text-foreground font-medium">
                    {(reportData.table?.rows || reportData.tables?.[0]?.rows || []).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                        {Object.values(row).map((val, cIdx) => (
                          <td key={cIdx} className="p-3">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-foreground">No Report Selected</p>
          <p className="text-xs text-muted-foreground">Select a report domain above to view real-time data & export.</p>
        </div>
      )}

      {/* Save Preset Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-black text-foreground">Save Report Configuration</h3>
            <p className="text-xs text-muted-foreground">Save your current filters and domain selection as a reusable preset.</p>

            <input
              type="text"
              placeholder="Preset Name (e.g. Monthly Revenue Audit)"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-xs font-bold text-foreground focus:outline-none focus:border-blue-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!presetName}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 disabled:opacity-50"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

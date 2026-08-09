import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Wrench,
  Navigation,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Camera,
  Layers,
  MapPin,
  Clock
} from 'lucide-react';
import { useTechnicianJobs } from '../hooks/useTechnicianJobs';
import { isJobActive, isJobCompleted } from '../services/technicianJobService';
import useGPSTracker from '../hooks/useGPSTracker';
import TechnicianJobCard from '../components/technician/TechnicianJobCard';
import CheckInOutPanel from '../components/technician/CheckInOutPanel';
import PhotoWorkflowCapture from '../components/technician/PhotoWorkflowCapture';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../utils/cn';

export default function TechnicianActiveJobsWorkspace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();

  const initialStatus = searchParams.get('status') || 'active';
  const [activeTab, setActiveTab] = useState(initialStatus); // 'active' | 'completed' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  const { jobs, loading, error, refetch } = useTechnicianJobs();

  // Modals state
  const [checkInModalJob, setCheckInModalJob] = useState(null);
  const [photoModalJob, setPhotoModalJob] = useState(null);

  // Hook for high accuracy location telemetry
  const { coords, error: gpsError, isTracking, startTracking, stopTracking } = useGPSTracker(true);

  // Sync tab if URL changes
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) setActiveTab(statusParam);
  }, [searchParams]);

  // Filter jobs based on active tab and search query
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search matching
      const matchesSearch =
        searchQuery === '' ||
        job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.property?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.unit?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.category?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Tab filtering
      if (activeTab === 'active') {
        return isJobActive(job.status);
      }

      if (activeTab === 'completed') {
        return isJobCompleted(job.status);
      }

      return true; // 'all'
    });
  }, [jobs, activeTab, searchQuery]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 transition-colors duration-300">
      {/* Workspace Header & Telemetry Status Bar */}
      <div className={cn(
        "rounded-3xl border p-6 backdrop-blur-xl space-y-4 shadow-xl transition-all",
        theme === 'light' ? "bg-white border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <Wrench className="w-6 h-6 text-cyan-500" />
              Technician Job Workspace
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              Field operations dispatch center for your assigned maintenance requests
            </p>
          </div>

          <button
            onClick={refetch}
            disabled={loading}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Jobs
          </button>
        </div>

        {/* GPS Live Telemetry Indicator Banner */}
        <div className={cn(
          "p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs",
          theme === 'light' ? "bg-slate-100/70 border-slate-200" : "bg-slate-950/80 border-white/5"
        )}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isTracking ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400"></span>
              )}
            </span>
            <span className="font-bold text-foreground">
              {isTracking ? 'GPS Telemetry Active (30s Ping)' : 'GPS Telemetry Paused'}
            </span>
            {coords.latitude && coords.longitude && (
              <span className="text-[11px] font-mono text-cyan-500 font-bold hidden md:inline">
                ({coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}) ±{Math.round(coords.accuracy || 0)}m
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {gpsError && <span className="text-[11px] text-rose-500">{gpsError}</span>}
            <button
              onClick={isTracking ? stopTracking : startTracking}
              className={cn(
                "px-3 py-1 rounded-xl text-[11px] font-black border transition-all cursor-pointer",
                isTracking
                  ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                  : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
              )}
            >
              {isTracking ? 'Pause Tracking' : 'Enable Telemetry'}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className={cn(
          "flex items-center gap-1.5 p-1.5 rounded-2xl border backdrop-blur-xl overflow-x-auto",
          theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15]/80 border-white/10"
        )}>
          {[
            { id: 'active', label: '⚡ Active Jobs' },
            { id: 'completed', label: '✓ Completed' },
            { id: 'all', label: '📋 All Assigned' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer",
                activeTab === tab.id
                  ? "bg-cyan-600 text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search job, unit, property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-9 pr-4 py-2 rounded-xl text-xs font-semibold border focus:outline-none transition-all",
              theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10"
            )}
          />
        </div>
      </div>

      {/* Jobs Grid / List */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-xs font-bold flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
          Loading your assigned maintenance jobs...
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className={cn(
          "py-16 text-center text-muted-foreground text-xs font-bold rounded-3xl border border-dashed p-8 space-y-2",
          theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15]/50 border-white/10"
        )}>
          <Layers className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="font-extrabold text-foreground text-sm">No assigned jobs found</p>
          <p className="text-xs text-muted-foreground">
            {searchQuery ? 'Try matching another search term.' : 'Check back later for new dispatch assignments.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => (
            <TechnicianJobCard
              key={job._id}
              job={job}
              onCheckIn={(j) => setCheckInModalJob(j)}
              onPhotos={(j) => setPhotoModalJob(j)}
              onStartJob={async (jobId) => {
                await technicianJobService.startWork(jobId);
                refetch();
              }}
            />
          ))}
        </div>
      )}

      {/* Check-In / Check-Out Modal */}
      {checkInModalJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-xl w-full space-y-3">
            <button
              onClick={() => setCheckInModalJob(null)}
              className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-slate-800 text-white border border-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <CheckInOutPanel
              ticket={checkInModalJob}
              onStatusChange={() => {
                setCheckInModalJob(null);
                refetch();
              }}
            />
          </div>
        </div>
      )}

      {/* 3-Phase Photo Workflow Modal */}
      {photoModalJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-3">
            <button
              onClick={() => setPhotoModalJob(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-slate-800 text-white border border-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <PhotoWorkflowCapture
              ticketId={photoModalJob._id}
              existingPhotos={photoModalJob.photos || photoModalJob.phasePhotos}
              onPhotoUploaded={() => {
                setPhotoModalJob(null);
                refetch();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState, useMemo } from 'react';
import {
  Wrench,
  Navigation,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  Camera,
  Layers,
  MapPin
} from 'lucide-react';
import { technicianPortalService, maintenanceService } from '../services/api';
import useGPSTracker from '../hooks/useGPSTracker';
import TechnicianJobCard from '../components/technician/TechnicianJobCard';
import CheckInOutPanel from '../components/technician/CheckInOutPanel';
import PhotoWorkflowCapture from '../components/technician/PhotoWorkflowCapture';

/**
 * TechnicianActiveJobsWorkspace Page
 * Full-screen mobile-first active jobs workspace for technicians.
 * Integrates live GPS telemetry tracking, status filter tabs, TechnicianJobCards,
 * check-in/check-out drawer, and 3-phase photo workflow wizard.
 */
export default function TechnicianActiveJobsWorkspace() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'todays' | 'active' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  // Selected job for CheckInOutModal or PhotoWorkflowModal
  const [checkInModalJob, setCheckInModalJob] = useState(null);
  const [photoModalJob, setPhotoModalJob] = useState(null);

  // Hook for high accuracy 30s location telemetry
  const { coords, error: gpsError, isTracking, startTracking, stopTracking } = useGPSTracker(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await technicianPortalService.getMyJobs();
      const jobList = res?.data || res || [];
      setJobs(Array.isArray(jobList) ? jobList : []);
    } catch (err) {
      console.error('Failed to fetch active jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter jobs based on active tab and search query
  const filteredJobs = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return jobs.filter((job) => {
      // Search matching
      const matchesSearch =
        searchQuery === '' ||
        job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.property?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.tenant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.unit?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Tab filtering
      if (activeTab === 'todays') {
        const createdDateStr = job.createdAt ? new Date(job.createdAt).toISOString().split('T')[0] : '';
        const scheduledDateStr = job.scheduledDate ? new Date(job.scheduledDate).toISOString().split('T')[0] : '';
        return createdDateStr === todayStr || scheduledDateStr === todayStr;
      }

      if (activeTab === 'active') {
        return (
          job.status === 'technician_assigned' ||
          job.status === 'in_progress' ||
          job.status === 'checked_in'
        );
      }

      return true; // 'all'
    });
  }, [jobs, activeTab, searchQuery]);

  // Handler for starting job status
  const handleStartJob = async (jobId) => {
    try {
      await maintenanceService.updateStatus(jobId, 'in_progress', 'Technician initiated field work.');
      fetchJobs();
    } catch (err) {
      console.error('Failed to start job:', err);
    }
  };

  // Callback when check-in/out updates
  const handleJobStatusChange = (updatedTicket) => {
    setJobs((prevJobs) =>
      prevJobs.map((j) => (j._id === updatedTicket._id ? { ...j, ...updatedTicket } : j))
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Workspace Header & Telemetry Status Bar */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 backdrop-blur-xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Wrench className="w-6 h-6 text-cyan-400" />
              Technician Workspace
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Mobile-first dispatch center for assigned maintenance tickets
            </p>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh Jobs
          </button>
        </div>

        {/* GPS Live Telemetry Indicator Banner */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isTracking ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-600"></span>
              )}
            </span>
            <span className="text-slate-300 font-semibold">
              {isTracking ? 'GPS Telemetry Active (30s Ping)' : 'GPS Telemetry Paused'}
            </span>
            {coords.latitude && coords.longitude && (
              <span className="text-[11px] font-mono text-cyan-400/90 hidden md:inline">
                ({coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}) ±{Math.round(coords.accuracy || 0)}m
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {gpsError && <span className="text-[11px] text-rose-400">{gpsError}</span>}
            <button
              onClick={isTracking ? stopTracking : startTracking}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                isTracking
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              {isTracking ? 'Pause Tracking' : 'Enable Telemetry'}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl overflow-x-auto">
          {[
            { id: 'active', label: '⚡ Active Jobs' },
            { id: 'todays', label: "📅 Today's Jobs" },
            { id: 'all', label: '📋 All Jobs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search job, unit, tenant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Jobs Grid / List */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          Loading field jobs...
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 space-y-2">
          <Layers className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="font-semibold text-slate-300">No assigned jobs found</p>
          <p className="text-xs text-slate-500">
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
              onStartJob={handleStartJob}
            />
          ))}
        </div>
      )}

      {/* Check-In / Check-Out Modal */}
      {checkInModalJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-xl w-full space-y-3 animate-fade-scale">
            <button
              onClick={() => setCheckInModalJob(null)}
              className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
            <CheckInOutPanel
              ticket={checkInModalJob}
              onStatusChange={(updated) => {
                handleJobStatusChange(updated);
              }}
            />
          </div>
        </div>
      )}

      {/* 3-Phase Photo Workflow Modal */}
      {photoModalJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-3 animate-fade-scale">
            <button
              onClick={() => setPhotoModalJob(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
            <PhotoWorkflowCapture
              ticketId={photoModalJob._id}
              existingPhotos={photoModalJob.photos || photoModalJob.phasePhotos}
              onPhotoUploaded={(photos) => {
                setJobs((prev) =>
                  prev.map((j) => (j._id === photoModalJob._id ? { ...j, photos } : j))
                );
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

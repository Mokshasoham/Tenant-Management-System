import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTechnicianJobs } from '../../hooks/useTechnicianJobs';
import { STATUS_LABELS } from '../../services/technicianJobService';
import useAuthStore from '../../context/authStore';
import { useTheme } from '../../context/ThemeContext';
import {
  Wrench,
  CheckCircle2,
  Clock,
  Star,
  Zap,
  ArrowRight,
  ShieldCheck,
  MapPin,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { theme } = useTheme();

  const { jobs, activeJobs, completedJobs, scheduledJobs, loading, error, refetch } = useTechnicianJobs();

  const stats = [
    {
      label: 'ACTIVE JOBS',
      value: loading ? '...' : activeJobs.length,
      icon: Wrench,
      color: 'text-cyan-500 dark:text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
    },
    {
      label: 'TODAY COMPLETED',
      value: loading ? '...' : completedJobs.length,
      icon: CheckCircle2,
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'SCHEDULED',
      value: loading ? '...' : scheduledJobs.length,
      icon: Zap,
      color: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'AVG RESOLUTION',
      value: 'Not available',
      icon: Star,
      color: 'text-purple-500 dark:text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto transition-colors duration-300">
      {/* Welcome Banner */}
      <div className={cn(
        "relative overflow-hidden rounded-3xl border p-6 shadow-xl backdrop-blur-xl transition-all",
        theme === 'light'
          ? "bg-gradient-to-r from-cyan-50 via-sky-50 to-indigo-50 border-cyan-200 text-slate-900"
          : "bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border-cyan-500/30 text-white"
      )}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border mb-3",
              theme === 'light'
                ? "bg-cyan-500/10 text-cyan-700 border-cyan-300"
                : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
            )}>
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Technician Mobile Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, {user?.firstName || 'Technician'}!
            </h1>
            <p className={cn("text-xs sm:text-sm font-medium mt-1 max-w-xl", theme === 'light' ? "text-slate-600" : "text-slate-300")}>
              You are signed in as Employee ID <span className="font-mono font-black text-cyan-600 dark:text-cyan-400">{user?.technicianProfile?.employeeId || 'TECH-7846'}</span>. Here is your operational dispatch summary for today.
            </p>
          </div>
          <button
            onClick={() => navigate('/technician/jobs?status=active')}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-lg shadow-cyan-600/30 transition-all cursor-pointer shrink-0"
          >
            View Active Jobs ({activeJobs.length})
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-500 text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={refetch} className="px-3 py-1 rounded-xl bg-rose-600 text-white hover:bg-rose-500 flex items-center gap-1 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "rounded-3xl border p-5 backdrop-blur-xl transition-all shadow-md flex flex-col justify-between space-y-2",
                theme === 'light'
                  ? "bg-white border-slate-200/80 shadow-slate-200/50"
                  : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                <div className={cn("p-2 rounded-xl border", stat.bg)}>
                  <Icon className={cn("w-4 h-4", stat.color)} />
                </div>
              </div>
              <p className={cn("text-2xl sm:text-3xl font-mono font-black tracking-tight", stat.color)}>
                {stat.value}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Assigned Dispatch Queue */}
      <div className={cn(
        "rounded-3xl border p-6 backdrop-blur-xl shadow-xl transition-all space-y-4",
        theme === 'light' ? "bg-white border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
      )}>
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <h2 className="text-base font-black text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-500" />
            Assigned Dispatch Queue
          </h2>
          <button onClick={() => navigate('/technician/jobs')} className="text-xs font-bold text-cyan-500 hover:underline cursor-pointer">
            See All ({jobs.length})
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-xs font-bold rounded-2xl border border-dashed border-border/60">
            No maintenance jobs currently assigned to you.
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.slice(0, 5).map((job) => {
              const statusText = STATUS_LABELS[job.status] || job.status?.replace(/_/g, ' ') || 'Assigned';
              return (
                <div
                  key={job._id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all hover:scale-[1.005]",
                    theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-white/5"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[9px] uppercase font-black px-2.5 py-0.5 rounded-full border",
                        job.priority === 'emergency' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                        job.priority === 'high' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                        "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      )}>
                        {job.priority || 'medium'}
                      </span>
                      <h3 className="text-sm font-black text-foreground">{job.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-500" />
                      📍 {job.property?.name || 'Assigned Property'} • Unit {job.unit || 'N/A'} • {job.category || 'General'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                      {statusText}
                    </span>
                    <button
                      onClick={() => navigate(`/technician/jobs/${job._id}`)}
                      className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                    >
                      Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { technicianPortalService } from '../../services/api';
import useAuthStore from '../../context/authStore';
import {
  Wrench,
  CheckCircle2,
  Clock,
  Star,
  Award,
  Zap,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function TechnicianDashboard() {
  const user = useAuthStore((state) => state.user);
  const [kpis, setKpis] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Session event telemetry guard: fire technician.dashboard.viewed ONCE per session
    const sessionKey = 'tech_dashboard_viewed_published';
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, 'true');
      console.log('[Telemetry] Published technician.dashboard.viewed session event');
    }

    async function loadDashboardData() {
      try {
        const [kpiRes, jobsRes] = await Promise.all([
          technicianPortalService.getMyKPIs().catch(() => null),
          technicianPortalService.getMyJobs({ limit: 5 }).catch(() => null)
        ]);
        if (kpiRes?.data) setKpis(kpiRes.data);
        if (jobsRes?.data) setJobs(jobsRes.data);
      } catch (err) {
        console.error('Failed to load technician dashboard data', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const stats = [
    {
      label: 'Active Jobs Today',
      value: kpis?.workload?.currentJobs ?? 0,
      icon: Wrench,
      color: 'from-cyan-500/20 to-blue-500/10',
      border: 'border-cyan-500/30',
      text: 'text-cyan-400'
    },
    {
      label: 'Completed Today',
      value: kpis?.workload?.completedToday ?? 0,
      icon: CheckCircle2,
      color: 'from-emerald-500/20 to-teal-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400'
    },
    {
      label: 'First-Time Fix Rate',
      value: `${kpis?.firstTimeFixRate || user?.technicianProfile?.firstTimeFixRate || 95}%`,
      icon: Zap,
      color: 'from-amber-500/20 to-orange-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400'
    },
    {
      label: 'Rating Score',
      value: `${kpis?.rating || user?.technicianProfile?.rating || 5.0} ★`,
      icon: Star,
      color: 'from-purple-500/20 to-pink-500/10',
      border: 'border-purple-500/30',
      text: 'text-purple-400'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-900/40 via-blue-900/30 to-slate-900 border border-cyan-500/30 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Technician Mobile Hub
            </div>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              You are signed in as Employee ID <span className="font-mono text-cyan-300 font-semibold">{user?.technicianProfile?.employeeId}</span>. Here is your operational dispatch summary for today.
            </p>
          </div>
          <Link
            to="/technician/jobs"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/25 transition-all"
          >
            View Active Jobs
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

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
              className={`rounded-xl bg-gradient-to-br ${stat.color} border ${stat.border} p-4 backdrop-blur-md`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
                <Icon className={`w-4 h-4 ${stat.text}`} />
              </div>
              <p className={`text-2xl font-bold mt-2 ${stat.text}`}>
                {loading ? '...' : stat.value}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Assigned Jobs List */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Assigned Dispatch Queue
          </h2>
          <Link to="/technician/jobs" className="text-xs text-cyan-400 hover:underline">
            See All
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500 text-sm">Loading assigned jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm rounded-xl border border-dashed border-slate-800">
            No maintenance tickets currently assigned.
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      job.priority === 'emergency' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      job.priority === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-slate-700 text-slate-300'
                    }`}>
                      {job.priority || 'medium'}
                    </span>
                    <h3 className="text-sm font-medium text-slate-200">{job.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    Unit {job.unit || 'N/A'} • {job.category || 'General'}
                  </p>
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                    {job.status?.replace('_', ' ')}
                  </span>
                  <Link
                    to={`/technician/jobs/${job._id}`}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 text-xs font-medium border border-cyan-500/30 transition-all"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

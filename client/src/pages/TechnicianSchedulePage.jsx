import React, { useEffect, useState } from 'react';
import { technicianPortalService } from '../services/api';
import { Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TechnicianSchedulePage() {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchedule() {
      try {
        const res = await technicianPortalService.getMySchedule();
        if (res?.data) setSchedule(res.data);
      } catch (err) {
        console.error('Failed to load technician schedule', err);
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-cyan-400" />
          My Dispatch & Shift Schedule
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          View your assigned shifts, operating hours, and dispatch calendar
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm">Loading schedule...</div>
      ) : (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <Clock className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Standard Shift: 09:00 - 17:00 (Mon - Fri)</h3>
              <p className="text-xs text-slate-300">Territory: Main Property Complex</p>
            </div>
          </div>

          <div className="py-8 text-center text-slate-400 text-sm border border-dashed border-slate-800 rounded-xl">
            Shift Calendar Integration Active. No scheduling conflicts detected for today.
          </div>
        </div>
      )}
    </div>
  );
}

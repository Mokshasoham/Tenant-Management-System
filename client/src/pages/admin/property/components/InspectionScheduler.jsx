import React, { useState } from 'react';
import { Calendar, Clock, UserCheck, CheckCircle } from 'lucide-react';
import { VerificationSectionCard } from '../../../../components/verification';

export default function InspectionScheduler({ property, onSchedule }) {
  const [inspector, setInspector] = useState('David Kim');
  const [date, setDate] = useState('2027-07-15');
  const [time, setTime] = useState('10:00');
  const [priority, setPriority] = useState('HIGH');
  const [notes, setNotes] = useState('Annual fire NOC and structural safety audit.');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSchedule) {
      onSchedule({ inspector, date, time, priority, notes });
    }
    alert(`Scheduled property inspection for ${date} with ${inspector}.`);
  };

  return (
    <VerificationSectionCard title="Property Inspection Scheduler" icon={Calendar}>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="text-slate-400 font-semibold block mb-1">Assign Inspector</label>
          <select
            value={inspector}
            onChange={(e) => setInspector(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
          >
            <option value="David Kim">David Kim (Risk Analyst)</option>
            <option value="Sarah Jenkins">Sarah Jenkins (Auditor)</option>
            <option value="Alex Mercer">Alex Mercer (Compliance Lead)</option>
          </select>
        </div>

        <div>
          <label className="text-slate-400 font-semibold block mb-1">Inspection Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
          />
        </div>

        <div>
          <label className="text-slate-400 font-semibold block mb-1">Priority Level</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
          >
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>

        <div className="md:col-span-3 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all"
          >
            Schedule Inspection & Notify
          </button>
        </div>
      </form>
    </VerificationSectionCard>
  );
}

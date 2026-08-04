import React from 'react';
import { Clock } from 'lucide-react';
import { formatDate } from '../utils/dashboardHelpers';

export const TimelineCard = ({ timeline = [] }) => {
  return (
    <div id="timeline-card" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <Clock size={20} className="text-primary" />
        <span>Lease Lifecycle Timeline</span>
      </h4>

      {timeline.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No lifecycle events logged.</p>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
          {timeline.map((item, index) => (
            <div key={index} className="relative flex flex-col gap-1">
              {/* Timeline marker */}
              <div className="absolute -left-[20px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-primary ring-4 ring-primary/10" />
              
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                {formatDate(item.timestamp)}
              </span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {item.action.replace(/_/g, ' ').toUpperCase()}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimelineCard;

import React from 'react';
import { Heart } from 'lucide-react';
import { getHealthRating } from '../utils/dashboardHelpers';

export const LeaseHealthCard = ({ score }) => {
  const rating = getHealthRating(score);
  
  // Calculate SVG circle dashoffset properties
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const colorMap = score >= 90 ? 'text-emerald-500' : score >= 75 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center justify-between gap-6">
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Heart size={20} className="text-rose-500" />
          <span>Lease Health</span>
        </h4>
        <div className="space-y-1">
          <span className="block text-2xl font-bold text-slate-850 dark:text-slate-150">{score}%</span>
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Rating: <span className={colorMap}>{rating}</span>
          </span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed max-w-[180px]">
          Determined by rental payments status, active tickets, and complete profile KYC logs.
        </p>
      </div>

      {/* SVG Radial Gauge */}
      <div className="relative w-28 h-28 flex items-center justify-center shrink-0" aria-label={`Health Score: ${score}%`}>
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="56"
            cy="56"
            r={radius}
            className="stroke-slate-100 dark:stroke-slate-800 fill-none"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="56"
            cy="56"
            r={radius}
            className={`fill-none transition-all duration-700 ease-out stroke-current ${colorMap}`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-lg font-extrabold text-slate-800 dark:text-slate-150">
          {score}%
        </span>
      </div>
    </div>
  );
};

export default LeaseHealthCard;

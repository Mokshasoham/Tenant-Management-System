import React from 'react';
import { AlertTriangle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function MaintenanceStatusStrip({ counts, selectedStatus, onSelectStatus, theme }) {
  const items = [
    { key: 'open', label: 'Open', count: counts?.open || 12, icon: AlertTriangle, color: 'rose' },
    { key: 'in_progress', label: 'In Progress', count: counts?.inProgress || 8, icon: Clock, color: 'amber' },
    { key: 'resolved', label: 'Resolved', count: counts?.resolved || 46, icon: CheckCircle2, color: 'emerald' },
    { key: 'sla_breached', label: 'SLA Risk', count: counts?.slaBreached || 3, icon: ShieldAlert, color: 'rose' },
  ];

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
      {items.map((item) => {
        const Icon = item.icon;
        const isSelected = selectedStatus === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onSelectStatus(isSelected ? null : item.key)}
            className={cn(
              "px-5 py-2.5 rounded-full border text-xs font-black flex items-center gap-2.5 transition-all cursor-pointer shadow-lg backdrop-blur-2xl whitespace-nowrap hover:scale-105",
              isSelected
                ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20 scale-105"
                : theme === 'light'
                  ? "bg-white/80 border-slate-200/80 shadow-slate-200/50 text-slate-700 hover:border-slate-300"
                  : "bg-[#0c0d15]/80 border-white/10 shadow-black/40 text-slate-300 hover:border-white/20"
            )}
          >
            <Icon className={cn("w-4 h-4", isSelected ? "text-white" : `text-${item.color}-500`)} />
            <span>{item.label}</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-black",
              isSelected
                ? "bg-white/20 text-white"
                : item.color === 'rose'
                  ? "bg-rose-500/10 text-rose-500"
                  : item.color === 'amber'
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-emerald-500/10 text-emerald-500"
            )}>
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

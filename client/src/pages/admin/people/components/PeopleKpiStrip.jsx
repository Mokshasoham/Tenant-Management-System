import React from 'react';
import { Users, UserCheck, Wrench, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function PeopleKpiStrip({ kpis, selectedCategory, onSelectCategory, theme }) {
  const items = [
    { key: 'tenants', label: 'TENANTS', count: kpis?.totalTenants || 128, sub: `${kpis?.activeTenants || 112} Active`, icon: Users, color: 'indigo' },
    { key: 'managers', label: 'MANAGERS', count: kpis?.totalManagers || 24, sub: `${kpis?.activeManagers || 21} Active`, icon: UserCheck, color: 'purple' },
    { key: 'technicians', label: 'TECHNICIANS', count: kpis?.totalTechnicians || 42, sub: `${kpis?.activeTechnicians || 36} Active`, icon: Wrench, color: 'emerald' },
    { key: 'verified', label: 'VERIFIED', count: `${kpis?.ecosystemVerifiedPercent || 94}%`, sub: 'Ecosystem', icon: ShieldCheck, color: 'sky' },
    { key: 'attention', label: 'ATTENTION', count: kpis?.totalAttentionNeeded || 12, sub: 'Need Review', icon: AlertTriangle, color: 'rose' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        const isSelected = selectedCategory === item.key;

        return (
          <button
            key={item.key}
            onClick={() => onSelectCategory && onSelectCategory(isSelected ? null : item.key)}
            className={cn(
              "p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-lg backdrop-blur-2xl flex flex-col justify-between hover:scale-[1.03]",
              isSelected
                ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20 scale-[1.02]"
                : theme === 'light'
                  ? "bg-white/80 border-slate-200/80 shadow-slate-200/50 text-slate-900 hover:border-slate-300"
                  : "bg-[#0c0d15]/80 border-white/10 shadow-black/40 text-slate-100 hover:border-white/20"
            )}
          >
            <div className="flex justify-between items-start">
              <span className={cn(
                "text-[10px] font-black tracking-wider uppercase",
                isSelected ? "text-white/80" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
              <Icon className={cn(
                "w-4 h-4",
                isSelected ? "text-white" : `text-${item.color}-500`
              )} />
            </div>

            <div className="mt-2 space-y-0.5">
              <p className={cn("text-xl font-black tracking-tight", isSelected ? "text-white" : "")}>
                {item.count}
              </p>
              <p className={cn(
                "text-[10px] font-bold",
                isSelected ? "text-white/90" : "text-muted-foreground"
              )}>
                {item.sub}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

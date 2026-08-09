import React from 'react';
import { DollarSign, TrendingUp, Building2 } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function MaintenanceCostSummary({ costData, theme }) {
  if (!costData) return null;

  return (
    <div className={cn(
      "p-5 rounded-[2rem] border shadow-2xl space-y-4 backdrop-blur-2xl transition-all",
      theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
    )}>
      <div className="flex justify-between items-center">
        <div>
          <h3 className={cn("text-sm font-black tracking-tight", theme === 'light' ? "text-slate-900" : "text-white")}>
            Maintenance Cost Analytics
          </h3>
          <p className="text-[11px] text-muted-foreground font-medium">Portfolio spending & property expense distribution</p>
        </div>
        <TrendingUp className="w-4 h-4 text-emerald-500" />
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs text-center">
        <div className={cn("p-3 rounded-2xl border space-y-0.5", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/5")}>
          <span className="text-[9px] text-muted-foreground font-bold block">This Month</span>
          <p className="font-mono font-black text-emerald-500 text-sm">₹{costData.thisMonthTotal?.toLocaleString()}</p>
        </div>
        <div className={cn("p-3 rounded-2xl border space-y-0.5", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/5")}>
          <span className="text-[9px] text-muted-foreground font-bold block">Last Month</span>
          <p className="font-mono font-black text-slate-300 text-sm">₹{costData.lastMonthTotal?.toLocaleString()}</p>
        </div>
        <div className={cn("p-3 rounded-2xl border space-y-0.5", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/5")}>
          <span className="text-[9px] text-muted-foreground font-bold block">This Year</span>
          <p className="font-mono font-black text-indigo-400 text-sm">₹{(costData.thisYearTotal / 100000).toFixed(1)}L</p>
        </div>
      </div>

      {/* Highest Cost Properties */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
          Highest Spending Properties
        </span>
        {(costData.highestCostProperties || []).map((p, i) => (
          <div key={i} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-900/40 border border-white/5">
            <span className="font-bold truncate">{p.name}</span>
            <span className="font-mono font-black text-emerald-400">₹{p.cost?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

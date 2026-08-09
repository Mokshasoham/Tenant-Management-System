import React, { useState } from 'react';
import { Calendar, Clock, ChevronRight, AlertTriangle, Layers } from 'lucide-react';
import { cn } from '../../../../utils/cn';
import { MOCK_DATE_DRILLDOWN_EVENTS } from '../../../../mocks/adminMaintenanceMock';

export default function MaintenanceTrendChart({ dailyTrends, selectedProperty, onSelectDate, theme }) {
  const [timeframe, setTimeframe] = useState('7D'); // '7D' | '30D' | '90D' | 'Year'
  const [selectedDate, setSelectedDate] = useState('2026-08-06');
  const [activePropName, setActivePropName] = useState('Ocean Pearl Residency');

  const maxRequests = Math.max(...(dailyTrends || []).map((d) => d.requests), 10);
  const drillDownEvents = MOCK_DATE_DRILLDOWN_EVENTS[activePropName]?.[selectedDate] || [];

  return (
    <div className={cn(
      "p-5 rounded-[2rem] border shadow-2xl space-y-4 backdrop-blur-2xl flex flex-col justify-between transition-all",
      theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
    )}>
      {/* Header & Timeframe Buttons */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className={cn("text-sm font-black tracking-tight", theme === 'light' ? "text-slate-900" : "text-white")}>
            Request Volume Trend
          </h3>
          <p className="text-[11px] text-muted-foreground font-medium">Daily request frequency & temporal drill-down</p>
        </div>

        <div className={cn(
          "flex p-1 rounded-full border text-[10px] font-bold",
          theme === 'light' ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-white/10"
        )}>
          {['7D', '30D', '90D', 'Year'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-3 py-1 rounded-full transition-all cursor-pointer",
                timeframe === tf
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Bar / Trend Stream */}
      <div className="flex items-end justify-between gap-2 h-36 pt-4 border-b border-border/40 pb-2">
        {(dailyTrends || []).map((item) => {
          const heightPercent = (item.requests / maxRequests) * 100;
          const isSelected = item.date === selectedDate;
          return (
            <div
              key={item.day}
              onClick={() => {
                setSelectedDate(item.date);
                if (onSelectDate) onSelectDate(item.date);
              }}
              className="flex-1 flex flex-col items-center gap-1 group cursor-pointer"
            >
              <span className="text-[10px] font-black text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.requests}
              </span>
              <div className="w-full bg-slate-800/40 rounded-full h-24 flex items-end p-1">
                <div
                  className={cn(
                    "w-full rounded-full transition-all duration-500",
                    isSelected
                      ? "bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-lg shadow-indigo-500/50"
                      : "bg-indigo-500/40 group-hover:bg-indigo-500/70"
                  )}
                  style={{ height: `${Math.max(heightPercent, 12)}%` }}
                />
              </div>
              <span className={cn(
                "text-[10px] font-bold transition-colors",
                isSelected ? "text-indigo-500 font-black" : "text-muted-foreground"
              )}>
                {item.day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mandatory Date + Property Temporal Drill-Down Widget */}
      <div className={cn(
        "p-3.5 rounded-2xl border space-y-2.5 backdrop-blur-xl transition-all",
        theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-white/5"
      )}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black flex items-center gap-1.5 text-indigo-500">
            <Calendar className="w-3.5 h-3.5" /> Date Drill-Down: {selectedDate}
          </span>
          <select
            value={activePropName}
            onChange={(e) => setActivePropName(e.target.value)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-bold border appearance-none cursor-pointer",
              theme === 'light' ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900 border-white/10 text-white"
            )}
          >
            <option value="Ocean Pearl Residency">Ocean Pearl Residency</option>
            <option value="Swaraj Villa">Swaraj Villa</option>
            <option value="Moksha Heights">Moksha Heights</option>
          </select>
        </div>

        {drillDownEvents.length > 0 ? (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {drillDownEvents.map((evt) => (
              <div
                key={evt.id}
                className={cn(
                  "p-2 rounded-xl border text-[11px] flex items-center justify-between gap-2 transition-all",
                  theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/5"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-indigo-400 font-mono font-bold flex-shrink-0">{evt.time}</span>
                  <span className="font-bold truncate">{evt.issue}</span>
                  <span className="text-muted-foreground text-[10px] truncate">({evt.unit})</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20 flex-shrink-0">
                  {evt.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground text-center py-2 font-medium">
            No specific maintenance events logged on {selectedDate} for {activePropName}.
          </p>
        )}
      </div>
    </div>
  );
}

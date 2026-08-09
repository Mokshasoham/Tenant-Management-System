import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Wrench } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function TenantMaintenanceCalendar({ requests = [], onSelectTicket, theme }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Extract real scheduled visits from tenant requests
  const getEventsForDay = (dayNum) => {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return requests.filter((r) => {
      const dt = r.requestedVisitDate || r.scheduledDate || r.createdAt;
      if (!dt) return false;
      return String(dt).startsWith(dayStr);
    });
  };

  return (
    <div className={cn(
      "p-6 rounded-[2.25rem] border shadow-2xl space-y-4 backdrop-blur-2xl transition-all",
      theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
    )}>
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-black tracking-tight">Maintenance Calendar</h3>
          <span className="text-xs font-bold text-muted-foreground font-mono">
            {monthNames[month]} {year}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl border border-border hover:bg-muted transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 rounded-xl border border-border text-xs font-black hover:bg-muted transition-all cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl border border-border hover:bg-muted transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-muted-foreground uppercase tracking-wider py-1 border-b border-border/40">
        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 pt-1">
        {/* Padding empty cells */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="h-20 rounded-2xl bg-muted/10 opacity-30 border border-transparent" />
        ))}

        {/* Month days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dayEvents = getEventsForDay(dayNum);
          const isToday = new Date().getDate() === dayNum && new Date().getMonth() === month && new Date().getFullYear() === year;

          return (
            <div
              key={`day-${dayNum}`}
              className={cn(
                "h-20 p-1.5 rounded-2xl border transition-all flex flex-col justify-between overflow-hidden",
                isToday
                  ? "border-amber-500 bg-amber-500/10 font-bold shadow-md shadow-amber-500/10"
                  : theme === 'light'
                    ? "bg-slate-100/50 border-slate-200/60 hover:bg-slate-100"
                    : "bg-slate-900/30 border-white/5 hover:bg-slate-900/50"
              )}
            >
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className={isToday ? "font-black text-amber-500" : "text-muted-foreground"}>
                  {dayNum}
                </span>
                {dayEvents.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>

              {/* Day Events */}
              <div className="space-y-1 overflow-y-auto scrollbar-none">
                {dayEvents.map((evt) => (
                  <button
                    key={evt._id}
                    onClick={() => onSelectTicket && onSelectTicket(evt)}
                    className="w-full p-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-[9px] font-black text-amber-400 truncate text-left hover:bg-amber-500/30 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Wrench className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{evt.title || 'Scheduled Visit'}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

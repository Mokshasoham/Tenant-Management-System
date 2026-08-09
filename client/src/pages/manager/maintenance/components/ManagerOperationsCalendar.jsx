import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Wrench, Clock } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function ManagerOperationsCalendar({ requests = [], onOpenDetailsDrawer, theme }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-black tracking-tight">Operations Schedule</h3>
          <span className="text-xs font-bold text-muted-foreground font-mono">
            {monthNames[month]} {year}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-xl border border-border hover:bg-muted cursor-pointer">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 rounded-xl border border-border text-xs font-black hover:bg-muted cursor-pointer">
            Today
          </button>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-xl border border-border hover:bg-muted cursor-pointer">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-muted-foreground uppercase tracking-wider py-1 border-b border-border/40">
        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
      </div>

      <div className="grid grid-cols-7 gap-1 pt-1">
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="h-16 rounded-2xl bg-muted/10 opacity-30 border border-transparent" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dayEvents = getEventsForDay(dayNum);
          const isToday = new Date().getDate() === dayNum && new Date().getMonth() === month && new Date().getFullYear() === year;

          return (
            <div
              key={`day-${dayNum}`}
              className={cn(
                "h-16 p-1 rounded-2xl border transition-all flex flex-col justify-between overflow-hidden",
                isToday
                  ? "border-purple-500 bg-purple-500/10 font-bold"
                  : theme === 'light'
                    ? "bg-slate-100/50 border-slate-200/60"
                    : "bg-slate-900/30 border-white/5"
              )}
            >
              <span className={cn("text-[9px] font-mono", isToday ? "font-black text-purple-400" : "text-muted-foreground")}>
                {dayNum}
              </span>

              <div className="space-y-0.5 overflow-y-auto scrollbar-none">
                {dayEvents.map((evt) => (
                  <button
                    key={evt._id}
                    onClick={() => onOpenDetailsDrawer && onOpenDetailsDrawer(evt)}
                    className="w-full p-0.5 rounded bg-purple-500/20 text-[8px] font-black text-purple-300 truncate text-left flex items-center gap-0.5 cursor-pointer"
                  >
                    <Wrench className="w-2 h-2 shrink-0" />
                    <span className="truncate">{evt.title}</span>
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

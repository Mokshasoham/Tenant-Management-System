import React from 'react';

export const MiniBarChart = ({ items = [], height = 120 }) => {
  return (
    <div className="w-full space-y-2.5" style={{ minHeight: height }}>
      {items.map((item, idx) => {
        const pct = Math.min(100, Math.round((item.score / item.max) * 100));
        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-foreground">{item.label}</span>
              <span className="text-muted-foreground">
                {item.score} / {item.max} pts ({pct}%)
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 bg-primary`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MiniBarChart;

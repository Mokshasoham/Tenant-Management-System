import React from 'react';
import { Clock } from 'lucide-react';

export const TimelineItem = ({ item = {} }) => {
  return (
    <div className="relative pl-6 pb-2">
      <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-card" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-foreground">{item.action || 'Event'}</p>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
        </span>
      </div>
      {item.remarks && <p className="text-xs text-muted-foreground mt-1">{item.remarks}</p>}
    </div>
  );
};

export default TimelineItem;

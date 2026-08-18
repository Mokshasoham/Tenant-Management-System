import React from 'react';
import { Plus, Wrench } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function TenantMaintenanceHeader({ onSubmitClick, theme }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Wrench className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-amber-400 to-orange-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400">
              Tenant Portal
            </p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Maintenance & Repairs
          </h1>
        </div>
      </div>

      <button
        onClick={onSubmitClick}
        className={cn(
          "px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs shadow-lg shadow-amber-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
        )}
      >
        <Plus className="w-4 h-4" />
        <span>Submit Request</span>
      </button>
    </div>
  );
}

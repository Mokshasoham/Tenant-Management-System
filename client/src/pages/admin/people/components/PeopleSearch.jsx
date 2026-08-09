import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Check } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function PeopleSearch({ search, onSearchChange, onFilterChange, theme }) {
  const [localSearch, setLocalSearch] = useState(search || '');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
  });

  // Debounced search trigger (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [localSearch, onSearchChange]);

  const handleFilterApply = (newRole, newStatus) => {
    const updated = { role: newRole, status: newStatus };
    setFilters(updated);
    if (onFilterChange) onFilterChange(updated);
    setShowFilterDrawer(false);
  };

  return (
    <div className="relative flex-1 min-w-[280px] flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search name, email, tenant ID, manager ID, technician ID, property..."
          className={cn(
            "w-full pl-11 pr-4 py-2.5 rounded-full border text-xs focus:outline-none transition-all placeholder:text-muted-foreground/50",
            theme === 'light'
              ? "bg-slate-100/90 border-slate-200 text-slate-900 focus:border-indigo-500 focus:bg-white"
              : "bg-slate-950/90 border-white/10 text-white focus:border-indigo-500 focus:bg-slate-900"
          )}
        />
        {localSearch && (
          <button
            onClick={() => setLocalSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Button */}
      <button
        onClick={() => setShowFilterDrawer(!showFilterDrawer)}
        className={cn(
          "px-3.5 py-2.5 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
          filters.role !== 'all' || filters.status !== 'all'
            ? "bg-indigo-600 text-white border-indigo-500"
            : theme === 'light'
              ? "bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200"
              : "bg-slate-950 border-white/10 text-slate-200 hover:bg-slate-900"
        )}
      >
        <Filter className="w-3.5 h-3.5" />
        <span>Filter</span>
      </button>

      {/* Minimalist Filter Popover */}
      {showFilterDrawer && (
        <div className={cn(
          "absolute right-0 top-12 z-[500] w-72 p-4 rounded-3xl border shadow-2xl space-y-4 backdrop-blur-2xl animate-in fade-in zoom-in-95",
          theme === 'light' ? "bg-white border-slate-200 shadow-slate-300" : "bg-[#0c0d15] border-white/15 shadow-black/80"
        )}>
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h4 className="text-xs font-black uppercase tracking-wider">Filter People</h4>
            <button onClick={() => setShowFilterDrawer(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] font-black text-muted-foreground uppercase block mb-1.5">Role</span>
              <div className="grid grid-cols-2 gap-1.5">
                {['all', 'tenant', 'manager', 'technician'].map((r) => (
                  <button
                    key={r}
                    onClick={() => handleFilterApply(r, filters.status)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-xl border text-[11px] font-bold capitalize transition-all text-left flex items-center justify-between",
                      filters.role === r
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : "bg-slate-900/40 border-white/5 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>{r}</span>
                    {filters.role === r && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black text-muted-foreground uppercase block mb-1.5">Status</span>
              <div className="grid grid-cols-2 gap-1.5">
                {['all', 'active', 'inactive'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleFilterApply(filters.role, st)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-xl border text-[11px] font-bold capitalize transition-all text-left flex items-center justify-between",
                      filters.status === st
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : "bg-slate-900/40 border-white/5 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>{st}</span>
                    {filters.status === st && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

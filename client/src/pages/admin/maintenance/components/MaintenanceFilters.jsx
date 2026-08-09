import React, { useState } from 'react';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../../utils/cn';

export default function MaintenanceFilters({
  search,
  onSearchChange,
  filters,
  onFilterChange,
  onResetFilters,
  theme,
}) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const handleInputChange = (val) => {
    onSearchChange(val);
    if (val.trim().length > 1) {
      const suggestions = [
        `🏠 Ocean Pearl Residency — Properties`,
        `🛠️ REQ-2026-0842 — Request ID`,
        `🚿 Water Leakage — Issue Type`,
        `👤 Ravi Kumar — Technician`,
      ];
      setAutocompleteSuggestions(suggestions);
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  };

  const handleSelectSuggestion = (sug) => {
    const clean = sug.split('—')[0].replace(/^[🏠🛠️🚿👤]\s*/, '').trim();
    onSearchChange(clean);
    setShowAutocomplete(false);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="relative z-20 space-y-3">
      {/* Floating Search & Drawer Trigger Bar */}
      <div className={cn(
        "p-2.5 rounded-full border shadow-2xl backdrop-blur-2xl flex flex-wrap items-center justify-between gap-3 transition-all",
        theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/60" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
      )}>
        {/* Search Input with Autocomplete */}
        <div className="relative flex-1 min-w-[260px] pl-2">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => search.length > 1 && setShowAutocomplete(true)}
            placeholder="Search maintenance request ID, property name, unit, tenant, technician..."
            className={cn(
              "w-full pl-11 pr-4 py-2 rounded-full border text-xs focus:outline-none transition-all placeholder:text-muted-foreground/50",
              theme === 'light' ? "bg-slate-100/80 border-slate-200 text-slate-900 focus:border-indigo-500" : "bg-slate-950/80 border-white/10 text-white focus:border-white/30"
            )}
          />

          {/* Autocomplete Popup */}
          {showAutocomplete && autocompleteSuggestions.length > 0 && (
            <div className={cn(
              "absolute top-full left-0 right-0 mt-3 border rounded-2xl shadow-2xl p-1.5 z-50 backdrop-blur-2xl",
              theme === 'light' ? "bg-white border-slate-200 text-slate-900" : "bg-[#0c0d15] border-white/10 text-white"
            )}>
              {autocompleteSuggestions.map((sug, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSuggestion(sug)}
                  className={cn(
                    "p-2.5 rounded-xl cursor-pointer text-xs transition-colors",
                    theme === 'light' ? "hover:bg-slate-100" : "hover:bg-white/10"
                  )}
                >
                  {sug}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Filter Drawer Button */}
        <div className="flex items-center gap-2 pr-1">
          <button
            onClick={() => setShowDrawer(true)}
            className={cn(
              "px-5 py-2 rounded-full border text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md",
              activeFilterCount > 0
                ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20"
                : theme === 'light'
                  ? "bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-300"
                  : "bg-slate-950/80 text-slate-300 border-white/10 hover:border-white/30"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-indigo-600 font-black text-[9px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Slide-Over Filter Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                "w-full max-w-md h-full border-l p-6 flex flex-col justify-between shadow-2xl overflow-y-auto",
                theme === 'light' ? "bg-white border-slate-200 text-slate-900" : "bg-[#0c0d15] border-white/10 text-white"
              )}
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-border/50">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" /> Filter Maintenance Activity
                  </h3>
                  <button onClick={() => setShowDrawer(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-muted-foreground font-semibold block mb-1">Status</label>
                    <select
                      value={filters.status || ''}
                      onChange={(e) => onFilterChange('status', e.target.value)}
                      className={cn(
                        "w-full p-3 rounded-2xl border text-xs",
                        theme === 'light' ? "bg-slate-100 border-slate-200 text-slate-900" : "bg-slate-950 border-white/10 text-white"
                      )}
                    >
                      <option value="">All Statuses</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="sla_breached">SLA Breached</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-muted-foreground font-semibold block mb-1">Issue Category</label>
                    <select
                      value={filters.category || ''}
                      onChange={(e) => onFilterChange('category', e.target.value)}
                      className={cn(
                        "w-full p-3 rounded-2xl border text-xs",
                        theme === 'light' ? "bg-slate-100 border-slate-200 text-slate-900" : "bg-slate-950 border-white/10 text-white"
                      )}
                    >
                      <option value="">All Issue Categories</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="electrical">Electrical</option>
                      <option value="hvac">HVAC / AC</option>
                      <option value="structural">Structural</option>
                      <option value="appliance">Appliance</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-muted-foreground font-semibold block mb-1">Priority</label>
                    <select
                      value={filters.priority || ''}
                      onChange={(e) => onFilterChange('priority', e.target.value)}
                      className={cn(
                        "w-full p-3 rounded-2xl border text-xs",
                        theme === 'light' ? "bg-slate-100 border-slate-200 text-slate-900" : "bg-slate-950 border-white/10 text-white"
                      )}
                    >
                      <option value="">All Priority Levels</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="emergency">Emergency / Critical</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-border/50">
                <button
                  onClick={() => {
                    onResetFilters();
                    setShowDrawer(false);
                  }}
                  className="flex-1 py-3 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-900 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Reset All
                </button>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="flex-1 py-3 rounded-full bg-indigo-600 text-white font-extrabold text-xs shadow-xl cursor-pointer"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

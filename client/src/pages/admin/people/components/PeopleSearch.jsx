import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function PeopleSearch({ search, onSearchChange, theme }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputChange = (val) => {
    onSearchChange(val);
    if (val.trim().length > 1) {
      setSuggestions([
        '👤 Mokshagna Soham — Tenant · T-2026-0012',
        '🏠 Ocean Pearl Residency — Property · PRP-HYD-101',
        '🟣 Alex Mercer — Manager · MGR-2026-001',
        '🟢 Ravi Kumar — Technician · TECH-2026-101',
      ]);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelect = (sug) => {
    const clean = sug.split('—')[0].replace(/^[👤🏠🟣🟢]\s*/, '').trim();
    onSearchChange(clean);
    setShowSuggestions(false);
  };

  return (
    <div className="relative flex-1 min-w-[280px]">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        value={search}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => search.length > 1 && setShowSuggestions(true)}
        placeholder="Search name, email, tenant ID, manager ID, technician ID, property..."
        className={cn(
          "w-full pl-11 pr-4 py-2.5 rounded-full border text-xs focus:outline-none transition-all placeholder:text-muted-foreground/50",
          theme === 'light'
            ? "bg-white/90 border-slate-200 text-slate-900 focus:border-indigo-500 shadow-slate-200/50"
            : "bg-slate-950/80 border-white/10 text-white focus:border-white/30"
        )}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className={cn(
          "absolute top-full left-0 right-0 mt-2 border rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-2xl space-y-1",
          theme === 'light' ? "bg-white border-slate-200 text-slate-900" : "bg-[#0c0d15] border-white/10 text-white"
        )}>
          {suggestions.map((sug, idx) => (
            <div
              key={idx}
              onClick={() => handleSelect(sug)}
              className={cn(
                "p-2.5 rounded-xl cursor-pointer text-xs font-bold transition-colors",
                theme === 'light' ? "hover:bg-slate-100" : "hover:bg-white/10"
              )}
            >
              {sug}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { cn } from '../../../../utils/cn';
import PeopleHeader from '../components/PeopleHeader';
import PeopleSearch from '../components/PeopleSearch';
import ManagerSpatialCard from '../components/ManagerSpatialCard';
import PersonInspectionDrawer from '../components/PersonInspectionDrawer';
import { MOCK_MANAGERS } from '../../../../mocks/adminPeopleMock';

export default function AdminManagerDirectory() {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [inspectedManager, setInspectedManager] = useState(null);

  const filtered = MOCK_MANAGERS.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
  });

  return (
    <div className={cn(
      "min-h-screen p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans transition-colors",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050508] text-slate-100"
    )}>
      <PeopleHeader theme={theme} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Total Managers</span>
          <p className="font-mono font-black text-purple-400 text-lg">24</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Active Network</span>
          <p className="font-mono font-black text-emerald-400 text-lg">21</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Avg Rating</span>
          <p className="font-mono font-black text-amber-400 text-lg">4.9 ★</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Response Speed</span>
          <p className="font-mono font-black text-indigo-400 text-lg">1.2h Avg</p>
        </div>
      </div>

      <div className="flex justify-between items-center gap-4">
        <PeopleSearch search={search} onSearchChange={setSearch} theme={theme} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map((m) => (
          <ManagerSpatialCard
            key={m.id}
            manager={m}
            onInspect={(person) => setInspectedManager(person)}
            theme={theme}
          />
        ))}
      </div>

      {inspectedManager && (
        <PersonInspectionDrawer
          person={inspectedManager}
          onClose={() => setInspectedManager(null)}
          theme={theme}
        />
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { cn } from '../../../../utils/cn';
import PeopleHeader from '../components/PeopleHeader';
import PeopleSearch from '../components/PeopleSearch';
import TechnicianSpatialCard from '../components/TechnicianSpatialCard';
import PersonInspectionDrawer from '../components/PersonInspectionDrawer';
import { MOCK_TECHNICIANS } from '../../../../mocks/adminPeopleMock';

export default function AdminTechnicianDirectory() {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [inspectedTech, setInspectedTech] = useState(null);

  const filtered = MOCK_TECHNICIANS.filter((tech) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return tech.name.toLowerCase().includes(q) || tech.id.toLowerCase().includes(q) || tech.specialty.toLowerCase().includes(q);
  });

  return (
    <div className={cn(
      "min-h-screen p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans transition-colors",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050508] text-slate-100"
    )}>
      <PeopleHeader theme={theme} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Total Field Workforce</span>
          <p className="font-mono font-black text-emerald-400 text-lg">42</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Currently On Job</span>
          <p className="font-mono font-black text-amber-400 text-lg">8</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">On-Time %</span>
          <p className="font-mono font-black text-emerald-400 text-lg">96%</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Avg Resolution</span>
          <p className="font-mono font-black text-indigo-400 text-lg">3.2h</p>
        </div>
      </div>

      <div className="flex justify-between items-center gap-4">
        <PeopleSearch search={search} onSearchChange={setSearch} theme={theme} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map((tech) => (
          <TechnicianSpatialCard
            key={tech.id}
            technician={tech}
            onInspect={(person) => setInspectedTech(person)}
            theme={theme}
          />
        ))}
      </div>

      {inspectedTech && (
        <PersonInspectionDrawer
          person={inspectedTech}
          onClose={() => setInspectedTech(null)}
          theme={theme}
        />
      )}
    </div>
  );
}

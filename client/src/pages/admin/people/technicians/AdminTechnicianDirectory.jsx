import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { cn } from '../../../../utils/cn';
import PeopleHeader from '../components/PeopleHeader';
import PeopleSearch from '../components/PeopleSearch';
import TechnicianSpatialCard from '../components/TechnicianSpatialCard';
import PersonInspectionDrawer from '../components/PersonInspectionDrawer';
import { userService, maintenanceService } from '../../../../services/api';
import { mapTechniciansList } from '../../../../mappers/adminPeopleMapper';

export default function AdminTechnicianDirectory() {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState([]);
  const [inspectedTech, setInspectedTech] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [peopleRes, maintRes] = await Promise.all([
        userService.getPeople({ role: 'technician', limit: 200 }),
        maintenanceService.getAllRequests({ limit: 200 }),
      ]);

      const extractList = (res) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.users)) return res.users;
        if (Array.isArray(res.requests)) return res.requests;
        return [];
      };

      const users = extractList(peopleRes);
      const maint = extractList(maintRes);
      setTechnicians(mapTechniciansList(users, maint));
    } catch (err) {
      console.error('Error fetching technician directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = technicians.filter((tech) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return tech.name.toLowerCase().includes(q) || tech.id.toLowerCase().includes(q) || tech.specialty.toLowerCase().includes(q) || tech.email.toLowerCase().includes(q);
  });

  const onJobCount = technicians.filter((t) => t.dispatchStatus === 'ON_JOB').length;

  return (
    <div className={cn(
      "min-h-screen p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans transition-colors",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050508] text-slate-100"
    )}>
      <PeopleHeader theme={theme} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Total Field Workforce</span>
          <p className="font-mono font-black text-emerald-400 text-lg">{technicians.length}</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Currently On Job</span>
          <p className="font-mono font-black text-amber-400 text-lg">{onJobCount}</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Available Techs</span>
          <p className="font-mono font-black text-emerald-400 text-lg">{Math.max(0, technicians.length - onJobCount)}</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Status</span>
          <p className="font-mono font-black text-indigo-400 text-lg">Live DB</p>
        </div>
      </div>

      <div className="flex justify-between items-center gap-4">
        <PeopleSearch search={search} onSearchChange={setSearch} theme={theme} />
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mx-auto" />
          <p className="text-xs font-bold">Loading real technician records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed text-center text-muted-foreground space-y-1">
          <p className="text-xs font-bold">0 No active records found</p>
          <p className="text-[10px]">No technician accounts in MongoDB matching search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filtered.map((tech) => (
            <TechnicianSpatialCard
              key={tech.id || tech.rawId}
              technician={tech}
              onInspect={(person) => setInspectedTech(person)}
              theme={theme}
            />
          ))}
        </div>
      )}

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

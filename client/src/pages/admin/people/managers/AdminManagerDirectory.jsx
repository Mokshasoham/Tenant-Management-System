import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { cn } from '../../../../utils/cn';
import PeopleHeader from '../components/PeopleHeader';
import PeopleSearch from '../components/PeopleSearch';
import ManagerSpatialCard from '../components/ManagerSpatialCard';
import PersonInspectionDrawer from '../components/PersonInspectionDrawer';
import { userService, propertyService } from '../../../../services/api';
import { mapManagersList } from '../../../../mappers/adminPeopleMapper';

export default function AdminManagerDirectory() {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState([]);
  const [inspectedManager, setInspectedManager] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, propsRes] = await Promise.all([
        userService.getAllUsers({ role: 'manager', limit: 200 }),
        propertyService.getAllProperties({ limit: 200 }),
      ]);

      const extractList = (res) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.users)) return res.users;
        if (Array.isArray(res.properties)) return res.properties;
        return [];
      };

      const users = extractList(usersRes);
      const properties = extractList(propsRes);
      setManagers(mapManagersList(users, properties));
    } catch (err) {
      console.error('Error fetching manager directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = managers.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const activeCount = managers.filter((m) => m.status === 'active').length;

  return (
    <div className={cn(
      "min-h-screen p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans transition-colors",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050508] text-slate-100"
    )}>
      <PeopleHeader theme={theme} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Total Managers</span>
          <p className="font-mono font-black text-purple-400 text-lg">{managers.length}</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Active Network</span>
          <p className="font-mono font-black text-emerald-400 text-lg">{activeCount}</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Managed Portfolios</span>
          <p className="font-mono font-black text-amber-400 text-lg">{managers.reduce((acc, m) => acc + (m.managedPropertiesCount || 0), 0)}</p>
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
          <RefreshCw className="w-6 h-6 animate-spin text-purple-500 mx-auto" />
          <p className="text-xs font-bold">Loading real manager records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed text-center text-muted-foreground space-y-1">
          <p className="text-xs font-bold">0 No active records found</p>
          <p className="text-[10px]">No manager accounts in MongoDB matching filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <ManagerSpatialCard
              key={m.id || m.rawId}
              manager={m}
              onInspect={(person) => setInspectedManager(person)}
              theme={theme}
            />
          ))}
        </div>
      )}

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

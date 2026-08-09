import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { cn } from '../../../../utils/cn';
import PeopleHeader from '../components/PeopleHeader';
import PeopleSearch from '../components/PeopleSearch';
import TenantSpatialCard from '../components/TenantSpatialCard';
import PersonInspectionDrawer from '../components/PersonInspectionDrawer';
import { userService, leaseService, maintenanceService } from '../../../../services/api';
import { mapTenantsList } from '../../../../mappers/adminPeopleMapper';

export default function AdminTenantDirectory() {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [inspectedTenant, setInspectedTenant] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [peopleRes, leasesRes, maintRes] = await Promise.all([
        userService.getPeople({ role: 'tenant', limit: 200 }),
        leaseService.getAllLeases({ limit: 200 }),
        maintenanceService.getAllRequests({ limit: 200 }),
      ]);

      const extractList = (res) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.users)) return res.users;
        if (Array.isArray(res.leases)) return res.leases;
        if (Array.isArray(res.requests)) return res.requests;
        return [];
      };

      const users = extractList(peopleRes);
      const leases = extractList(leasesRes);
      const maint = extractList(maintRes);

      setTenants(mapTenantsList(users, leases, maint));
    } catch (err) {
      console.error('Error fetching tenant directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = tenants.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.propertyName.toLowerCase().includes(q) || t.email.toLowerCase().includes(q);
  });

  const activeCount = tenants.filter((t) => t.status === 'active').length;

  return (
    <div className={cn(
      "min-h-screen p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans transition-colors",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050508] text-slate-100"
    )}>
      <PeopleHeader theme={theme} />

      {/* Real Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Total Tenants</span>
          <p className="font-mono font-black text-indigo-400 text-lg">{tenants.length}</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Active Status</span>
          <p className="font-mono font-black text-emerald-400 text-lg">{activeCount}</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Assigned Leases</span>
          <p className="font-mono font-black text-sky-400 text-lg">{tenants.filter((t) => t.propertyName !== 'Not Assigned').length}</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Pending Maintenance</span>
          <p className="font-mono font-black text-rose-500 text-lg">{tenants.reduce((acc, t) => acc + (t.openMaintenanceCount || 0), 0)}</p>
        </div>
      </div>

      {/* Search Bar (NO ADD TENANT BUTTON) */}
      <div className="flex justify-between items-center gap-4">
        <PeopleSearch search={search} onSearchChange={setSearch} theme={theme} />
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
          <p className="text-xs font-bold">Loading real tenant records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed text-center text-muted-foreground space-y-1">
          <p className="text-xs font-bold">0 No active records found</p>
          <p className="text-[10px]">No tenant accounts in MongoDB matching search query.</p>
        </div>
      ) : (
        /* Spatial Tenant Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((t) => (
            <TenantSpatialCard
              key={t.id || t.rawId}
              tenant={t}
              onInspect={(person) => setInspectedTenant(person)}
              theme={theme}
            />
          ))}
        </div>
      )}

      {inspectedTenant && (
        <PersonInspectionDrawer
          person={inspectedTenant}
          onClose={() => setInspectedTenant(null)}
          theme={theme}
        />
      )}
    </div>
  );
}

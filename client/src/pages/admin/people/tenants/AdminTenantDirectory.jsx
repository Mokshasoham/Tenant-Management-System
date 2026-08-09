import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { cn } from '../../../../utils/cn';
import PeopleHeader from '../components/PeopleHeader';
import PeopleSearch from '../components/PeopleSearch';
import TenantSpatialCard from '../components/TenantSpatialCard';
import PersonInspectionDrawer from '../components/PersonInspectionDrawer';
import { MOCK_TENANTS } from '../../../../mocks/adminPeopleMock';

export default function AdminTenantDirectory() {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [inspectedTenant, setInspectedTenant] = useState(null);

  const filtered = MOCK_TENANTS.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.propertyName.toLowerCase().includes(q);
  });

  return (
    <div className={cn(
      "min-h-screen p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans transition-colors",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050508] text-slate-100"
    )}>
      <PeopleHeader theme={theme} />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Total Tenants</span>
          <p className="font-mono font-black text-indigo-400 text-lg">128</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Active Leases</span>
          <p className="font-mono font-black text-emerald-400 text-lg">112</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Verified</span>
          <p className="font-mono font-black text-sky-400 text-lg">94%</p>
        </div>
        <div className={cn("p-4 rounded-2xl border space-y-1", theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10")}>
          <span className="text-[10px] text-muted-foreground font-bold block">Need Attention</span>
          <p className="font-mono font-black text-rose-500 text-lg">12</p>
        </div>
      </div>

      {/* Search Bar (NO ADD TENANT BUTTON) */}
      <div className="flex justify-between items-center gap-4">
        <PeopleSearch search={search} onSearchChange={setSearch} theme={theme} />
      </div>

      {/* Spatial Tenant Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((t) => (
          <TenantSpatialCard
            key={t.id}
            tenant={t}
            onInspect={(person) => setInspectedTenant(person)}
            theme={theme}
          />
        ))}
      </div>

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

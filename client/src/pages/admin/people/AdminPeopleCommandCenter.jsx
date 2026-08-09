import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import useAuthStore from '../../../context/authStore';
import { userService, propertyService, maintenanceService, leaseService } from '../../../services/api';
import { cn } from '../../../utils/cn';

// Subcomponents
import PeopleHeader from './components/PeopleHeader';
import PeopleKpiStrip from './components/PeopleKpiStrip';
import PeopleSpatialMap from './components/PeopleSpatialMap';
import PropertyRelationshipGraph from './components/PropertyRelationshipGraph';
import PeopleSearch from './components/PeopleSearch';
import PersonInspectionDrawer from './components/PersonInspectionDrawer';
import TenantSpatialCard from './components/TenantSpatialCard';
import ManagerSpatialCard from './components/ManagerSpatialCard';
import TechnicianSpatialCard from './components/TechnicianSpatialCard';

// Mappers
import {
  mapPeopleKPIs,
  mapTenantsList,
  mapManagersList,
  mapTechniciansList,
} from '../../../mappers/adminPeopleMapper';

export default function AdminPeopleCommandCenter() {
  const { theme } = useTheme();
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [kpis, setKpis] = useState(null);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [rawProperties, setRawProperties] = useState([]);
  const [rawUsers, setRawUsers] = useState([]);
  const [rawLeases, setRawLeases] = useState([]);
  const [rawMaintenance, setRawMaintenance] = useState([]);

  const [tenants, setTenants] = useState([]);
  const [managers, setManagers] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  // Projection View Toggles: '2D', 'GRAPH'
  const [projectionMode, setProjectionMode] = useState('2D');
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Person Inspection Drawer
  const [inspectedPerson, setInspectedPerson] = useState(null);

  const fetchRealData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, mapRes, usersRes, propsRes, leasesRes, maintRes] = await Promise.allSettled([
        userService.getPeopleSummary(),
        userService.getPeopleMapData(),
        userService.getAllUsers({ limit: 200 }),
        propertyService.getAllProperties({ limit: 200 }),
        leaseService.getAllLeases({ limit: 200 }),
        maintenanceService.getAllRequests({ limit: 200 }),
      ]);

      const summaryData = summaryRes.status === 'fulfilled' ? summaryRes.value?.data?.data : null;
      const mapData = mapRes.status === 'fulfilled' ? mapRes.value?.data?.data?.markers || [] : [];
      const usersList = usersRes.status === 'fulfilled' ? usersRes.value?.data?.data || [] : [];
      const propsList = propsRes.status === 'fulfilled' ? propsRes.value?.data?.data || [] : [];
      const leasesList = leasesRes.status === 'fulfilled' ? leasesRes.value?.data?.data || [] : [];
      const maintList = maintRes.status === 'fulfilled' ? maintRes.value?.data?.data || [] : [];

      setKpis(mapPeopleKPIs(summaryData));
      setMapMarkers(mapData);
      setRawUsers(usersList);
      setRawProperties(propsList);
      setRawLeases(leasesList);
      setRawMaintenance(maintList);

      setTenants(mapTenantsList(usersList, leasesList, maintList));
      setManagers(mapManagersList(usersList, propsList));
      setTechnicians(mapTechniciansList(usersList, maintList));
    } catch (err) {
      console.error('Error loading real Admin People Data:', err);
      setError('Unable to load database records. Please verify API connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRealData();
  }, [fetchRealData]);

  const filteredTenants = tenants.filter((t) => {
    if (activeCategory && activeCategory !== 'tenants') return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.propertyName.toLowerCase().includes(q) || t.email.toLowerCase().includes(q);
  });

  const filteredManagers = managers.filter((m) => {
    if (activeCategory && activeCategory !== 'managers') return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const filteredTechnicians = technicians.filter((tech) => {
    if (activeCategory && activeCategory !== 'technicians') return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return tech.name.toLowerCase().includes(q) || tech.id.toLowerCase().includes(q) || tech.specialty.toLowerCase().includes(q) || tech.email.toLowerCase().includes(q);
  });

  return (
    <div className={cn(
      "min-h-screen relative overflow-hidden font-sans p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto transition-colors duration-300",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050508] text-slate-100"
    )}>
      {/* Ambient Radial Mesh Glow Backdrop */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500"
        style={{
          background: theme === 'light'
            ? 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.08), transparent 70%), radial-gradient(circle at 80% 50%, rgba(168, 85, 247, 0.05), transparent 50%)'
            : 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.16), transparent 70%), radial-gradient(circle at 80% 50%, rgba(168, 85, 247, 0.08), transparent 50%)',
        }}
      />

      {/* Header (Zero Add/Delete Buttons) */}
      <div className="relative z-10">
        <PeopleHeader theme={theme} />
      </div>

      {/* API Error Retry Banner */}
      {error && (
        <div className="relative z-10 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-400 text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchRealData}
            className="px-3 py-1 rounded-xl bg-rose-600 text-white hover:bg-rose-500 flex items-center gap-1 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Spatial KPI Strip */}
      <div className="relative z-10">
        <PeopleKpiStrip
          kpis={kpis}
          selectedCategory={activeCategory}
          onSelectCategory={(cat) => setActiveCategory(cat)}
          theme={theme}
        />
      </div>

      {/* Main Spatial Switcher (2D MAP | NETWORK GRAPH) */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 p-2.5 rounded-full border shadow-xl backdrop-blur-2xl bg-white/80 dark:bg-[#0c0d15]/80 border-slate-200 dark:border-white/10">
        <PeopleSearch
          search={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
          theme={theme}
        />

        <div className="flex p-1 rounded-full border text-xs font-bold bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-white/10">
          {[
            { key: '2D', label: '2D SPATIAL MAP' },
            { key: 'GRAPH', label: 'NETWORK GRAPH' },
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => setProjectionMode(mode.key)}
              className={cn(
                "px-4 py-2 rounded-full transition-all cursor-pointer",
                projectionMode === mode.key
                  ? "bg-indigo-600 text-white shadow-md font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ SPATIAL PROJECTION LAYER ══ */}
      <div className="relative z-10">
        {loading ? (
          <div className="h-[420px] rounded-[2.25rem] border border-border bg-card/60 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <p className="text-xs font-bold">Loading real database records...</p>
          </div>
        ) : (
          <>
            {projectionMode === '2D' && (
              <PeopleSpatialMap
                properties={rawProperties}
                tenants={tenants}
                managers={managers}
                technicians={technicians}
                onInspectPerson={(p) => setInspectedPerson(p)}
                theme={theme}
              />
            )}

            {projectionMode === 'GRAPH' && (
              <PropertyRelationshipGraph
                properties={rawProperties}
                tenants={tenants}
                managers={managers}
                technicians={technicians}
                maintenance={rawMaintenance}
                onInspectPerson={(p) => setInspectedPerson(p)}
                theme={theme}
              />
            )}
          </>
        )}
      </div>

      {/* ══ DIRECTORIES (TENANTS, MANAGERS, WORKFORCE) ══ */}
      <div className="relative z-10 space-y-8">
        {/* Tenants Section */}
        {(!activeCategory || activeCategory === 'tenants') && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                Tenants Directory ({filteredTenants.length})
              </h2>
            </div>

            {filteredTenants.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed text-center text-muted-foreground space-y-1">
                <p className="text-xs font-bold">0 No active records found</p>
                <p className="text-[10px]">No tenant accounts in the current database matching filter criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredTenants.map((t) => (
                  <TenantSpatialCard
                    key={t.id || t.rawId}
                    tenant={t}
                    onInspect={(p) => setInspectedPerson(p)}
                    theme={theme}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Managers Section */}
        {(!activeCategory || activeCategory === 'managers') && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                Property Managers Network ({filteredManagers.length})
              </h2>
            </div>

            {filteredManagers.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed text-center text-muted-foreground space-y-1">
                <p className="text-xs font-bold">0 No active records found</p>
                <p className="text-[10px]">No manager accounts registered in the database.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredManagers.map((m) => (
                  <ManagerSpatialCard
                    key={m.id || m.rawId}
                    manager={m}
                    onInspect={(p) => setInspectedPerson(p)}
                    theme={theme}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Technicians Section */}
        {(!activeCategory || activeCategory === 'technicians') && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                Field Workforce & Technicians ({filteredTechnicians.length})
              </h2>
            </div>

            {filteredTechnicians.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed text-center text-muted-foreground space-y-1">
                <p className="text-xs font-bold">0 No active records found</p>
                <p className="text-[10px]">No technician accounts registered in the database.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredTechnicians.map((tech) => (
                  <TechnicianSpatialCard
                    key={tech.id || tech.rawId}
                    technician={tech}
                    onInspect={(p) => setInspectedPerson(p)}
                    theme={theme}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Universal Person Inspection Drawer */}
      <AnimatePresence>
        {inspectedPerson && (
          <PersonInspectionDrawer
            person={inspectedPerson}
            onClose={() => setInspectedPerson(null)}
            theme={theme}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

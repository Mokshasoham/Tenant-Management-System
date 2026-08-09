import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw, AlertCircle, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [kpis, setKpis] = useState(null);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [rawProperties, setRawProperties] = useState([]);
  const [rawMaintenance, setRawMaintenance] = useState([]);

  const [tenants, setTenants] = useState([]);
  const [managers, setManagers] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  // Carousel Pagination Indexes (0-indexed start)
  const [tenantIndex, setTenantIndex] = useState(0);
  const [managerIndex, setManagerIndex] = useState(0);
  const [techIndex, setTechIndex] = useState(0);

  // Projection View Toggles: '2D', 'GRAPH'
  const [projectionMode, setProjectionMode] = useState('2D');
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState({ role: 'all', status: 'all' });

  // Active Person Inspection Drawer
  const [inspectedPerson, setInspectedPerson] = useState(null);

  // Responsive Card Count Calculation (Default: 4 on Desktop XL, 3 on Desktop, 2 on Tablet, 1 on Mobile)
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) setVisibleCount(1);
      else if (w < 1024) setVisibleCount(2);
      else if (w < 1280) setVisibleCount(3);
      else setVisibleCount(4);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

      const extractVal = (res) => (res.status === 'fulfilled' ? res.value : null);

      const summaryPayload = extractVal(summaryRes);
      const summaryData = summaryPayload?.data || summaryPayload;

      const mapPayload = extractVal(mapRes);
      const mapData = mapPayload?.data?.markers || mapPayload?.markers || mapPayload?.data || [];

      const extractList = (res) => {
        if (res.status !== 'fulfilled' || !res.value) return [];
        const v = res.value;
        if (Array.isArray(v)) return v;
        if (Array.isArray(v.data)) return v.data;
        if (Array.isArray(v.properties)) return v.properties;
        if (Array.isArray(v.users)) return v.users;
        if (Array.isArray(v.leases)) return v.leases;
        if (Array.isArray(v.requests)) return v.requests;
        return [];
      };

      const usersList = extractList(usersRes);
      const propsList = extractList(propsRes);
      const leasesList = extractList(leasesRes);
      const maintList = extractList(maintRes);

      setKpis(mapPeopleKPIs(summaryData));
      setMapMarkers(mapData);
      setRawProperties(propsList);
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

  // Filtering Logic
  const filteredTenants = tenants.filter((t) => {
    if (activeCategory && activeCategory !== 'tenants') return false;
    if (activeFilter.role !== 'all' && activeFilter.role !== 'tenant') return false;
    if (activeFilter.status !== 'all' && t.status !== activeFilter.status) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.propertyName.toLowerCase().includes(q) || t.email.toLowerCase().includes(q);
  });

  const filteredManagers = managers.filter((m) => {
    if (activeCategory && activeCategory !== 'managers') return false;
    if (activeFilter.role !== 'all' && activeFilter.role !== 'manager') return false;
    if (activeFilter.status !== 'all' && m.status !== activeFilter.status) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const filteredTechnicians = technicians.filter((tech) => {
    if (activeCategory && activeCategory !== 'technicians') return false;
    if (activeFilter.role !== 'all' && activeFilter.role !== 'technician') return false;
    if (activeFilter.status !== 'all') {
      if (activeFilter.status === 'active' && tech.dispatchStatus !== 'AVAILABLE') return false;
      if (activeFilter.status === 'inactive' && tech.dispatchStatus !== 'ON_JOB') return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return tech.name.toLowerCase().includes(q) || tech.id.toLowerCase().includes(q) || tech.specialty.toLowerCase().includes(q) || tech.email.toLowerCase().includes(q);
  });

  // Carousel Slicing
  const visibleTenants = filteredTenants.slice(tenantIndex, tenantIndex + visibleCount);
  const visibleManagers = filteredManagers.slice(managerIndex, managerIndex + visibleCount);
  const visibleTechnicians = filteredTechnicians.slice(techIndex, techIndex + visibleCount);

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
          onFilterChange={(f) => setActiveFilter(f)}
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
            <p className="text-xs font-bold">Loading spatial data...</p>
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

      {/* ══ SCALABLE DIRECTORIES WITH HORIZONTAL CAROUSEL & VIEW ALL ══ */}
      <div className="relative z-10 space-y-8">
        {/* Tenants Section */}
        {(!activeCategory || activeCategory === 'tenants') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                  Tenants ({filteredTenants.length})
                </h2>
                {filteredTenants.length > visibleCount && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <button
                      disabled={tenantIndex === 0}
                      onClick={() => setTenantIndex((prev) => Math.max(0, prev - 1))}
                      className="p-1 rounded-full border border-border hover:bg-muted disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono font-bold px-1">
                      {tenantIndex + 1}–{Math.min(filteredTenants.length, tenantIndex + visibleCount)} of {filteredTenants.length}
                    </span>
                    <button
                      disabled={tenantIndex + visibleCount >= filteredTenants.length}
                      onClick={() => setTenantIndex((prev) => Math.min(filteredTenants.length - visibleCount, prev + 1))}
                      className="p-1 rounded-full border border-border hover:bg-muted disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate('/admin/people/tenants')}
                className="text-xs font-black text-indigo-500 hover:text-indigo-400 flex items-center gap-1 transition-all cursor-pointer"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-44 rounded-3xl bg-slate-900/30 animate-pulse border border-white/5" />
                ))}
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed text-center text-muted-foreground space-y-1">
                <p className="text-xs font-bold">0 No active records found</p>
                <p className="text-[10px]">No tenant accounts matching active search or filter criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {visibleTenants.map((t) => (
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                  Property Managers ({filteredManagers.length})
                </h2>
                {filteredManagers.length > visibleCount && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <button
                      disabled={managerIndex === 0}
                      onClick={() => setManagerIndex((prev) => Math.max(0, prev - 1))}
                      className="p-1 rounded-full border border-border hover:bg-muted disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono font-bold px-1">
                      {managerIndex + 1}–{Math.min(filteredManagers.length, managerIndex + visibleCount)} of {filteredManagers.length}
                    </span>
                    <button
                      disabled={managerIndex + visibleCount >= filteredManagers.length}
                      onClick={() => setManagerIndex((prev) => Math.min(filteredManagers.length - visibleCount, prev + 1))}
                      className="p-1 rounded-full border border-border hover:bg-muted disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate('/admin/people/managers')}
                className="text-xs font-black text-purple-500 hover:text-purple-400 flex items-center gap-1 transition-all cursor-pointer"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-44 rounded-3xl bg-slate-900/30 animate-pulse border border-white/5" />
                ))}
              </div>
            ) : filteredManagers.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed text-center text-muted-foreground space-y-1">
                <p className="text-xs font-bold">0 No active records found</p>
                <p className="text-[10px]">No manager accounts in MongoDB matching filter criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {visibleManagers.map((m) => (
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                  Field Workforce ({filteredTechnicians.length})
                </h2>
                {filteredTechnicians.length > visibleCount && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <button
                      disabled={techIndex === 0}
                      onClick={() => setTechIndex((prev) => Math.max(0, prev - 1))}
                      className="p-1 rounded-full border border-border hover:bg-muted disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono font-bold px-1">
                      {techIndex + 1}–{Math.min(filteredTechnicians.length, techIndex + visibleCount)} of {filteredTechnicians.length}
                    </span>
                    <button
                      disabled={techIndex + visibleCount >= filteredTechnicians.length}
                      onClick={() => setTechIndex((prev) => Math.min(filteredTechnicians.length - visibleCount, prev + 1))}
                      className="p-1 rounded-full border border-border hover:bg-muted disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate('/admin/people/technicians')}
                className="text-xs font-black text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-all cursor-pointer"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-44 rounded-3xl bg-slate-900/30 animate-pulse border border-white/5" />
                ))}
              </div>
            ) : filteredTechnicians.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed text-center text-muted-foreground space-y-1">
                <p className="text-xs font-bold">0 No active records found</p>
                <p className="text-[10px]">No technician accounts in MongoDB matching filter criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {visibleTechnicians.map((tech) => (
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

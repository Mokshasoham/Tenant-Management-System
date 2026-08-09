import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTheme } from '../../../context/ThemeContext';
import useAuthStore from '../../../context/authStore';
import { cn } from '../../../utils/cn';

// Subcomponents
import PeopleHeader from './components/PeopleHeader';
import PeopleKpiStrip from './components/PeopleKpiStrip';
import PeopleSpatialMap from './components/PeopleSpatialMap';
import PeopleSpatial3D from './components/PeopleSpatial3D';
import PropertyRelationshipGraph from './components/PropertyRelationshipGraph';
import PeopleSearch from './components/PeopleSearch';
import PersonInspectionDrawer from './components/PersonInspectionDrawer';
import TenantSpatialCard from './components/TenantSpatialCard';
import ManagerSpatialCard from './components/ManagerSpatialCard';
import TechnicianSpatialCard from './components/TechnicianSpatialCard';

// Mappers
import {
  mapPeopleKPIs,
  mapSpatialPropertiesPeople,
  mapTenantsList,
  mapManagersList,
  mapTechniciansList,
  mapBuildingDigitalTwin,
} from '../../../mappers/adminPeopleMapper';

export default function AdminPeopleCommandCenter() {
  const { theme } = useTheme();
  const user = useAuthStore((state) => state.user);

  const [kpis, setKpis] = useState(null);
  const [spatialProperties, setSpatialProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [managers, setManagers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [digitalTwin, setDigitalTwin] = useState(null);

  // Projection View Toggles: '2D', '3D', 'GRAPH'
  const [projectionMode, setProjectionMode] = useState('2D');
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Person Inspection Drawer
  const [inspectedPerson, setInspectedPerson] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setKpis(mapPeopleKPIs());
    setSpatialProperties(mapSpatialPropertiesPeople());
    setTenants(mapTenantsList());
    setManagers(mapManagersList());
    setTechnicians(mapTechniciansList());
    setDigitalTwin(mapBuildingDigitalTwin());
  };

  const filteredTenants = tenants.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.propertyName.toLowerCase().includes(q);
  });

  const filteredManagers = managers.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
  });

  const filteredTechnicians = technicians.filter((tech) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return tech.name.toLowerCase().includes(q) || tech.id.toLowerCase().includes(q) || tech.specialty.toLowerCase().includes(q);
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

      {/* Spatial KPI Strip */}
      <div className="relative z-10">
        <PeopleKpiStrip
          kpis={kpis}
          selectedCategory={activeCategory}
          onSelectCategory={(cat) => setActiveCategory(cat)}
          theme={theme}
        />
      </div>

      {/* Main Spatial Switcher (2D MAP | 3D VIEW | NETWORK GRAPH) */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 p-2.5 rounded-full border shadow-xl backdrop-blur-2xl bg-white/80 dark:bg-[#0c0d15]/80 border-slate-200 dark:border-white/10">
        <PeopleSearch
          search={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
          theme={theme}
        />

        <div className="flex p-1 rounded-full border text-xs font-bold bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-white/10">
          {[
            { key: '2D', label: '2D SPATIAL MAP' },
            { key: '3D', label: '3D DIGITAL TWIN' },
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
        {projectionMode === '2D' && (
          <PeopleSpatialMap
            properties={spatialProperties}
            tenants={tenants}
            managers={managers}
            technicians={technicians}
            onInspectPerson={(p) => setInspectedPerson(p)}
            theme={theme}
          />
        )}

        {projectionMode === '3D' && (
          <PeopleSpatial3D
            digitalTwinData={digitalTwin}
            onInspectPerson={(p) => setInspectedPerson(p)}
            theme={theme}
          />
        )}

        {projectionMode === 'GRAPH' && (
          <PropertyRelationshipGraph
            onInspectPerson={(p) => setInspectedPerson(p)}
            theme={theme}
          />
        )}
      </div>

      {/* ══ SPATIAL DIRECTORIES CARDS SECTION ══ */}
      <div className="relative z-10 space-y-6 pt-4 border-t border-border/50">
        {/* Tenants Section */}
        {(!activeCategory || activeCategory === 'tenants') && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className={cn("text-base font-black tracking-tight uppercase", theme === 'light' ? "text-slate-900" : "text-white")}>
                Active Tenant Ecosystem ({filteredTenants.length})
              </h3>
              <span className="text-xs font-bold text-indigo-400">Strict Monitor Mode</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredTenants.map((t) => (
                <TenantSpatialCard
                  key={t.id}
                  tenant={t}
                  onInspect={(p) => setInspectedPerson(p)}
                  theme={theme}
                />
              ))}
            </div>
          </div>
        )}

        {/* Managers Section */}
        {(!activeCategory || activeCategory === 'managers') && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className={cn("text-base font-black tracking-tight uppercase", theme === 'light' ? "text-slate-900" : "text-white")}>
                Property Managers Network ({filteredManagers.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredManagers.map((m) => (
                <ManagerSpatialCard
                  key={m.id}
                  manager={m}
                  onInspect={(p) => setInspectedPerson(p)}
                  theme={theme}
                />
              ))}
            </div>
          </div>
        )}

        {/* Technicians Section */}
        {(!activeCategory || activeCategory === 'technicians') && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className={cn("text-base font-black tracking-tight uppercase", theme === 'light' ? "text-slate-900" : "text-white")}>
                Field Workforce & Technicians ({filteredTechnicians.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredTechnicians.map((tech) => (
                <TechnicianSpatialCard
                  key={tech.id}
                  technician={tech}
                  onInspect={(p) => setInspectedPerson(p)}
                  theme={theme}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ UNIVERSAL PERSON INSPECTION DRAWER ══ */}
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

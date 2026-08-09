import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTheme } from '../../../context/ThemeContext';
import useAuthStore from '../../../context/authStore';
import { cn } from '../../../utils/cn';

import PropertyMaintenanceHistoryModal from './components/PropertyMaintenanceHistoryModal';

// Subcomponents
import MaintenanceHeader from './components/MaintenanceHeader';
import MaintenanceStatusStrip from './components/MaintenanceStatusStrip';
import MaintenanceSpatialMap from './components/MaintenanceSpatialMap';
import MaintenanceTrendChart from './components/MaintenanceTrendChart';
import PropertyMaintenanceRanking from './components/PropertyMaintenanceRanking';
import MaintenanceRequestStream from './components/MaintenanceRequestStream';
import MaintenanceFilters from './components/MaintenanceFilters';
import MaintenanceRequestDrawer from './components/MaintenanceRequestDrawer';
import MaintenanceCostSummary from './components/MaintenanceCostSummary';
import TechnicianPerformance from './components/TechnicianPerformance';

// Mappers
import {
  mapStatusCounts,
  mapSpatialProperties,
  mapDailyTrends,
  mapMaintenanceStream,
  mapTechnicianPerformance,
  mapCostAnalytics,
} from '../../../mappers/adminMaintenanceMapper';

export default function AdminMaintenanceCommandCenter() {
  const { theme } = useTheme();
  const user = useAuthStore((state) => state.user);

  const [statusCounts, setStatusCounts] = useState(null);
  const [spatialProperties, setSpatialProperties] = useState([]);
  const [dailyTrends, setDailyTrends] = useState([]);
  const [requestStream, setRequestStream] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [costAnalytics, setCostAnalytics] = useState(null);

  // Filters & Selected States
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
  });

  // Active Request Drawer & History Modal
  const [activeRequest, setActiveRequest] = useState(null);
  const [historyModalProperty, setHistoryModalProperty] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setStatusCounts(mapStatusCounts());
    setSpatialProperties(mapSpatialProperties());
    setDailyTrends(mapDailyTrends());
    setRequestStream(mapMaintenanceStream());
    setTechnicians(mapTechnicianPerformance());
    setCostAnalytics(mapCostAnalytics());
  };

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleResetFilters = () => {
    setFilters({ status: '', category: '', priority: '' });
    setSelectedStatus(null);
    setSelectedProperty(null);
    setSearchQuery('');
  };

  const handleUpdateStatus = (reqId, newStatus) => {
    setRequestStream((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r))
    );
    if (activeRequest && activeRequest.id === reqId) {
      setActiveRequest((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const handleSelectProperty = (prop) => {
    setSelectedProperty(prop);
    setHistoryModalProperty(prop);
  };

  // Filtered Request Stream
  const filteredStream = requestStream.filter((r) => {
    if (selectedStatus && r.status !== selectedStatus) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.category && r.category !== filters.category) return false;
    if (filters.priority && r.priority !== filters.priority) return false;
    if (selectedProperty && r.propertyName !== selectedProperty.name) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.propertyName.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.submittedBy.toLowerCase().includes(q) ||
        (r.assignedTechnician?.name || '').toLowerCase().includes(q)
      );
    }
    return true;
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

      {/* Header (No Submit CTA) */}
      <div className="relative z-10">
        <MaintenanceHeader theme={theme} />
      </div>

      {/* Top Status Strip */}
      <div className="relative z-10">
        <MaintenanceStatusStrip
          counts={statusCounts}
          selectedStatus={selectedStatus}
          onSelectStatus={(st) => setSelectedStatus(st)}
          theme={theme}
        />
      </div>

      {/* ══ SPATIAL + TEMPORAL LAYOUT GRID (WHERE? & WHEN?) ══ */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WHERE? GIS Maintenance Activity Map */}
        <MaintenanceSpatialMap
          properties={spatialProperties}
          onSelectProperty={handleSelectProperty}
          theme={theme}
        />

        {/* WHEN? Daily Request Trend & Date Drill-Down Tool */}
        <MaintenanceTrendChart
          dailyTrends={dailyTrends}
          selectedProperty={selectedProperty}
          onSelectDate={(dt) => setSelectedDate(dt)}
          theme={theme}
        />
      </div>

      {/* ══ ANALYTICS & RANKINGS ROW ══ */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        <PropertyMaintenanceRanking
          properties={spatialProperties}
          onSelectProperty={handleSelectProperty}
          theme={theme}
        />
        <MaintenanceCostSummary costData={costAnalytics} theme={theme} />
        <TechnicianPerformance technicians={technicians} theme={theme} />
      </div>

      {/* ══ WHAT? MAINTENANCE REQUEST STREAM & FILTERS ══ */}
      <div className="relative z-10 space-y-4">
        <MaintenanceFilters
          search={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          theme={theme}
        />

        <MaintenanceRequestStream
          requests={filteredStream}
          onOpenRequest={(req) => setActiveRequest(req)}
          theme={theme}
        />
      </div>

      {/* ══ PROPERTY HISTORY WORKSPACE MODAL ══ */}
      <AnimatePresence>
        {historyModalProperty && (
          <PropertyMaintenanceHistoryModal
            property={historyModalProperty}
            onClose={() => setHistoryModalProperty(null)}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* ══ REQUEST INVESTIGATION WORKSPACE SIDE DRAWER ══ */}
      <AnimatePresence>
        {activeRequest && (
          <MaintenanceRequestDrawer
            request={activeRequest}
            onClose={() => setActiveRequest(null)}
            onUpdateStatus={handleUpdateStatus}
            theme={theme}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

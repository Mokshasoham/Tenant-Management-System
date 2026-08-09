import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { maintenanceService, propertyService, userService } from '../../../services/api';
import { cn } from '../../../utils/cn';

import ManagerMaintenanceHeader from './components/ManagerMaintenanceHeader';
import ManagerMaintenanceKpis from './components/ManagerMaintenanceKpis';
import ManagerPropertyNetwork from './components/ManagerPropertyNetwork';
import ManagerMaintenanceQueue from './components/ManagerMaintenanceQueue';
import ManagerTechnicianWorkload from './components/ManagerTechnicianWorkload';
import ManagerMaintenanceMap from './components/ManagerMaintenanceMap';
import ManagerOperationsCalendar from './components/ManagerOperationsCalendar';
import ManagerAssignTechnicianModal from './components/ManagerAssignTechnicianModal';
import ManagerMaintenanceDrawer from './components/ManagerMaintenanceDrawer';

export default function ManagerMaintenanceCommandCenter() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [properties, setProperties] = useState([]);
  const [requests, setRequests] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  // Modals & Drawers state
  const [assignTargetReq, setAssignTargetReq] = useState(null);
  const [drawerTargetReq, setDrawerTargetReq] = useState(null);

  const fetchManagerData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [propsRes, reqsRes, techRes] = await Promise.allSettled([
        propertyService.getAllProperties({ limit: 100 }),
        maintenanceService.getAllRequests({ limit: 200 }),
        userService.getPeople({ role: 'technician', limit: 100 }),
      ]);

      const extractList = (res) => {
        if (res.status !== 'fulfilled' || !res.value) return [];
        const v = res.value;
        if (Array.isArray(v)) return v;
        if (Array.isArray(v.data)) return v.data;
        if (Array.isArray(v.properties)) return v.properties;
        if (Array.isArray(v.requests)) return v.requests;
        if (Array.isArray(v.users)) return v.users;
        return [];
      };

      setProperties(extractList(propsRes));
      setRequests(extractList(reqsRes));
      setTechnicians(extractList(techRes));
    } catch (err) {
      console.error('Error fetching manager maintenance data:', err);
      setError('Unable to load manager operations data. Please check connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagerData();
  }, [fetchManagerData]);

  return (
    <div className={cn(
      "min-h-screen p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans transition-colors duration-300",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050508] text-slate-100"
    )}>
      {/* Header */}
      <ManagerMaintenanceHeader theme={theme} />

      {/* Error Retry Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-400 text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchManagerData}
            className="px-3 py-1 rounded-xl bg-purple-600 text-white hover:bg-purple-500 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Manager KPI Strip */}
      <ManagerMaintenanceKpis requests={requests} technicians={technicians} theme={theme} />

      {/* Property Network Grid */}
      <ManagerPropertyNetwork properties={properties} requests={requests} theme={theme} />

      {/* 2D Spatial Map & Operations Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ManagerMaintenanceMap
          properties={properties}
          requests={requests}
          technicians={technicians}
          onOpenAssignModal={(r) => setAssignTargetReq(r)}
          onOpenDetailsDrawer={(r) => setDrawerTargetReq(r)}
          theme={theme}
        />

        <ManagerOperationsCalendar
          requests={requests}
          onOpenDetailsDrawer={(r) => setDrawerTargetReq(r)}
          theme={theme}
        />
      </div>

      {/* Operational Maintenance Queue */}
      <ManagerMaintenanceQueue
        requests={requests}
        onOpenAssignModal={(r) => setAssignTargetReq(r)}
        onOpenDetailsDrawer={(r) => setDrawerTargetReq(r)}
        theme={theme}
      />

      {/* Field Workforce & Workload */}
      <ManagerTechnicianWorkload technicians={technicians} requests={requests} theme={theme} />

      {/* Assign Technician Modal */}
      <AnimatePresence>
        {assignTargetReq && (
          <ManagerAssignTechnicianModal
            request={assignTargetReq}
            technicians={technicians}
            onClose={() => setAssignTargetReq(null)}
            onSave={() => {
              setAssignTargetReq(null);
              fetchManagerData();
            }}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Request Details Drawer */}
      <AnimatePresence>
        {drawerTargetReq && (
          <ManagerMaintenanceDrawer
            request={drawerTargetReq}
            onOpenAssignModal={(r) => {
              setDrawerTargetReq(null);
              setAssignTargetReq(r);
            }}
            onClose={() => setDrawerTargetReq(null)}
            onRefresh={fetchManagerData}
            theme={theme}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

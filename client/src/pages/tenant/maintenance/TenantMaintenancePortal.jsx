import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { maintenanceService } from '../../../services/api';
import { cn } from '../../../utils/cn';

import TenantMaintenanceHeader from './TenantMaintenanceHeader';
import TenantMaintenanceSummary from './TenantMaintenanceSummary';
import TenantMaintenanceCalendar from './TenantMaintenanceCalendar';
import TenantUpcomingMaintenance from './TenantUpcomingMaintenance';
import TenantMaintenanceRequests from './TenantMaintenanceRequests';
import TenantMaintenanceHistory from './TenantMaintenanceHistory';
import TenantMaintenanceRequestForm from './TenantMaintenanceRequestForm';
import TenantMaintenanceDetails from './TenantMaintenanceDetails';

export default function TenantMaintenancePortal() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requests, setRequests] = useState([]);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const fetchTenantData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch authenticated tenant requests (data isolation enforced by controller)
      const res = await maintenanceService.getAllRequests({ limit: 100 });
      const list = res.data?.data || res.data || (Array.isArray(res) ? res : []);
      setRequests(list);
    } catch (err) {
      console.error('Error fetching tenant maintenance requests:', err);
      setError('Unable to load your maintenance records. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenantData();
  }, [fetchTenantData]);

  return (
    <div className={cn(
      "min-h-screen p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans transition-colors duration-300",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050508] text-slate-100"
    )}>
      {/* Header with Submit Request button */}
      <TenantMaintenanceHeader
        onSubmitClick={() => setShowSubmitModal(true)}
        theme={theme}
      />

      {/* API Error Retry Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-400 text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchTenantData}
            className="px-3 py-1 rounded-xl bg-rose-600 text-white hover:bg-rose-500 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <TenantMaintenanceSummary requests={requests} theme={theme} />

      {/* Calendar & Upcoming Visits Side-by-Side Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TenantMaintenanceCalendar
            requests={requests}
            onSelectTicket={(t) => setSelectedTicket(t)}
            theme={theme}
          />
        </div>
        <div className="lg:col-span-1">
          <TenantUpcomingMaintenance
            requests={requests}
            onSelectTicket={(t) => setSelectedTicket(t)}
            theme={theme}
          />
        </div>
      </div>

      {/* Active Requests List */}
      <TenantMaintenanceRequests
        requests={requests}
        onSelectTicket={(t) => setSelectedTicket(t)}
        theme={theme}
      />

      {/* Maintenance History */}
      <TenantMaintenanceHistory
        requests={requests}
        onSelectTicket={(t) => setSelectedTicket(t)}
        theme={theme}
      />

      {/* Submit Request Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <TenantMaintenanceRequestForm
            onClose={() => setShowSubmitModal(false)}
            onSave={() => {
              setShowSubmitModal(false);
              fetchTenantData();
            }}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Request Details Drawer */}
      <AnimatePresence>
        {selectedTicket && (
          <TenantMaintenanceDetails
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
            theme={theme}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

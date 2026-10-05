import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService, tenantService, propertyService, leaseService, paymentService, billService, analyticsService } from '../services/api';
import useAuthStore from '../context/authStore';
import AdminDashboard from './dashboards/AdminDashboard';
import ManagerDashboard from './dashboards/ManagerDashboard';
import TenantDashboard from './dashboards/TenantDashboard';
import TechnicianDashboard from './dashboards/TechnicianDashboard';

import { getSocket } from '../services/socket';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.userId || user?._id || user?.id;
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTenants: 0,
    totalProperties: 0,
    totalLeases: 0,
    totalPayments: 0,
    availableProperties: 0,
    occupiedProperties: 0,
    maintenanceProperties: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    bookingRequests: 0,
    openMaintenance: 0,
    occupancyRate: 0,
    pendingRenewalRequests: 0,
    pendingMoveOutRequests: 0,
    leasesExpiringWithin7Days: 0,
    expiredLeases: 0,
    outstandingPaymentsOnExpiredLeasesCount: 0,
    outstandingPaymentsOnExpiredLeasesAmount: 0,
    previews: {
      renewalRequests: [],
      moveOutRequests: [],
      expiringSoon: [],
      expiredLeases: [],
      expiredDues: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async (isSilent = false) => {
    if (!user) return;
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const data = {};

      if (user?.role === 'admin') {
        try {
          const userStats = await userService.getDashboardStats();
          data.totalUsers = userStats.data?.totalUsers || userStats.data?.data?.totalUsers || 0;
        } catch (e) {
          console.error('Failed to fetch user admin stats:', e);
        }
      }

      if (user?.role === 'manager') {
        // Unified, single source of truth for manager dashboard portfolio metrics
        try {
          const summaryRes = await analyticsService.getSummary();
          const summary = summaryRes?.data?.data || summaryRes?.data || summaryRes || {};

          data.totalProperties = summary.totalProperties ?? summary.managedProperties ?? 0;
          data.availableProperties = summary.availableProperties ?? 0;
          data.occupiedProperties = summary.occupiedProperties ?? 0;
          data.maintenanceProperties = summary.maintenanceProperties ?? 0;
          data.totalTenants = summary.activeTenants ?? summary.totalTenants ?? 0;
          data.totalLeases = summary.totalLeases ?? summary.activeLeases ?? 0;
          data.totalPayments = summary.totalPayments ?? 0;
          data.totalRevenue = summary.monthlyCollections ?? summary.totalRevenue ?? 0;
          data.pendingPayments = summary.pendingPaymentsAmount ?? summary.pendingPayments ?? 0;
          data.bookingRequests = summary.bookingRequests ?? 0;
          data.openMaintenance = summary.openMaintenance ?? 0;
          data.occupancyRate = summary.occupancyRate ?? 0;

          // Contract Validation: Distinguish genuine backend 0s from missing fields in outdated API responses
          const hasActionCenterFields = (
            summary.pendingRenewalRequests !== undefined &&
            summary.pendingMoveOutRequests !== undefined &&
            summary.leasesExpiringWithin7Days !== undefined &&
            summary.expiredLeases !== undefined
          );

          if (!hasActionCenterFields) {
            console.warn('[DashboardPage] API contract mismatch: Backend summary response is missing Action Center fields (pendingMoveOutRequests, leasesExpiringWithin7Days, expiredLeases). Outdated backend deployment detected.');
            data.actionCenterAvailable = false;
            data.actionCenterContractMismatch = true;
            data.pendingRenewalRequests = null;
            data.pendingMoveOutRequests = null;
            data.leasesExpiringWithin7Days = null;
            data.expiredLeases = null;
            data.outstandingPaymentsOnExpiredLeasesCount = null;
            data.outstandingPaymentsOnExpiredLeasesAmount = null;
            data.previews = {
              renewalRequests: [],
              moveOutRequests: [],
              expiringSoon: [],
              expiredLeases: [],
              expiredDues: []
            };
          } else {
            data.actionCenterAvailable = true;
            data.actionCenterContractMismatch = false;
            data.pendingRenewalRequests = summary.pendingRenewalRequests;
            data.pendingMoveOutRequests = summary.pendingMoveOutRequests;
            data.leasesExpiringWithin7Days = summary.leasesExpiringWithin7Days;
            data.expiredLeases = summary.expiredLeases;
            data.outstandingPaymentsOnExpiredLeasesCount = summary.outstandingPaymentsOnExpiredLeasesCount ?? 0;
            data.outstandingPaymentsOnExpiredLeasesAmount = summary.outstandingPaymentsOnExpiredLeasesAmount ?? 0;
            data.previews = summary.previews || {
              renewalRequests: [],
              moveOutRequests: [],
              expiringSoon: [],
              expiredLeases: [],
              expiredDues: []
            };
          }
        } catch (sumErr) {
          console.error('Failed to fetch manager summary stats:', sumErr);
          setError('Failed to fetch manager operational summary.');
          // Fallback to propertyStats if summary endpoint fails
          try {
            const propRes = await propertyService.getPropertyStats();
            const propData = propRes.data?.data || propRes.data || {};
            data.totalProperties = propData.totalProperties || 0;
            data.availableProperties = propData.availableProperties || 0;
            data.occupiedProperties = propData.occupiedProperties || 0;
            data.maintenanceProperties = propData.maintenanceProperties || 0;
          } catch (pErr) {
            console.error('Failed to fetch property stats fallback:', pErr);
          }
        }
      } else if (user?.role === 'admin') {
        const [tenantStats, propertyStats, leaseStats, paymentStats, billAnalyticsRes, summaryRes] = await Promise.allSettled([
          tenantService.getTenantStats(),
          propertyService.getPropertyStats(),
          leaseService.getLeaseStats(),
          paymentService.getPaymentStats(),
          billService.getBillAnalytics(),
          analyticsService.getSummary()
        ]);

        const propData = propertyStats.status === 'fulfilled' ? (propertyStats.value.data?.data || propertyStats.value.data || {}) : {};
        const billData = billAnalyticsRes.status === 'fulfilled' ? (billAnalyticsRes.value.data?.data || billAnalyticsRes.value.data || {}) : {};
        const tenData = tenantStats.status === 'fulfilled' ? (tenantStats.value.data?.totalTenants || tenantStats.value.data?.data?.totalTenants || 0) : 0;
        const leaseData = leaseStats.status === 'fulfilled' ? (leaseStats.value.data?.totalLeases || leaseStats.value.data?.data?.totalLeases || 0) : 0;
        const payData = paymentStats.status === 'fulfilled' ? (paymentStats.value.data?.totalPayments || paymentStats.value.data?.data?.totalPayments || 0) : 0;
        const sumData = summaryRes.status === 'fulfilled' ? (summaryRes.value.data?.data || summaryRes.value.data || summaryRes.value || {}) : {};

        data.totalTenants = tenData;
        data.totalProperties = propData.totalProperties || 0;
        data.availableProperties = propData.availableProperties || 0;
        data.occupiedProperties = propData.occupiedProperties || 0;
        data.maintenanceProperties = propData.maintenanceProperties || 0;
        data.totalLeases = leaseData;
        data.totalPayments = payData;
        data.totalRevenue = billData.totalCollected || 0;
        data.pendingPayments = billData.outstandingAmount || 0;
        data.pendingRenewalRequests = sumData.pendingRenewalRequests ?? 0;
        data.pendingMoveOutRequests = sumData.pendingMoveOutRequests ?? 0;
        data.leasesExpiringWithin7Days = sumData.leasesExpiringWithin7Days ?? 0;
        data.expiredLeases = sumData.expiredLeases ?? 0;
        data.outstandingPaymentsOnExpiredLeasesCount = sumData.outstandingPaymentsOnExpiredLeasesCount ?? 0;
        data.outstandingPaymentsOnExpiredLeasesAmount = sumData.outstandingPaymentsOnExpiredLeasesAmount ?? 0;
        data.previews = sumData.previews || {
          renewalRequests: [],
          moveOutRequests: [],
          expiringSoon: [],
          expiredLeases: [],
          expiredDues: []
        };
      }

      setStats(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // 1. Re-fetch when tab becomes visible again or window regains focus
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchStats(true);
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // 2. Real-time WebSocket synchronization
    const socket = getSocket();
    if (socket) {
      const handleLifecycleUpdate = (payload) => {
        console.log('[DashboardPage] Real-time lifecycle event received:', payload);
        fetchStats(true);
      };

      socket.on('new_event', handleLifecycleUpdate);
      socket.on('lease_lifecycle_update', handleLifecycleUpdate);
      socket.on('payment_completed', handleLifecycleUpdate);
      socket.on('lease_renewal_requested', handleLifecycleUpdate);
      socket.on('lease_moveout_requested', handleLifecycleUpdate);
      socket.on('lease_renewed', handleLifecycleUpdate);
      socket.on('connect', () => fetchStats(true));

      return () => {
        window.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleVisibilityChange);
        socket.off('new_event', handleLifecycleUpdate);
        socket.off('lease_lifecycle_update', handleLifecycleUpdate);
        socket.off('payment_completed', handleLifecycleUpdate);
        socket.off('lease_renewal_requested', handleLifecycleUpdate);
        socket.off('lease_moveout_requested', handleLifecycleUpdate);
        socket.off('lease_renewed', handleLifecycleUpdate);
      };
    }

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [currentUserId, user?.role]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
      </div>
    );
  }

  switch (user?.role) {
    case 'admin':
      return <AdminDashboard stats={stats} loading={loading} navigate={navigate} onRefresh={() => fetchStats()} error={error} />;
    case 'manager':
      return <ManagerDashboard stats={stats} loading={loading} navigate={navigate} onRefresh={() => fetchStats()} error={error} />;
    case 'technician':
      return <TechnicianDashboard />;
    case 'tenant':
    case 'user':  // legacy role name — treat same as tenant
      return <TenantDashboard user={user} navigate={navigate} />;
    default:
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-xl font-bold text-muted-foreground">Unknown role: {user?.role}</p>
        </div>
      );
  }
}

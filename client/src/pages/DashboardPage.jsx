import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService, tenantService, propertyService, leaseService, paymentService, billService, analyticsService } from '../services/api';
import useAuthStore from '../context/authStore';
import AdminDashboard from './dashboards/AdminDashboard';
import ManagerDashboard from './dashboards/ManagerDashboard';
import TenantDashboard from './dashboards/TenantDashboard';
import TechnicianDashboard from './dashboards/TechnicianDashboard';

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
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        setLoading(true);
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
            const summary = summaryRes?.data?.data || summaryRes?.data || {};

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
          } catch (sumErr) {
            console.error('Failed to fetch manager summary stats:', sumErr);
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
          const [tenantStats, propertyStats, leaseStats, paymentStats, billAnalyticsRes] = await Promise.allSettled([
            tenantService.getTenantStats(),
            propertyService.getPropertyStats(),
            leaseService.getLeaseStats(),
            paymentService.getPaymentStats(),
            billService.getBillAnalytics()
          ]);

          const propData = propertyStats.status === 'fulfilled' ? (propertyStats.value.data?.data || propertyStats.value.data || {}) : {};
          const billData = billAnalyticsRes.status === 'fulfilled' ? (billAnalyticsRes.value.data?.data || billAnalyticsRes.value.data || {}) : {};
          const tenData = tenantStats.status === 'fulfilled' ? (tenantStats.value.data?.totalTenants || tenantStats.value.data?.data?.totalTenants || 0) : 0;
          const leaseData = leaseStats.status === 'fulfilled' ? (leaseStats.value.data?.totalLeases || leaseStats.value.data?.data?.totalLeases || 0) : 0;
          const payData = paymentStats.status === 'fulfilled' ? (paymentStats.value.data?.totalPayments || paymentStats.value.data?.data?.totalPayments || 0) : 0;

          data.totalTenants = tenData;
          data.totalProperties = propData.totalProperties || 0;
          data.availableProperties = propData.availableProperties || 0;
          data.occupiedProperties = propData.occupiedProperties || 0;
          data.maintenanceProperties = propData.maintenanceProperties || 0;
          data.totalLeases = leaseData;
          data.totalPayments = payData;
          data.totalRevenue = billData.totalCollected || 0;
          data.pendingPayments = billData.outstandingAmount || 0;
        }

        setStats(prev => ({ ...prev, ...data }));
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
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
      return <AdminDashboard stats={stats} loading={loading} navigate={navigate} />;
    case 'manager':
      return <ManagerDashboard stats={stats} loading={loading} navigate={navigate} />;
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

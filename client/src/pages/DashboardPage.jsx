import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService, tenantService, propertyService, leaseService, paymentService, billService } from '../services/api';
import useAuthStore from '../context/authStore';
import AdminDashboard from './dashboards/AdminDashboard';
import ManagerDashboard from './dashboards/ManagerDashboard';
import TenantDashboard from './dashboards/TenantDashboard';
import TechnicianDashboard from './dashboards/TechnicianDashboard';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTenants: 0,
    totalProperties: 0,
    totalLeases: 0,
    totalPayments: 0,
    availableProperties: 0,
    occupiedProperties: 0,
    maintenanceProperties: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = {};

        if (user?.role === 'admin') {
          const userStats = await userService.getDashboardStats();
          data.totalUsers = userStats.data?.totalUsers || userStats.data?.data?.totalUsers || 0;
        }

        if (['admin', 'manager'].includes(user?.role)) {
          const [tenantStats, propertyStats, leaseStats, paymentStats, billAnalyticsRes] = await Promise.all([
            tenantService.getTenantStats(),
            propertyService.getPropertyStats(),
            leaseService.getLeaseStats(),
            paymentService.getPaymentStats(),
            billService.getBillAnalytics()
          ]);

          const propData = propertyStats.data?.data || propertyStats.data || {};
          const billData = billAnalyticsRes.data?.data || billAnalyticsRes.data || {};

          data.totalTenants = tenantStats.data?.totalTenants || tenantStats.data?.data?.totalTenants || 0;
          data.totalProperties = propData.totalProperties || 0;
          data.availableProperties = propData.availableProperties || 0;
          data.occupiedProperties = propData.occupiedProperties || 0;
          data.maintenanceProperties = propData.maintenanceProperties || 0;
          data.totalLeases = leaseStats.data?.totalLeases || leaseStats.data?.data?.totalLeases || 0;
          data.totalPayments = paymentStats.data?.totalPayments || paymentStats.data?.data?.totalPayments || 0;
          data.totalRevenue = billData.totalCollected || 0;
          data.pendingPayments = billData.outstandingAmount || 0;
        }

        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.role]);

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



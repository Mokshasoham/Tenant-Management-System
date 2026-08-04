import React from 'react';
import LeaseRenewalDashboard from '../modules/lease-renewal/dashboard/LeaseRenewalDashboard';

/**
 * Tenant Lease Renewal Dashboard Wrapper Page.
 */
export default function LeaseRenewalPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/20 py-6">
      <LeaseRenewalDashboard />
    </div>
  );
}

import React from 'react';
import LeaseRenewalDashboard from '../modules/lease-renewal/dashboard/LeaseRenewalDashboard';

/**
 * Enterprise Tenant Lease Renewal Workspace Page.
 * Route: /lease-renewal
 */
export default function LeaseRenewalPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FC] dark:bg-[#0B0F17] py-6 transition-colors duration-200">
      <LeaseRenewalDashboard />
    </div>
  );
}

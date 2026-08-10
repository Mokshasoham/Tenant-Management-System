import React from 'react';
import useAuthStore from '../context/authStore';
import PropertyDirectory from '../components/property/PropertyDirectory';
import TenantBrowseProperties from '../components/property/TenantBrowseProperties';
import { AlertCircle } from 'lucide-react';

/**
 * Role-aware Property Browsing Router Component
 * 
 * Portal-specific behaviors:
 * - Admin: Admin/Manager Property Directory (portfolio inspection & verification tracking)
 * - Manager: Admin/Manager Property Directory (portfolio inspection & verification tracking)
 * - Tenant / User: Restored Tenant Browse Properties experience (tenant property cards, search, save, compare, booking)
 * - Technician: Restricted workspace notice
 */
export default function BrowsePropertiesPage() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role?.toLowerCase();

  switch (role) {
    case 'admin':
    case 'manager':
      return <PropertyDirectory />;

    case 'tenant':
    case 'user':
      return <TenantBrowseProperties />;

    case 'technician':
      return (
        <div className="max-w-md mx-auto my-20 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Property Directory Restricted</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Property directory browsing is configured for Tenant search and Admin/Manager portfolio operations. Please use the Technician Workspace to manage assigned repair jobs.
          </p>
        </div>
      );

    default:
      // Default for guests or unauthenticated users -> Tenant Browse Properties
      return <TenantBrowseProperties />;
  }
}

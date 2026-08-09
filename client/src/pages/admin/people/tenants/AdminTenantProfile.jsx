import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, ShieldCheck, RefreshCw } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { cn } from '../../../../utils/cn';
import { userService } from '../../../../services/api';

export default function AdminTenantProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchTenant();
  }, [id]);

  const fetchTenant = async () => {
    setLoading(true);
    try {
      // Stripping potential T- prefix for raw MongoDB ObjectId search
      const rawId = id?.replace(/^T-/, '');
      const res = await userService.getUserById(rawId || id);
      const data = res?.data || res;
      setTenant(data);
    } catch (err) {
      console.error('Error fetching tenant details:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'property', label: 'Property' },
    { key: 'lease', label: 'Lease History' },
    { key: 'payments', label: 'Payments' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'verification', label: 'Verification' },
    { key: 'documents', label: 'Documents' },
    { key: 'activity', label: 'Activity' },
    { key: 'audit', label: 'Audit Trail' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center text-muted-foreground">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
        <span>Loading tenant profile...</span>
      </div>
    );
  }

  const name = tenant ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() : 'Tenant';

  return (
    <div className={cn(
      "min-h-screen p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans transition-colors",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050508] text-slate-100"
    )}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/people/tenants')}
        className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Tenants Directory
      </button>

      {/* Header Profile Workspace (NO EDIT/DELETE BUTTONS) */}
      <div className={cn(
        "p-6 rounded-[2.25rem] border shadow-2xl space-y-4 backdrop-blur-2xl transition-all",
        theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-xl shadow-lg">
              {tenant?.firstName?.charAt(0) || 'T'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{name}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ● {tenant?.isActive !== false ? 'Active' : 'Inactive'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                Tenant ID: {tenant?._id} · {tenant?.email} · {tenant?.phone || 'No phone'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-muted-foreground font-bold block">Assigned Residence</span>
            <p className="font-extrabold text-indigo-400 text-sm flex items-center justify-end gap-1">
              <Building className="w-4 h-4" /> {tenant?.property?.name || 'Not Assigned'}
            </p>
            <p className="text-[11px] text-muted-foreground">📍 {tenant?.city || 'Location N/A'}</p>
          </div>
        </div>
      </div>

      {/* 9 Inspection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-border/50">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap",
              activeTab === tab.key
                ? "bg-indigo-600 text-white shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Display */}
      <div className={cn(
        "p-6 rounded-[2.25rem] border shadow-2xl backdrop-blur-2xl min-h-[300px]",
        theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
      )}>
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
            Tenant Inspection Details ({activeTab.toUpperCase()})
          </h3>
          <div className="text-xs text-muted-foreground font-medium">
            Viewing real MongoDB records for <strong className="text-foreground">{name}</strong> ({tenant?.email}).
          </div>
        </div>
      </div>
    </div>
  );
}

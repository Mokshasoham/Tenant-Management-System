import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, ShieldCheck, Calendar, DollarSign, Wrench, FileText, History, Activity, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { cn } from '../../../../utils/cn';
import { MOCK_TENANTS } from '../../../../mocks/adminPeopleMock';

export default function AdminTenantProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const tenant = MOCK_TENANTS.find((t) => t.id === id) || MOCK_TENANTS[0];
  const [activeTab, setActiveTab] = useState('overview');

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
              {tenant.avatar || 'TS'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{tenant.name}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ● Active
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                Tenant ID: {tenant.id} · {tenant.email} · {tenant.phone}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-muted-foreground font-bold block">Assigned Residence</span>
            <p className="font-extrabold text-indigo-400 text-sm flex items-center justify-end gap-1">
              <Building className="w-4 h-4" /> {tenant.propertyName}
            </p>
            <p className="text-[11px] text-muted-foreground">📍 {tenant.city} · {tenant.unit}</p>
          </div>
        </div>

        {/* Top Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-3 border-t border-border/40">
          <div className={cn("p-3 rounded-2xl border space-y-0.5", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/5")}>
            <span className="text-[9px] text-muted-foreground font-bold block">Trust Score</span>
            <p className="font-mono font-black text-indigo-400 text-base">{tenant.trustScore}/100</p>
          </div>
          <div className={cn("p-3 rounded-2xl border space-y-0.5", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/5")}>
            <span className="text-[9px] text-muted-foreground font-bold block">Lease Standing</span>
            <p className="font-mono font-black text-emerald-400 text-base">{tenant.leaseMonthsRemaining} mos left</p>
          </div>
          <div className={cn("p-3 rounded-2xl border space-y-0.5", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/5")}>
            <span className="text-[9px] text-muted-foreground font-bold block">On-Time Payments</span>
            <p className="font-mono font-black text-emerald-400 text-base">{tenant.paymentHistoryPercent}%</p>
          </div>
          <div className={cn("p-3 rounded-2xl border space-y-0.5", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/5")}>
            <span className="text-[9px] text-muted-foreground font-bold block">Open Maintenance</span>
            <p className="font-mono font-black text-rose-500 text-base">{tenant.openMaintenanceCount}</p>
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
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Tenant Overview Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground font-bold">Monthly Rent Amount:</span>
                <p className="font-mono font-black text-emerald-400 text-base">₹{tenant.monthlyRent?.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground font-bold">Assigned Property Manager:</span>
                <p className="font-bold text-indigo-400">{tenant.managerName}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'overview' && (
          <div className="text-xs text-muted-foreground font-medium py-8 text-center">
            Viewing detailed <strong className="text-foreground uppercase">{activeTab}</strong> inspection log for {tenant.name}.
          </div>
        )}
      </div>
    </div>
  );
}

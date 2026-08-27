import React from 'react';
import { Home, Calendar, DollarSign, Shield, Clock } from 'lucide-react';

const formatCurrency = (val) => {
  if (val === undefined || val === null) return '₹0';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export function CurrentLeaseCard({ lease, property }) {
  if (!lease) return null;

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Home className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">CURRENT LEASE</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {property?.name || 'Property'} • Unit {property?.unitNumber || 'N/A'}
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          ID: {lease.leaseNumber || (lease.id ? String(lease.id).substring(0, 8) : 'ACTIVE')}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Monthly Rent
          </span>
          <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            {formatCurrency(lease.rentAmount)}
          </p>
          <span className="text-[10px] text-slate-500">per month</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Security Deposit
          </span>
          <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            {formatCurrency(lease.securityDeposit)}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Refundable</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Start Date
          </span>
          <p className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
            {formatDate(lease.startDate)}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            End Date
          </span>
          <p className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
            {formatDate(lease.endDate)}
          </p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            {lease.daysRemaining} days remaining
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          Lease duration parameters: <strong className="text-slate-700 dark:text-slate-300">{lease.duration || '12 months'}</strong>
        </span>
      </div>
    </div>
  );
}

export default CurrentLeaseCard;

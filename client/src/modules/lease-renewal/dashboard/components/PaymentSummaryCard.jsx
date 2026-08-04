import React from 'react';
import { CreditCard, DollarSign } from 'lucide-react';
import { formatCurrency } from '../utils/dashboardHelpers';

export const PaymentSummaryCard = ({ payments, rentAmount }) => {
  const hasOverdue = payments?.overdueCount > 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <CreditCard size={20} className="text-primary" />
          <span>Payment Overview</span>
        </h4>
        {hasOverdue && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455 border border-rose-100 dark:border-rose-900/30">
            Overdue Invoices
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Outstanding Balance */}
        <div className="col-span-2 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <DollarSign size={20} />
            </div>
            <div>
              <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium">Outstanding Balance</span>
              <span className="text-lg font-bold text-slate-805 dark:text-slate-150">
                {formatCurrency(payments?.outstandingBalance || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Rent Base */}
        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl space-y-1">
          <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium">Base Rent</span>
          <span className="block text-base font-bold text-slate-805 dark:text-slate-150">
            {formatCurrency(rentAmount)}
          </span>
        </div>

        {/* Unpaid Count */}
        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl space-y-1">
          <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium">Unpaid Bills</span>
          <span className="block text-base font-bold text-slate-855 dark:text-slate-150">
            {payments?.unpaidCount || 0}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummaryCard;

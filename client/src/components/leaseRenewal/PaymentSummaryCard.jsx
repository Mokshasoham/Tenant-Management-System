import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

const formatCurrency = (val) => {
  if (val === undefined || val === null) return '₹0';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

export function PaymentSummaryCard({ payments, rentAmount }) {
  const navigate = useNavigate();

  const outstanding = payments?.outstandingBalance ?? 0;
  const overdueCount = payments?.overdueCount ?? 0;

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">PAYMENT OVERVIEW</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Account billing standing</p>
            </div>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              outstanding === 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            {outstanding === 0 ? 'CLEAR BALANCE' : 'BALANCE DUE'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Outstanding Balance
            </span>
            <p
              className={`text-base font-extrabold ${
                outstanding === 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(outstanding)}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Base Monthly Rent
            </span>
            <p className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              {formatCurrency(rentAmount)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
          <span>Unpaid / Pending Invoices:</span>
          <strong className="text-slate-900 dark:text-slate-100">{payments?.unpaidCount ?? 0}</strong>
        </div>
      </div>

      <button
        onClick={() => navigate('/payments')}
        className="w-full py-2.5 px-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <span>View Payment Details</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default PaymentSummaryCard;

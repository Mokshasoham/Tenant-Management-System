import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { paymentService } from '../services/api';
import useAuthStore from '../context/authStore';
import {
  Receipt, Download, Search, Filter, Calendar, 
  IndianRupee, CheckCircle2, AlertCircle, FileText, 
  ExternalLink, ArrowDownToLine, Wallet, Clock
} from 'lucide-react';
import { cn } from '../utils/cn';

const STATUS_CONFIG = {
  paid: { label: 'Settled', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  pending: { label: 'Due', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: AlertCircle },
  overdue: { label: 'Overdue', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: AlertCircle },
  partially_paid: { label: 'Partial', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Clock },
};

export default function BillsPage() {
  const user = useAuthStore((state) => state.user);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, settled, pending

  const fetchPayments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await paymentService.getMyPayments();
      setPayments(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filteredBills = payments.filter(p => {
    const matchSearch = p.property?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      p.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = filter === 'all' || 
                       (filter === 'settled' && p.status === 'paid') ||
                       (filter === 'pending' && p.status !== 'paid');
    return matchSearch && matchFilter;
  });

  const handleDownload = (invoiceUrl) => {
    if (!invoiceUrl) return;
    window.open(invoiceUrl, '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 rounded-full bg-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
              Billing & Invoices
            </p>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            My Bills 🧾
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access and download your payment receipts and official invoices.
          </p>
        </div>
      </motion.div>

      {/* Interactive Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by property or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all shadow-sm"
          />
        </div>
        <div className="flex bg-muted p-1 rounded-xl border border-border">
          {['all', 'settled', 'pending'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize",
                filter === f ? "bg-card text-emerald-600 shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Bills Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-card border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredBills.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 bg-card border border-dashed border-border rounded-3xl text-center"
        >
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Receipt className="w-10 h-10 text-muted-foreground/20" />
          </div>
          <h3 className="text-lg font-black text-foreground">No invoices found</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
            Your billing history is currently empty. Invoices will appear here once payments are processed.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBills.map((bill, index) => {
            const status = STATUS_CONFIG[bill.status] || STATUS_CONFIG.pending;
            const StatusIcon = status.icon;
            const isSettled = bill.status === 'paid';

            return (
              <motion.div
                key={bill._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "group relative bg-card border rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
                  isSettled ? "border-emerald-500/10" : "border-border"
                )}
              >
                {/* Status Badge */}
                <div className={cn(
                  "absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black tracking-widest uppercase",
                  status.bg, status.color
                )}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </div>

                <div className="flex items-start gap-4 mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                    isSettled ? "from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20" : "from-muted to-muted-foreground/10"
                  )}>
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-foreground truncate uppercase tracking-tight">
                      {bill.type.replace('_', ' ')}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {bill.property?.name || 'TMS Management'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest">Amount Paid</span>
                    <span className="text-lg font-black text-foreground">₹{bill.amountPaid?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground/60 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(bill.paymentDate || bill.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-muted-foreground/60 flex items-center gap-1.5 capitalize">
                      <Wallet className="w-3 h-3" />
                      {bill.paymentMethod || 'Online'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {bill.invoiceUrl ? (
                    <button
                      onClick={() => handleDownload(bill.invoiceUrl)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                      Download Invoice
                    </button>
                  ) : isSettled ? (
                    <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500/10 text-orange-600 text-[10px] font-bold border border-orange-500/20">
                      Processing Invoice...
                    </div>
                  ) : (
                    <button
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs font-black cursor-not-allowed"
                      disabled
                    >
                      Invoice Pending
                    </button>
                  )}
                  {isSettled && bill.invoiceUrl && (
                    <button
                      onClick={() => window.open(bill.invoiceUrl, '_blank')}
                      className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/5 transition-all"
                      title="View Online"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

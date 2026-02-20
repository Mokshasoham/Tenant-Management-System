import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { paymentService } from '../services/api';
import useAuthStore from '../context/authStore';
import {
  CreditCard, TrendingUp, IndianRupee, Clock, CheckCircle2, AlertCircle,
  Search, Filter, ArrowUpDown, X, Wallet, Receipt, ChevronDown, Check,
  Building2, Calendar, Download, RefreshCw
} from 'lucide-react';
import { cn } from '../utils/cn';

const STATUS_CONFIG = {
  paid: { label: 'Paid', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' },
  pending: { label: 'Pending', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-500' },
  overdue: { label: 'Overdue', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/20', dot: 'bg-red-500 animate-pulse' },
  partially_paid: { label: 'Partial', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-500' },
  cancelled: { label: 'Cancelled', color: 'text-muted-foreground/60', bg: 'bg-muted border-border', dot: 'bg-muted-foreground/30' },
};

// =====================
// TENANT PAY MODAL
// =====================
function PayModal({ payment, onSuccess, onClose, theme }) {
  const [step, setStep] = useState(1); // 1=details, 2=card, 3=success
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const user = useAuthStore((state) => state.user);
  const formatCard = (v) => v.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19);
  const formatExpiry = (v) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5);

  const handlePay = async () => {
    setLoading(true);
    try {
      await paymentService.recordPayment(payment._id || payment.id, {
        amountPaid: payment.amount - (payment.amountPaid || 0),
        paymentDate: new Date().toISOString(),
        paymentMethod: 'card',
        reference: `TXN-${Date.now()}`,
      });
      setStep(3);
      setTimeout(() => { onSuccess(); onClose(); }, 2500);
    } catch (err) {
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-2xl transition-colors"
      >
        {step === 3 ? (
          /* Success */
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 p-10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
              className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
            </motion.div>
            <h3 className="text-2xl font-black text-foreground">Payment Successful! 🎉</h3>
            <p className="text-muted-foreground">Your rent payment of <span className="text-emerald-600 dark:text-emerald-400 font-black">₹{payment.amount?.toLocaleString('en-IN')}</span> has been processed.</p>
          </motion.div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
              <div>
                <h3 className="font-black text-foreground">Pay Rent</h3>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Secure payment processing</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-xl text-muted-foreground/40 hover:text-foreground hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {step === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {/* Amount Card */}
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Amount Due</p>
                    <p className="text-4xl font-black text-foreground">₹{(payment.amount - (payment.amountPaid || 0)).toLocaleString('en-IN')}</p>
                    <div className="flex gap-3 mt-3 text-xs text-muted-foreground/60">
                      <span>Property: {payment.property?.name || 'N/A'}</span>
                      <span>•</span>
                      <span>Due: {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {['💳 Card', '🏦 Bank', '📱 Wallet'].map((method, i) => (
                      <button key={i} onClick={() => i === 0 && setStep(2)}
                        className={cn('py-2.5 rounded-xl border text-xs font-bold transition-all',
                          i === 0 ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground/30 opacity-50 cursor-not-allowed'
                        )}>
                        {method}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Continue with Card →
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  {/* Card preview */}
                  <div className="relative p-5 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white overflow-hidden">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
                    <p className="text-xs font-bold opacity-60 mb-4">PAYMENT CARD</p>
                    <p className="text-xl font-black tracking-widest mb-4">{cardNumber || '•••• •••• •••• ••••'}</p>
                    <div className="flex justify-between">
                      <span className="text-xs opacity-60">VALID THRU {expiry || 'MM/YY'}</span>
                      <span className="text-sm font-bold">{(user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')} ••••</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">Card Number</label>
                      <input
                        type="text"
                        maxLength={19}
                        value={cardNumber}
                        onChange={e => setCardNumber(formatCard(e.target.value))}
                        placeholder="1234 5678 9012 3456"
                        className="mt-1 w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground placeholder-muted-foreground/20 outline-none focus:border-primary/50 transition-all text-sm font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">Expiry</label>
                        <input
                          type="text"
                          maxLength={5}
                          value={expiry}
                          onChange={e => setExpiry(formatExpiry(e.target.value))}
                          placeholder="MM/YY"
                          className="mt-1 w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground placeholder-muted-foreground/20 outline-none focus:border-primary/50 transition-all text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">CVV</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={cvv}
                          onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="•••"
                          className="mt-1 w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground placeholder-muted-foreground/20 outline-none focus:border-primary/50 transition-all text-sm font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground/60 text-sm font-bold hover:bg-muted transition-all">
                      Back
                    </button>
                    <button
                      onClick={handlePay}
                      disabled={loading || cardNumber.length < 19 || expiry.length < 5 || cvv.length < 3}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm disabled:opacity-40 hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                      ) : (
                        <><Check className="w-4 h-4" /> Pay ₹{(payment.amount - (payment.amountPaid || 0)).toLocaleString('en-IN')}</>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// =====================
// MAIN PAYMENTS PAGE
// =====================
export default function PaymentsPage() {
  const user = useAuthStore((state) => state.user);
  if (!user) return null;

  const role = user.role;
  // 'user' is a legacy role name — treat the same as tenant
  const effectiveRole = role === 'user' ? 'tenant' : role;
  const isTenant = effectiveRole === 'tenant';
  const isManagerOrAdmin = ['manager', 'admin'].includes(effectiveRole);

  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updateStatusId, setUpdateStatusId] = useState(null);

  const roleTheme = {
    admin: { from: 'from-violet-600', to: 'to-purple-600', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/20', bg: 'bg-violet-500/10' },
    manager: { from: 'from-blue-600', to: 'to-cyan-600', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/10' },
    tenant: { from: 'from-emerald-600', to: 'to-teal-600', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
  }[role] || {};

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      if (isTenant) {
        const payRes = await paymentService.getMyPayments();
        setPayments(payRes.data?.data || payRes.data || []);
      } else {
        const payRes = await paymentService.getAllPayments({ limit: 50 });
        setPayments(payRes.data?.data || payRes.data || []);
        const statRes = await paymentService.getPaymentStats();
        setStats(statRes.data?.data || {});
      }
    } catch (e) {
      console.error('Failed to fetch payments', e);
    }
    setLoading(false);
  }, [isTenant]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);


  const handleStatusUpdate = async (paymentId, newStatus) => {
    setUpdateStatusId(paymentId);
    try {
      await paymentService.updatePaymentStatus(paymentId, newStatus);
      setPayments(prev => prev.map(p => (p._id || p.id) === paymentId ? { ...p, status: newStatus } : p));
    } catch { }
    setUpdateStatusId(null);
  };

  const filteredPayments = payments.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchSearch = searchQuery === '' ||
      `${p.tenant?.firstName} ${p.tenant?.lastName} ${p.property?.name}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pendingPayments = payments.filter(p => ['pending', 'partially_paid', 'overdue'].includes(p.status));

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={cn('w-1.5 h-6 rounded-full bg-gradient-to-b', roleTheme.from, roleTheme.to)} />
            <p className={cn('text-[10px] font-black uppercase tracking-[0.25em]', roleTheme.text)}>
              {isTenant ? 'My Payments' : 'Payment Management'}
            </p>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            {isTenant ? 'Rent & Payments 💳' : 'Revenue Center 💰'}
          </h1>
        </div>
        {isTenant && pendingPayments.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelectedPayment(pendingPayments[0])}
            className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg bg-gradient-to-r', roleTheme.from, roleTheme.to)}
          >
            <Wallet className="w-4 h-4" /> Pay Now
          </motion.button>
        )}
      </motion.div>

      {/* Stats */}
      {isManagerOrAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Collected', value: `₹${(stats.totalCollected || 0).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'from-emerald-600 to-teal-600' },
            { label: 'Paid', value: stats.paidPayments || 0, icon: CheckCircle2, color: 'from-blue-600 to-cyan-600' },
            { label: 'Pending', value: stats.pendingPayments || 0, icon: Clock, color: 'from-amber-600 to-orange-600' },
            { label: 'Overdue', value: stats.overduePayments || 0, icon: AlertCircle, color: 'from-red-600 to-rose-600' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={cn('p-4 rounded-2xl border border-border bg-card shadow-sm')}
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br', s.color)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-0.5">{s.label}</p>
                <p className="text-2xl font-black text-foreground">{s.value}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Tenant: Pending Payment Alert */}
      {isTenant && pendingPayments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-700 dark:text-amber-300">Payment Due</p>
              <p className="text-xs text-amber-700/60 dark:text-amber-300/60">Your rent of <strong>₹{pendingPayments[0]?.amount?.toLocaleString('en-IN')}</strong> is due soon</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedPayment(pendingPayments[0])}
            className="px-4 py-2 rounded-xl bg-amber-600 dark:bg-amber-500 text-white font-bold text-xs hover:opacity-90 transition-all"
          >
            Pay Now
          </button>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-muted border border-border rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-muted-foreground/30" />
          <input
            type="text"
            placeholder={isTenant ? 'Search payments...' : 'Search tenant or property...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-foreground placeholder-muted-foreground/25 flex-1"
          />
        </div>
        <div className="flex gap-1">
          {['all', 'paid', 'pending', 'overdue', 'partially_paid'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-bold transition-all',
                statusFilter === status
                  ? cn('text-white bg-gradient-to-r', roleTheme.from, roleTheme.to)
                  : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted'
              )}
            >
              {status === 'all' ? 'All' : STATUS_CONFIG[status]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
      >
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/5 ml-auto" />
              </div>
            ))}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Receipt className="w-12 h-12 text-muted-foreground/10" />
            <p className="text-muted-foreground/40 font-bold">No payments found</p>
          </div>
        ) : (
          <div>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-border bg-muted/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
              <div className="col-span-3">{isTenant ? 'Property' : 'Tenant'}</div>
              <div className="col-span-3 hidden md:block">Property</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2 hidden md:block">Due Date</div>
              <div className="col-span-2">Status</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              {filteredPayments.map((payment, i) => {
                const statusStyle = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
                const payId = payment._id || payment.id;
                const owed = payment.amount - (payment.amountPaid || 0);

                return (
                  <motion.div
                    key={payId || i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="grid grid-cols-12 gap-3 items-center px-5 py-3.5 border-b border-border last:border-0 hover:bg-muted/50 transition-colors group"
                  >
                    {/* Tenant / Property Name */}
                    <div className="col-span-3">
                      {isTenant ? (
                        <p className="text-sm font-bold text-foreground/80 truncate">{payment.property?.name || 'N/A'}</p>
                      ) : (
                        <div>
                          <p className="text-sm font-bold text-foreground/80 truncate">{payment.tenant?.firstName} {payment.tenant?.lastName}</p>
                          <p className="text-[10px] text-muted-foreground/50">{payment.tenant?.email}</p>
                        </div>
                      )}
                    </div>

                    <div className="col-span-3 hidden md:block">
                      <p className="text-sm text-muted-foreground/60 truncate">{payment.property?.name || '—'}</p>
                    </div>

                    <div className="col-span-2">
                      <p className="text-sm font-black text-foreground">₹{payment.amount?.toLocaleString('en-IN')}</p>
                      {payment.amountPaid > 0 && (
                        <p className="text-[10px] text-muted-foreground/50">Paid: ₹{payment.amountPaid?.toLocaleString('en-IN')}</p>
                      )}
                    </div>

                    <div className="col-span-2 hidden md:block">
                      <p className="text-xs text-muted-foreground/60">
                        {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : '—'}
                      </p>
                    </div>

                    <div className="col-span-2 flex items-center gap-2">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black', statusStyle.bg, statusStyle.color)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                        {statusStyle.label}
                      </span>

                      {/* Tenant: Pay button for pending */}
                      {isTenant && owed > 0 && payment.status !== 'paid' && (
                        <button
                          onClick={() => setSelectedPayment(payment)}
                          className="opacity-0 group-hover:opacity-100 text-[10px] font-black px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all"
                        >
                          Pay
                        </button>
                      )}

                      {/* Manager/Admin: Status dropdown */}
                      {isManagerOrAdmin && payment.status !== 'paid' && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                          <button
                            onClick={() => handleStatusUpdate(payId, 'paid')}
                            disabled={updateStatusId === payId}
                            className="text-[9px] font-black px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
                          >
                            ✓ Paid
                          </button>
                          {payment.status !== 'overdue' && (
                            <button
                              onClick={() => handleStatusUpdate(payId, 'overdue')}
                              disabled={updateStatusId === payId}
                              className="text-[9px] font-black px-2 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all"
                            >
                              Overdue
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* Pay Modal */}
      <AnimatePresence>
        {selectedPayment && (
          <PayModal
            payment={selectedPayment}
            theme={roleTheme}
            onSuccess={fetchPayments}
            onClose={() => setSelectedPayment(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

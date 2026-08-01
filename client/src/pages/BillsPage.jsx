import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { billService, leaseService, paymentService } from '../services/api';
import useAuthStore from '../context/authStore';
import {
  Receipt, Download, Search, Filter, Calendar,
  IndianRupee, CheckCircle2, AlertCircle, FileText,
  ExternalLink, ArrowDownToLine, Wallet, Clock, Plus,
  Trash2, X, FileSpreadsheet, Eye, Ban, CreditCard
} from 'lucide-react';
import { cn } from '../utils/cn';
import { openSecureFile } from '../utils/fileAccess';
import { Link } from 'react-router-dom';

const STATUS_CONFIG = {
  paid: { label: 'Settled', color: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10', icon: CheckCircle2 },
  pending: { label: 'Due', color: 'text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/10', icon: AlertCircle },
  generated: { label: 'Finalized', color: 'text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/10', icon: Clock },
  overdue: { label: 'Overdue', color: 'text-red-600 dark:text-red-400 border-red-500/20 bg-red-500/10', icon: AlertCircle },
  partially_paid: { label: 'Partial', color: 'text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/10', icon: Clock },
  cancelled: { label: 'Cancelled', color: 'text-slate-600 dark:text-slate-400 border-slate-500/20 bg-slate-500/10', icon: X },
  voided: { label: 'Voided', color: 'text-slate-600 dark:text-slate-400 border-slate-500/20 bg-slate-500/10', icon: Ban },
};

const BILL_TYPES = [
  { value: 'rent', label: 'Rent' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'water', label: 'Water' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'parking', label: 'Parking' },
  { value: 'internet', label: 'Internet' },
  { value: 'security_deposit', label: 'Security Deposit' },
  { value: 'late_fee', label: 'Late Fee' },
  { value: 'repair', label: 'Repair' },
  { value: 'miscellaneous', label: 'Miscellaneous' }
];

export default function BillsPage() {
  const user = useAuthStore((state) => state.user);
  const isManagerOrAdmin = ['manager', 'admin'].includes(user?.role);

  // States
  const [bills, setBills] = useState([]);
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Legacy tab states
  const [activeTab, setActiveTab] = useState('bills');
  const [legacyPayments, setLegacyPayments] = useState([]);
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [generatingInvoiceIds, setGeneratingInvoiceIds] = useState({});

  // Modal States
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  // Form States - Generate Bill
  const [genType, setGenType] = useState('rent');
  const [genLease, setGenLease] = useState('');
  const [genDueDate, setGenDueDate] = useState('');
  const [genPeriodStart, setGenPeriodStart] = useState('');
  const [genPeriodEnd, setGenPeriodEnd] = useState('');
  const [meterPrevious, setMeterPrevious] = useState(0);
  const [meterCurrent, setMeterCurrent] = useState(0);
  const [meterRate, setMeterRate] = useState(1);
  const [genBreakdown, setGenBreakdown] = useState([{ label: 'Rent Charge', amount: '' }]);

  // Form States - Record Payment
  const [recordAmount, setRecordAmount] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [recordMethod, setRecordMethod] = useState('cash');
  const [recordRef, setRecordRef] = useState('');

  // Analytics Stats State
  const [analytics, setAnalytics] = useState({
    totalInvoiced: 0,
    totalCollected: 0,
    outstandingAmount: 0
  });

  // Fetch Bills
  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      if (isManagerOrAdmin) {
        const res = await billService.getAllBills({ limit: 100 });
        setBills(res.data?.data || res.data || []);
        
        // Fetch analytics
        const anaRes = await billService.getBillAnalytics();
        setAnalytics(anaRes.data?.data || anaRes.data || { totalInvoiced: 0, totalCollected: 0, outstandingAmount: 0 });
        
        // Fetch leases for dropdown
        const leaseRes = await leaseService.getAllLeases({ status: 'active' });
        setLeases(leaseRes.data?.data || leaseRes.data || []);
      } else {
        const res = await billService.getMyBills();
        setBills(res.data?.data || res.data || []);
      }
    } catch (err) {
      console.error('Failed to load bills:', err);
    }
    setLoading(false);
  }, [isManagerOrAdmin]);

  // Fetch Legacy Payments
  const fetchLegacyPayments = useCallback(async () => {
    setLegacyLoading(true);
    try {
      let res;
      if (isManagerOrAdmin) {
        res = await paymentService.getLegacyPayments({ limit: 100 });
      } else {
        res = await paymentService.getMyLegacyPayments({ limit: 100 });
      }
      setLegacyPayments(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load legacy payments:', err);
    }
    setLegacyLoading(false);
  }, [isManagerOrAdmin]);

  useEffect(() => {
    if (activeTab === 'bills') {
      fetchBills();
    } else {
      fetchLegacyPayments();
    }
  }, [activeTab, fetchBills, fetchLegacyPayments]);

  const handleDownloadLegacyInvoice = async (paymentId) => {
    // Optimistically lock button to prevent double-clicks
    setGeneratingInvoiceIds(prev => ({ ...prev, [paymentId]: true }));
    try {
      const res = await paymentService.getPaymentInvoice(paymentId);
      const data = res.data || res;
      if (data.success && data.url) {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const serverUrl = import.meta.env.VITE_API_URL || (apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase) || 'http://localhost:5000';
        const cleanServerUrl = serverUrl.replace(/\/$/, '');
        const fullUrl = data.url.startsWith('http') ? data.url : `${cleanServerUrl}${data.url.startsWith('/') ? '' : '/'}${data.url}`;
        window.open(fullUrl, '_blank');
      } else {
        alert('Failed to resolve secure download URL.');
      }
      await fetchLegacyPayments();
    } catch (err) {
      console.error('Failed to resolve legacy invoice:', err);
      alert('Error fetching invoice. Please try again.');
    } finally {
      setGeneratingInvoiceIds(prev => ({ ...prev, [paymentId]: false }));
    }
  };

  // Actions
  const handleGenerateBill = async (e) => {
    e.preventDefault();
    if (!genLease || !genDueDate) return;

    try {
      const formattedBreakdown = genBreakdown
        .filter(item => item.label && item.amount)
        .map(item => ({ label: item.label, amount: Number(item.amount) }));

      const payload = {
        type: genType,
        leaseId: genLease,
        dueDate: new Date(genDueDate),
        billingPeriodStart: genPeriodStart ? new Date(genPeriodStart) : undefined,
        billingPeriodEnd: genPeriodEnd ? new Date(genPeriodEnd) : undefined,
        breakdown: formattedBreakdown,
      };

      if (['electricity', 'water'].includes(genType)) {
        payload.meterReading = {
          previous: Number(meterPrevious),
          current: Number(meterCurrent),
          rate: Number(meterRate)
        };
      }

      await billService.createBill(payload);
      setShowGenerateModal(false);
      resetGenForm();
      fetchBills();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate bill');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedBill || !recordAmount) return;

    try {
      await billService.recordBillPayment(selectedBill._id, {
        amountPaid: Number(recordAmount),
        paymentDate: new Date(recordDate),
        paymentMethod: recordMethod,
        reference: recordRef
      });
      setShowRecordModal(false);
      setSelectedBill(null);
      resetRecordForm();
      fetchBills();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleVoidBill = async (billId) => {
    const reason = prompt('Please enter a reason for voiding this invoice:');
    if (reason === null) return;
    try {
      await billService.voidBill(billId, { reason });
      fetchBills();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to void bill');
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await billService.exportBillsCSV({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `billing_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const resetGenForm = () => {
    setGenType('rent');
    setGenLease('');
    setGenDueDate('');
    setGenPeriodStart('');
    setGenPeriodEnd('');
    setMeterPrevious(0);
    setMeterCurrent(0);
    setMeterRate(1);
    setGenBreakdown([{ label: 'Rent Charge', amount: '' }]);
  };

  const resetRecordForm = () => {
    setRecordAmount('');
    setRecordDate(new Date().toISOString().split('T')[0]);
    setRecordMethod('cash');
    setRecordRef('');
  };

  // Filters
  const filteredBills = bills.filter((b) => {
    const propertyName = b.property?.name || '';
    const tenantName = b.tenant ? `${b.tenant.firstName} ${b.tenant.lastName}` : '';
    const billNum = b.billNumber || '';

    const matchSearch =
      propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      billNum.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchType = typeFilter === 'all' || b.type === typeFilter;

    return matchSearch && matchStatus && matchType;
  });

  const filteredLegacyPayments = legacyPayments.filter((p) => {
    const refStr = p.reference || '';
    const paymentId = p._id ? p._id.toString() : '';
    const propertyName = p.property?.name || '';
    const tenantName = p.tenant ? `${p.tenant.firstName} ${p.tenant.lastName}` : '';
    const typeStr = p.type || '';

    const matchSearch =
      searchQuery === '' ||
      refStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paymentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      typeStr.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchType = typeFilter === 'all' || p.type === typeFilter;

    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 rounded-full bg-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
              Accounts & Ledger
            </p>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            {isManagerOrAdmin ? 'Invoices & Billing Hub 🧾' : 'My Invoices & Bills 🧾'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isManagerOrAdmin
              ? 'Issue bills, record manual ledger payments, export financials, and manage collections.'
              : 'View outstanding ledger items, process secure online card/UPI payments, and download bills.'}
          </p>
        </div>

        <div className="flex gap-2.5">
          {isManagerOrAdmin && (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-xs font-black hover:bg-muted transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                Export CSV
              </button>
              <button
                onClick={() => { resetGenForm(); setShowGenerateModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                New Invoice
              </button>
            </>
          )}
        </div>
      </div>

      {/* Analytics Dashboard (Manager/Admin only) */}
      {isManagerOrAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-5 shadow-sm">
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">Total Invoiced</span>
            <h2 className="text-3xl font-black text-foreground mt-1">₹{analytics.totalInvoiced.toLocaleString('en-IN')}</h2>
            <p className="text-xs text-muted-foreground mt-1">Sum of all finalized platform ledger items</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-5 shadow-sm">
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 tracking-widest uppercase">Collected Ledger</span>
            <h2 className="text-3xl font-black text-foreground mt-1">₹{analytics.totalCollected.toLocaleString('en-IN')}</h2>
            <p className="text-xs text-muted-foreground mt-1">Amount received and fully settled</p>
          </div>

          <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-2xl p-5 shadow-sm">
            <span className="text-[10px] font-black text-red-600 dark:text-red-400 tracking-widest uppercase">Outstanding Arrears</span>
            <h2 className="text-3xl font-black text-foreground mt-1">₹{analytics.outstandingAmount.toLocaleString('en-IN')}</h2>
            <p className="text-xs text-muted-foreground mt-1">Uncollected pending/overdue balance</p>
          </div>
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex border-b border-border gap-6">
        <button
          onClick={() => { setActiveTab('bills'); setSearchQuery(''); }}
          className={cn(
            "pb-3 text-sm font-black tracking-tight border-b-2 transition-all duration-200",
            activeTab === 'bills'
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Standard Invoices
        </button>
        <button
          onClick={() => { setActiveTab('legacy'); setSearchQuery(''); }}
          className={cn(
            "pb-3 text-sm font-black tracking-tight border-b-2 transition-all duration-200",
            activeTab === 'legacy'
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Legacy Payments
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by invoice number, tenant, or property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all shadow-sm"
          />
        </div>

        <div className="flex gap-2">
          {/* Status filter dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="generated">Generated</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="voided">Voided</option>
          </select>

          {/* Type filter dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all cursor-pointer"
          >
            <option value="all">All Types</option>
            {BILL_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices List Grid */}
      {activeTab === 'bills' ? (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-56 bg-card border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card border border-dashed border-border rounded-3xl text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-black text-foreground">No invoices matching criteria</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
              No bills or ledger statements were found in the selected period.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBills.map((bill, index) => {
              const status = STATUS_CONFIG[bill.status] || STATUS_CONFIG.pending;
              const StatusIcon = status.icon;
              const isSettled = bill.status === 'paid';
              const balance = bill.amountDue - bill.amountPaid;

              return (
                <motion.div
                  key={bill._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    "group relative bg-card border rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300",
                    isSettled ? "border-emerald-500/10" : balance > 0 && bill.status === 'overdue' ? "border-red-500/20 shadow-red-500/5 shadow-md" : "border-border"
                  )}
                >
                  {/* Status Ribbon */}
                  <div className={cn(
                    "absolute top-5 right-5 flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider",
                    status.color
                  )}>
                    <StatusIcon className="w-2.5 h-2.5" />
                    {status.label}
                  </div>

                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      <FileText className="w-5.5 h-5.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-muted-foreground/50 tracking-wider block">
                        {bill.billNumber}
                      </span>
                      <h3 className="text-sm font-black text-foreground truncate uppercase tracking-tight">
                        {bill.type.replace('_', ' ')}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {bill.property?.name || 'TMS'}  ·  {bill.tenant ? `${bill.tenant.firstName} ${bill.tenant.lastName}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Amount breakdown */}
                  <div className="space-y-2 mb-4 text-xs border-y border-border py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground/60">Amount Invoiced</span>
                      <span className="font-bold text-foreground">₹{bill.amountDue.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground/60">Settled to Date</span>
                      <span className="font-bold text-emerald-500">₹{bill.amountPaid.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground/60">Due Balance</span>
                      <span className={cn("font-extrabold", balance > 0 ? "text-red-500" : "text-foreground")}>
                        ₹{balance.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Due: {new Date(bill.dueDate).toLocaleDateString()}
                    </span>
                    {bill.billingPeriodStart && (
                      <span>
                        {new Date(bill.billingPeriodStart).toLocaleDateString('en-IN', { month: 'short' })} Billing
                      </span>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelectedBill(bill); setShowDetailModal(true); }}
                      className="p-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      title="Invoice Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {bill.invoiceUrl ? (
                      <button
                        onClick={() => openSecureFile(bill.invoiceUrl)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border bg-card text-xs font-black hover:bg-muted transition-all"
                      >
                        <Download className="w-4 h-4 text-emerald-500" />
                        Invoice PDF
                      </button>
                    ) : (
                      <div className="flex-1 text-center py-2 text-[10px] font-bold text-muted-foreground border border-dashed rounded-xl">
                        Processing PDF...
                      </div>
                    )}

                    {!isSettled && bill.status !== 'voided' && (
                      isManagerOrAdmin ? (
                        <button
                          onClick={() => { setSelectedBill(bill); setRecordAmount(balance); setShowRecordModal(true); }}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-sm"
                        >
                          Record Pay
                        </button>
                      ) : (
                        <Link
                          to={`/pay-now?billId=${bill._id}`}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-sm text-center"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Pay Now
                        </Link>
                      )
                    )}

                    {isManagerOrAdmin && bill.status !== 'voided' && !isSettled && (
                      <button
                        onClick={() => handleVoidBill(bill._id)}
                        className="p-2.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/5 transition-all"
                        title="Void Bill"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      ) : (
        legacyLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-56 bg-card border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredLegacyPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card border border-dashed border-border rounded-3xl text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-black text-foreground">No legacy payments matching criteria</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
              No unlinked historical payments were found in the selected period.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLegacyPayments.map((payment, index) => {
              const paymentDate = payment.paymentDate || payment.createdAt;
              const dateObj = new Date(paymentDate);
              const yearStr = dateObj.getFullYear();
              const cosmeticInvoiceNum = `INV-${yearStr}-${String(payment._id).slice(-6).toUpperCase()}`;

              const isGenerating = !!generatingInvoiceIds[payment._id];
              const hasFile = !!payment.fileId;

              return (
                <motion.div
                  key={payment._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="group relative bg-card border rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-border"
                >
                  {/* Status Ribbon (Always Settled/Paid for completed historical payments) */}
                  <div className="absolute top-5 right-5 flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Settled
                  </div>

                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      <FileText className="w-5.5 h-5.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-muted-foreground/50 tracking-wider block">
                        {cosmeticInvoiceNum}
                      </span>
                      <h3 className="text-sm font-black text-foreground truncate uppercase tracking-tight">
                        {payment.type.replace('_', ' ')}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {payment.property?.name || 'TMS'} {isManagerOrAdmin && payment.tenant ? ` · ${payment.tenant.firstName} ${payment.tenant.lastName}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Amount details */}
                  <div className="space-y-2 mb-4 text-xs border-y border-border py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground/60">Amount Settled</span>
                      <span className="font-bold text-foreground">₹{payment.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground/60">Method</span>
                      <span className="font-bold text-foreground capitalize">{payment.paymentMethod || 'Online'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground/60">Reference</span>
                      <span className="font-mono text-[10px] text-foreground truncate max-w-[120px]">{payment.reference || '—'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Paid: {dateObj.toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions Row */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadLegacyInvoice(payment._id)}
                      disabled={isGenerating}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all",
                        hasFile 
                          ? "border border-border bg-card text-foreground hover:bg-muted" 
                          : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/10",
                        isGenerating && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      <Download className={cn("w-4 h-4", hasFile ? "text-emerald-500" : "text-white")} />
                      {isGenerating 
                        ? 'Generating...' 
                        : hasFile 
                          ? 'Download Invoice' 
                          : 'Generate Invoice'
                      }
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}

      {/* Generate Invoice Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]"
          >
            <button
              onClick={() => setShowGenerateModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-xl font-black text-foreground mb-4">Generate Manual Invoice</h2>
            <form onSubmit={handleGenerateBill} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Invoice Type</label>
                <select
                  value={genType}
                  onChange={(e) => setGenType(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                >
                  {BILL_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Select Lease / Room</label>
                <select
                  value={genLease}
                  onChange={(e) => setGenLease(e.target.value)}
                  required
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                >
                  <option value="">-- Choose active lease --</option>
                  {leases.map(l => (
                    <option key={l._id} value={l._id}>
                      {l.property?.name} - {l.tenant?.firstName} {l.tenant?.lastName} ({l.leaseNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Due Date</label>
                  <input
                    type="date"
                    value={genDueDate}
                    onChange={(e) => setGenDueDate(e.target.value)}
                    required
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Billing Period Start</label>
                  <input
                    type="date"
                    value={genPeriodStart}
                    onChange={(e) => setGenPeriodStart(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Billing Period End</label>
                  <input
                    type="date"
                    value={genPeriodEnd}
                    onChange={(e) => setGenPeriodEnd(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* Utility Meter Readings Section */}
              {['electricity', 'water'].includes(genType) && (
                <div className="bg-muted p-4 rounded-xl border border-border space-y-3">
                  <p className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">Meter Reading Details</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground">Previous Reading</label>
                      <input
                        type="number"
                        value={meterPrevious}
                        onChange={(e) => setMeterPrevious(e.target.value)}
                        className="w-full bg-card border border-border rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground">Current Reading</label>
                      <input
                        type="number"
                        value={meterCurrent}
                        onChange={(e) => setMeterCurrent(e.target.value)}
                        className="w-full bg-card border border-border rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground">Rate (per unit)</label>
                      <input
                        type="number"
                        value={meterRate}
                        onChange={(e) => setMeterRate(e.target.value)}
                        className="w-full bg-card border border-border rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>
                  {meterCurrent > meterPrevious && (
                    <p className="text-[10px] text-emerald-500 font-bold">
                      Consumption: {meterCurrent - meterPrevious} units. Calculated amount: ₹{(meterCurrent - meterPrevious) * meterRate}
                    </p>
                  )}
                </div>
              )}

              {/* Items Breakdown list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Item Breakdown</label>
                  <button
                    type="button"
                    onClick={() => setGenBreakdown([...genBreakdown, { label: '', amount: '' }])}
                    className="text-xs text-emerald-500 font-black flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Charge
                  </button>
                </div>

                {genBreakdown.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="e.g. Rent, Security deposit"
                      value={item.label}
                      onChange={(e) => {
                        const newBreakdown = [...genBreakdown];
                        newBreakdown[index].label = e.target.value;
                        setGenBreakdown(newBreakdown);
                      }}
                      required
                      className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-xs focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) => {
                        const newBreakdown = [...genBreakdown];
                        newBreakdown[index].amount = e.target.value;
                        setGenBreakdown(newBreakdown);
                      }}
                      required
                      className="w-24 bg-muted border border-border rounded-lg px-3 py-2 text-xs focus:outline-none"
                    />
                    {genBreakdown.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setGenBreakdown(genBreakdown.filter((_, i) => i !== index))}
                        className="p-1.5 border border-border text-red-500 hover:bg-red-500/5 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 mt-4 transition-all"
              >
                Finalize & Generate Invoice
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 relative"
          >
            <button
              onClick={() => { setShowRecordModal(false); setSelectedBill(null); }}
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-xl font-black text-foreground mb-4">Record Payment Receipt</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Manually apply cash or bank transfer receipt to invoice <strong>{selectedBill?.billNumber}</strong>.
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Amount Paid (INR)</label>
                <input
                  type="number"
                  value={recordAmount}
                  onChange={(e) => setRecordAmount(e.target.value)}
                  required
                  max={selectedBill ? selectedBill.amountDue - selectedBill.amountPaid : undefined}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Receipt Date</label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  required
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Payment Method</label>
                <select
                  value={recordMethod}
                  onChange={(e) => setRecordMethod(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="transfer">Bank Transfer / UPI</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Reference / Notes</label>
                <input
                  type="text"
                  placeholder="Receipt ref, check number, transaction ref"
                  value={recordRef}
                  onChange={(e) => setRecordRef(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 transition-all"
              >
                Log Receipt & Sync Ledger
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedBill && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 relative overflow-y-auto max-h-[85vh]"
          >
            <button
              onClick={() => { setShowDetailModal(false); setSelectedBill(null); }}
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-black text-foreground mb-1">Invoice Details</h2>
            <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-4">
              {selectedBill.billNumber}
            </p>

            <div className="space-y-4">
              {/* Core Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground/60 block">Billing Period</span>
                  <span className="font-bold">
                    {selectedBill.billingPeriodStart ? (
                      `${new Date(selectedBill.billingPeriodStart).toLocaleDateString()} - ${new Date(selectedBill.billingPeriodEnd).toLocaleDateString()}`
                    ) : 'One-time'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground/60 block">Grace Period</span>
                  <span className="font-bold">{selectedBill.gracePeriodDays} days</span>
                </div>
              </div>

              {/* Utility Readings */}
              {selectedBill.meterReading?.current !== undefined && (
                <div className="bg-muted p-3 rounded-lg border border-border text-xs">
                  <p className="font-bold text-emerald-500 mb-1.5">Meter Diagnostics</p>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <span className="text-muted-foreground/60 block">Previous</span>
                      <span className="font-bold">{selectedBill.meterReading.previous} units</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground/60 block">Current</span>
                      <span className="font-bold">{selectedBill.meterReading.current} units</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground/60 block">Rate</span>
                      <span className="font-bold">₹{selectedBill.meterReading.rate}/unit</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Breakdown */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-muted-foreground">Charges Breakdown</span>
                <div className="bg-muted rounded-xl p-3.5 space-y-2 border border-border text-xs">
                  {selectedBill.breakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-bold">₹{item.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between font-black text-foreground">
                    <span>Total Bill</span>
                    <span>₹{selectedBill.amountDue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Ledger Timeline */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-muted-foreground">Audit Timeline</span>
                <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border pl-6">
                  {selectedBill.timeline.map((entry, idx) => (
                    <div key={idx} className="relative text-xs">
                      <div className="absolute -left-[22px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-foreground capitalize">{entry.status}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {entry.note && <p className="text-[11px] text-muted-foreground mt-0.5">{entry.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

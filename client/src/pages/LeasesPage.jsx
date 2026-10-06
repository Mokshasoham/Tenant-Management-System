import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { leaseService, tenantService, propertyService } from '../services/api';
import {
  Plus, Search, Eye, X, FileText, Calendar, IndianRupee,
  Building2, User, CheckCircle2, Clock, XCircle, AlertTriangle,
  RefreshCw, ArrowUpRight, Check, ShieldAlert, CheckSquare,
  ClipboardList, ChevronRight, MessageSquare, AlertCircle,
  Trash2, ShieldCheck
} from 'lucide-react';
import { cn } from '../utils/cn';

const STATUS_CONFIG = {
  active: { label: 'Active', class: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400', icon: CheckCircle2 },
  pending: { label: 'Pending', class: 'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400', icon: Clock },
  expiring_soon: { label: 'Expiring Soon', class: 'text-orange-500 bg-orange-500/10 border-orange-500/20 dark:text-orange-400', icon: AlertTriangle },
  expired: { label: 'Expired', class: 'text-rose-500 bg-rose-500/10 border-rose-500/20 dark:text-rose-400', icon: XCircle },
  terminated: { label: 'Terminated', class: 'text-slate-500 bg-slate-500/10 border-slate-500/20 dark:text-slate-400', icon: AlertTriangle },
};

function CreateLeaseModal({ onClose, onSave }) {
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState({
    tenantId: '', propertyId: '', startDate: '', endDate: '',
    rentAmount: '', depositAmount: '',
    utilities: { water: false, electricity: false, gas: false, internet: false },
    terms: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      tenantService.getAllTenants({ limit: 100 }),
      propertyService.getAllProperties({ limit: 100 }),
    ]).then(([t, p]) => {
      setTenants(t.data || []);
      setProperties(p.data || []);
    }).catch(console.error);
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setUtil = (k) => setForm(p => ({ ...p, utilities: { ...p.utilities, [k]: !p.utilities[k] } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await leaseService.createLease(form);
      onSave();
    } catch (err) {
      setError(err.message || 'Failed to create lease');
    } finally { setLoading(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl transition-colors"
      >
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-border bg-card/95 backdrop-blur-sm z-10 transition-colors">
          <h2 className="text-lg font-black text-foreground">Create Lease</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>}
          <SelectField label="Tenant *" value={form.tenantId} onChange={v => set('tenantId', v)}>
            <option value="" className="bg-card">Select Tenant</option>
            {tenants.map(t => <option key={t._id} value={t._id} className="bg-card">{t.firstName} {t.lastName} — {t.email}</option>)}
          </SelectField>
          <SelectField label="Property *" value={form.propertyId} onChange={v => {
            const p = properties.find(x => x._id === v);
            set('propertyId', v);
            if (p) { set('rentAmount', p.rentAmount); set('depositAmount', p.depositAmount || ''); }
          }}>
            <option value="" className="bg-card">Select Property</option>
            {properties.map(p => <option key={p._id} value={p._id} className="bg-card">{p.name} — {p.address}</option>)}
          </SelectField>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date *" type="date" required value={form.startDate} onChange={v => set('startDate', v)} />
            <Field label="End Date *" type="date" required value={form.endDate} onChange={v => set('endDate', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monthly Rent (₹) *" type="number" required value={form.rentAmount} onChange={v => set('rentAmount', v)} />
            <Field label="Security Deposit (₹)" type="number" value={form.depositAmount} onChange={v => set('depositAmount', v)} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Utilities Included</p>
            <div className="flex gap-3 flex-wrap">
              {['water', 'electricity', 'gas', 'internet'].map(u => (
                <button key={u} type="button" onClick={() => setUtil(u)}
                  className={cn('px-3 py-1.5 rounded-lg border text-xs font-bold transition-all capitalize shadow-sm', form.utilities[u]
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : 'bg-muted border-border text-muted-foreground hover:border-muted-foreground/30')}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <TextAreaField label="Terms & Conditions" value={form.terms} onChange={v => set('terms', v)} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all font-bold">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-black hover:opacity-90 transition-all disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Lease'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ViewLeaseModal({ lease, onClose, onTerminate }) {
  if (!lease) return null;

  const now = new Date();
  const isPastEndDate = lease.endDate && new Date(lease.endDate).getTime() < now.getTime();
  const effectiveStatus = lease.effectiveStatus || (isPastEndDate ? 'expired' : lease.status);

  let sc = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pending;
  if (effectiveStatus === 'expired') {
    sc = STATUS_CONFIG.expired;
  } else if (lease.status === 'pending' && lease.signature) {
    sc = { label: 'Upcoming', class: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20 dark:text-indigo-400', icon: Clock };
  }
  const Icon = sc.icon;
  const days = lease.endDate ? Math.ceil((new Date(lease.endDate) - now) / (1000 * 60 * 60 * 24)) : null;

  const hasOutstandingDues = lease.paymentSummary?.hasOutstandingDues || lease.lifecycle?.hasOutstandingDues;
  const unpaidAmount = lease.paymentSummary?.unpaidTotal || lease.lifecycle?.paymentSummary?.unpaidTotal || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl transition-colors"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div>
            <h2 className="text-lg font-black text-foreground">{lease.leaseNumber}</h2>
            <div className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-xs font-bold mt-1', sc.class)}>
              <Icon className="w-3 h-3" /> {sc.label}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Outstanding Dues Alert for Expired Leases */}
          {effectiveStatus === 'expired' && hasOutstandingDues && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
              <div className="flex items-center gap-2 text-rose-500 font-bold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Outstanding Dues on Expired Lease</span>
              </div>
              <p className="text-xs text-muted-foreground">
                This lease has expired, but an unpaid balance of <strong className="text-rose-400 font-black">₹{unpaidAmount.toLocaleString('en-IN')}</strong> remains pending on record. Settle via payments flow.
              </p>
            </div>
          )}

          {/* Linked Renewed Lease Info */}
          {lease.renewedLease && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-emerald-400">Renewed To Lease {lease.renewedLease.leaseNumber}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Term: {new Date(lease.renewedLease.startDate).toLocaleDateString()} – {new Date(lease.renewedLease.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-emerald-400">₹{lease.renewedLease.rentAmount?.toLocaleString('en-IN')} / mo</span>
            </div>
          )}

          {/* Linked Previous Lease Info */}
          {lease.renewedFromLease && (
            <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Renewed From:</span>
              <span className="font-bold text-foreground">{lease.renewedFromLease.leaseNumber}</span>
            </div>
          )}

          {/* Move-Out Notice Summary */}
          {lease.moveOutStatus && lease.moveOutStatus !== 'none' && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">Move-Out Notice Active</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 capitalize">
                  {lease.moveOutStatus.replace('_', ' ')}
                </span>
              </div>
              {lease.expectedMoveOutDate && (
                <p className="text-xs text-muted-foreground">
                  Expected Departure: <strong className="text-foreground">{new Date(lease.expectedMoveOutDate).toLocaleDateString()}</strong>
                </p>
              )}
              {lease.moveOutReason && (
                <p className="text-xs text-muted-foreground">
                  Reason: <strong className="text-foreground">{lease.moveOutReason}</strong>
                </p>
              )}
              {lease.moveOutComments && (
                <p className="text-xs text-muted-foreground/80 italic">
                  "{lease.moveOutComments}"
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <InfoBlock icon={User} label="Tenant" value={`${lease.tenant?.firstName || ''} ${lease.tenant?.lastName || ''}`} sub={lease.tenant?.email} />
            <InfoBlock icon={Building2} label="Property" value={lease.property?.name} sub={lease.property?.address} />
            <InfoBlock icon={Calendar} label="Start Date" value={new Date(lease.startDate).toLocaleDateString()} />
            <InfoBlock icon={Calendar} label="End Date" value={new Date(lease.endDate).toLocaleDateString()}
              sub={days !== null ? (days > 0 ? `${days} days remaining` : `${Math.abs(days)} days overdue`) : ''} />
            <InfoBlock icon={IndianRupee} label="Monthly Rent" value={lease.rentAmount === 0 ? 'FREE' : `₹${lease.rentAmount?.toLocaleString('en-IN')}`} />
            <InfoBlock icon={IndianRupee} label="Deposit" value={`₹${lease.depositAmount?.toLocaleString('en-IN') || '0'}`} />
          </div>

          {lease.utilities && (
            <div className="p-3 rounded-xl bg-muted/50 border border-border">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Utilities Included</p>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(lease.utilities).filter(([, v]) => v).map(([k]) => (
                  <span key={k} className="px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold capitalize">{k}</span>
                ))}
                {!Object.values(lease.utilities).some(Boolean) && <span className="text-muted-foreground/30 text-xs">None included</span>}
              </div>
            </div>
          )}

          {lease.terms && <div className="p-3 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground whitespace-pre-wrap">{lease.terms}</div>}

          {lease.signature && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Verified Digital Sign-Off</p>
              <div className="flex items-center gap-4 justify-between">
                <div className="text-xs space-y-1">
                  <p><span className="text-muted-foreground">Signed By:</span> <strong className="text-foreground">{lease.signedBy}</strong></p>
                  <p><span className="text-muted-foreground">IP:</span> <strong className="text-foreground font-mono">{lease.tenantSignatureIp}</strong></p>
                  <p><span className="text-muted-foreground">Date:</span> <strong className="text-foreground">{new Date(lease.signedAt).toLocaleString()}</strong></p>
                </div>
                {lease.signature && (
                  <div className="w-32 h-14 bg-card border border-border p-1 flex items-center justify-center rounded-lg overflow-hidden shadow-inner flex-shrink-0">
                    <img src={lease.signature} alt="Signature stamp" className="max-h-full max-w-full object-contain pointer-events-none filter dark:brightness-110" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {lease.status === 'active' && !isPastEndDate && (
          <div className="px-6 pb-6">
            <button onClick={onTerminate}
              className="w-full py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-black hover:bg-rose-500/20 transition-all cursor-pointer">
              Terminate Lease
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// Modal for Scheduling Move-Out Inspection
function ScheduleInspectionModal({ lease, onClose, onSaved }) {
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) return setError('Please select an inspection date');
    setLoading(true);
    setError('');
    try {
      await leaseService.scheduleInspection({
        leaseId: lease._id,
        inspectionDate: date,
        notes
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to schedule inspection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-black text-foreground">Schedule Property Inspection</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Inspection Date *" type="datetime-local" required value={date} onChange={setDate} />
          <TextAreaField label="Inspector Notes / Instructions" value={notes} onChange={setNotes} />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg disabled:opacity-50">
              {loading ? 'Scheduling...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

// Modal for Completing Move-Out Inspection
function CompleteInspectionModal({ lease, onClose, onSaved }) {
  const [result, setResult] = useState('passed');
  const [notes, setNotes] = useState('');
  const [repairCost, setRepairCost] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const targetInspectionId = lease.inspectionId || lease.inspection?._id || lease._id;
      await leaseService.completeInspection(targetInspectionId, {
        leaseId: lease._id,
        inspectionResult: result,
        notes,
        actualRepairCost: Number(repairCost) || 0,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to complete inspection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-black text-foreground">Record Inspection Outcome</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectField label="Inspection Result *" value={result} onChange={setResult}>
            <option value="passed" className="bg-card">Passed — Unit in Clean Order</option>
            <option value="minor_damage" className="bg-card">Minor Damage / Maintenance Needed</option>
            <option value="major_damage" className="bg-card">Major Damage Recorded</option>
          </SelectField>
          <Field label="Actual Repair Cost (₹)" type="number" value={repairCost} onChange={setRepairCost} />
          <TextAreaField label="Inspector Assessment &amp; Notes" value={notes} onChange={setNotes} />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg disabled:opacity-50">
              {loading ? 'Recording...' : 'Complete Inspection'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

// Modal for Rejecting Lease Renewal
function RejectRenewalModal({ renewal, onClose, onSaved }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return setError('Please provide a reason for declining the renewal request.');
    setLoading(true);
    setError('');
    try {
      await leaseService.rejectRenewal(renewal._id, reason);
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to reject renewal request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-black text-foreground">Decline Renewal Request</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Tenant will be notified with your reasoning and the lease renewal request will be marked as rejected.
          </p>
          <TextAreaField label="Reason for Decline *" value={reason} onChange={setReason} />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg disabled:opacity-50">
              {loading ? 'Declining...' : 'Confirm Decline'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

// Modal for Settling Security Deposit (Stage 3 Move-Out Workflow)
function SettleDepositModal({ lease, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [discretionaryDeductions, setDiscretionaryDeductions] = useState([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchPreview = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await leaseService.getDepositPreview(lease._id);
        if (isMounted) {
          setPreview(res.data?.data || res.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.response?.data?.message || err.message || 'Failed to load deposit preview');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchPreview();
    return () => { isMounted = false; };
  }, [lease._id]);

  const addDeduction = () => {
    setDiscretionaryDeductions(prev => [
      ...prev,
      { id: Date.now() + Math.random(), category: 'cleaning', reason: '', amount: '' }
    ]);
  };

  const updateDeduction = (index, field, value) => {
    setDiscretionaryDeductions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeDeduction = (index) => {
    setDiscretionaryDeductions(prev => prev.filter((_, i) => i !== index));
  };

  // Authoritative calculations from preview & manager entries
  const depositAmount = preview?.depositAmount || 0;
  const unpaidRent = preview?.unpaidRent || 0;
  const inspectionRepairCost = preview?.inspectionRepairCost || 0;
  const discretionaryTotal = discretionaryDeductions.reduce((sum, d) => {
    const val = Number(d.amount);
    return sum + (isNaN(val) || val < 0 ? 0 : val);
  }, 0);

  const totalDeductions = Math.round((unpaidRent + inspectionRepairCost + discretionaryTotal) * 100) / 100;
  const refundDue = Math.max(0, Math.round((depositAmount - totalDeductions) * 100) / 100);
  const outstandingBalance = Math.max(0, Math.round((totalDeductions - depositAmount) * 100) / 100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Client-side validation of discretionary deductions
    for (const d of discretionaryDeductions) {
      const amt = Number(d.amount);
      if (isNaN(amt) || amt < 0) {
        setSubmitting(false);
        return setError('All deduction amounts must be valid non-negative numbers');
      }
      if (amt > 0 && !d.reason?.trim()) {
        setSubmitting(false);
        return setError(`Please provide a reason for the ₹${amt} ${d.category} deduction`);
      }
    }

    try {
      const payload = {
        leaseId: lease._id,
        discretionaryDeductions: discretionaryDeductions
          .filter(d => Number(d.amount) > 0)
          .map(d => ({
            category: d.category,
            reason: d.reason.trim(),
            amount: Number(d.amount)
          })),
        notes: notes.trim() || 'Move-out deposit settlement completed'
      };

      await leaseService.processDepositRefund(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to settle security deposit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-black text-foreground">Settle Security Deposit</h3>
            <p className="text-xs text-muted-foreground">{lease.property?.name} • Lease: {lease.leaseNumber}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{error}</div>}

        {loading ? (
          <div className="text-center py-12 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground/60 mx-auto" />
            <p className="text-xs text-muted-foreground">Loading authoritative financial preview...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Authoritative Ledger Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
                <span className="text-[9px] font-black uppercase text-muted-foreground/60">Deposit Held</span>
                <p className="text-sm font-black text-foreground">₹{depositAmount.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-muted-foreground">Original escrow deposit</p>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
                <span className="text-[9px] font-black uppercase text-muted-foreground/60">Unpaid Rent &amp; Fees</span>
                <p className={cn("text-sm font-black", unpaidRent > 0 ? "text-rose-400" : "text-foreground")}>
                  ₹{unpaidRent.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-muted-foreground">From payment ledger</p>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
                <span className="text-[9px] font-black uppercase text-muted-foreground/60">Inspection Repairs</span>
                <p className={cn("text-sm font-black", inspectionRepairCost > 0 ? "text-amber-400" : "text-foreground")}>
                  ₹{inspectionRepairCost.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Status: {preview?.inspection?.inspectionResult || 'completed'}
                </p>
              </div>
            </div>

            {/* Discretionary Deductions Section */}
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-foreground">Discretionary Deductions</h4>
                  <p className="text-[11px] text-muted-foreground">Cleaning, unpaid utility bills, or other verified costs</p>
                </div>
                <button
                  type="button"
                  onClick={addDeduction}
                  className="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 text-[11px] font-black border border-blue-500/20 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Deduction
                </button>
              </div>

              {discretionaryDeductions.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/60 italic py-1">
                  No additional deductions added. Click "Add Deduction" to include cleaning or utility fees.
                </p>
              ) : (
                <div className="space-y-2">
                  {discretionaryDeductions.map((d, index) => (
                    <div key={d.id || index} className="flex items-center gap-2 bg-card p-2 rounded-xl border border-border">
                      <select
                        value={d.category}
                        onChange={(e) => updateDeduction(index, 'category', e.target.value)}
                        className="px-2 py-1.5 rounded-lg bg-muted border border-border text-xs font-medium text-foreground focus:outline-none"
                      >
                        <option value="cleaning">Cleaning</option>
                        <option value="utilities">Utilities</option>
                        <option value="other">Other</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Reason (required)"
                        value={d.reason}
                        onChange={(e) => updateDeduction(index, 'reason', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground placeholder-muted-foreground/40 focus:outline-none"
                      />

                      <div className="relative w-24">
                        <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={d.amount}
                          onChange={(e) => updateDeduction(index, 'amount', e.target.value)}
                          className="w-full pl-5 pr-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeDeduction(index)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                        title="Remove deduction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Settlement Balance Display */}
            <div className="p-3.5 rounded-xl border space-y-2 bg-card">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-2">
                <span>Total Deductions (Rent + Repairs + Additions):</span>
                <span className="font-bold text-foreground">₹{totalDeductions.toLocaleString('en-IN')}</span>
              </div>

              {refundDue > 0 ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-black text-emerald-400 block text-sm">Refund Due to Tenant: ₹{refundDue.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-muted-foreground">Settlement marks payable record. Disbursement handled via payments.</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Refund Due
                  </span>
                </div>
              ) : outstandingBalance > 0 ? (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-black text-rose-400 block text-sm">Tenant Balance Due: ₹{outstandingBalance.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-muted-foreground">Deductions exceed deposit held. Tenant liability will be recorded.</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    Balance Due
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                  <div>
                    <span className="font-black text-foreground block">Zero Balance Settlement</span>
                    <span className="text-[10px] text-muted-foreground">Full deposit offset or zero deposit and dues.</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                    Neutral
                  </span>
                </div>
              )}
            </div>

            <TextAreaField
              label="Manager Settlement Notes / Audit Statement"
              value={notes}
              onChange={setNotes}
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                {submitting ? 'Settling...' : 'Confirm & Complete Settlement'}
              </button>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  );
}

// Modal for Viewing Completed Deposit Settlement
function ViewDepositSettlementModal({ lease, onClose }) {
  const [settlement, setSettlement] = useState(lease.settlement || null);
  const [loading, setLoading] = useState(!lease.settlement);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (!lease.settlement) {
      leaseService.getDepositSettlement(lease._id)
        .then(res => {
          if (isMounted) setSettlement(res.data?.data || res.data);
        })
        .catch(err => {
          if (isMounted) setError(err?.response?.data?.message || err.message || 'Failed to load settlement details');
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => { isMounted = false; };
  }, [lease._id, lease.settlement]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-black text-foreground">Deposit Settlement Record</h3>
            <p className="text-xs text-muted-foreground">{lease.property?.name} • Lease: {lease.leaseNumber}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-muted-foreground">Loading settlement details...</div>
        ) : error ? (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{error}</div>
        ) : settlement ? (
          <div className="space-y-4 text-xs">
            {/* Status & Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-[9px] font-black uppercase text-muted-foreground/60">Deposit Held</span>
                <p className="text-sm font-black text-foreground">₹{settlement.depositAmount?.toLocaleString('en-IN') ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-[9px] font-black uppercase text-muted-foreground/60">Total Deductions</span>
                <p className="text-sm font-black text-foreground">₹{settlement.totalDeduction?.toLocaleString('en-IN') ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[9px] font-black uppercase text-emerald-400">Refund Due</span>
                <p className="text-sm font-black text-emerald-400">₹{settlement.refundAmount?.toLocaleString('en-IN') ?? 0}</p>
              </div>
            </div>

            {settlement.outstandingBalance > 0 && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-between">
                <span className="font-bold">Tenant Outstanding Balance Due:</span>
                <span className="font-black text-sm">₹{settlement.outstandingBalance?.toLocaleString('en-IN')}</span>
              </div>
            )}

            {/* Itemized Deductions */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">Itemized Deductions</h4>
              {(!settlement.deductions || settlement.deductions.length === 0) ? (
                <p className="text-muted-foreground/60 italic p-2 bg-muted/20 rounded-xl">No deductions applied. Full deposit refunded.</p>
              ) : (
                <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-muted/10">
                  {settlement.deductions.map((d, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-muted border border-border text-muted-foreground">
                          {d.category || 'other'}
                        </span>
                        <span className="font-medium text-foreground">{d.reason}</span>
                      </div>
                      <span className="font-bold text-foreground">₹{d.amount?.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settlement Details */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1.5 text-muted-foreground">
              <div className="flex justify-between">
                <span>Settlement Status:</span>
                <span className="font-bold text-emerald-400 uppercase">{settlement.status}</span>
              </div>
              <div className="flex justify-between">
                <span>Refund Status:</span>
                <span className="font-bold text-foreground uppercase">{settlement.refundStatus || 'due'}</span>
              </div>
              {settlement.refundDate && (
                <div className="flex justify-between">
                  <span>Settled Date:</span>
                  <span className="font-bold text-foreground">{new Date(settlement.refundDate).toLocaleString()}</span>
                </div>
              )}
              {settlement.reason && (
                <div className="pt-1 border-t border-border/50">
                  <span className="block text-[10px] font-black uppercase text-muted-foreground/60">Settlement Notes:</span>
                  <p className="text-foreground italic">{settlement.reason}</p>
                </div>
              )}
            </div>

            {/* Audit Timeline */}
            {settlement.timeline && settlement.timeline.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">Audit Timeline</h4>
                <div className="space-y-1">
                  {settlement.timeline.map((item, idx) => (
                    <div key={idx} className="text-[11px] p-2 rounded-lg bg-muted/20 border border-border flex items-start justify-between">
                      <div>
                        <span className="font-bold text-foreground">{item.event}</span>
                        <p className="text-muted-foreground">{item.note}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground/60">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-muted border border-border text-foreground font-bold hover:bg-muted/80 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function InfoBlock({ icon: Icon, label, value, sub }) {
  return (
    <div className="p-3 rounded-xl bg-muted/50 border border-border">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-primary/60" />
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{label}</p>
      </div>
      <p className="text-sm font-bold text-foreground">{value || '—'}</p>
      {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-all" />
    </div>
  );
}

function SelectField({ label, value, onChange, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all appearance-none">
        {children}
      </select>
    </div>
  );
}

function TextAreaField({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all resize-none" />
    </div>
  );
}

export default function LeasesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') || 'all';
  const filterParam = searchParams.get('filter') || '';
  const statusParam = searchParams.get('status') || '';

  const [activeTab, setActiveTab] = useState(activeTabParam);
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(statusParam);
  const [queryFilter, setQueryFilter] = useState(filterParam);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Renewal requests state
  const [renewals, setRenewals] = useState([]);
  const [renewalsLoading, setRenewalsLoading] = useState(false);

  // Move-out requests state
  const [moveOuts, setMoveOuts] = useState([]);
  const [moveOutsLoading, setMoveOutsLoading] = useState(false);

  // Modals state
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedRenewal, setSelectedRenewal] = useState(null);
  const [selectedMoveOut, setSelectedMoveOut] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [processingRefundId, setProcessingRefundId] = useState(null);
  const LIMIT = 10;

  // Sync tab from search params
  useEffect(() => {
    if (activeTabParam && ['all', 'renewals', 'moveouts'].includes(activeTabParam)) {
      setActiveTab(activeTabParam);
    }
  }, [activeTabParam]);

  // Sync filters from URL
  useEffect(() => {
    if (filterParam) setQueryFilter(filterParam);
    if (statusParam) setStatusFilter(statusParam);
  }, [filterParam, statusParam]);

  const fetchLeases = useCallback(async () => {
    try {
      setLoading(true);
      const res = await leaseService.getAllLeases({
        page,
        limit: LIMIT,
        status: statusFilter,
        filter: queryFilter
      });
      setLeases(res.data?.data || res.data || []);
      setTotal(res.data?.pagination?.total || res.pagination?.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, queryFilter]);

  const fetchRenewals = useCallback(async () => {
    try {
      setRenewalsLoading(true);
      const res = await leaseService.getRenewalRequests();
      setRenewals(res.data?.data || res.data || []);
    } catch (e) {
      console.error('Failed to load renewals:', e);
    } finally {
      setRenewalsLoading(false);
    }
  }, []);

  const fetchMoveOuts = useCallback(async () => {
    try {
      setMoveOutsLoading(true);
      const res = await leaseService.getMoveOutRequests();
      setMoveOuts(res.data?.data || res.data || []);
    } catch (e) {
      console.error('Failed to load move-outs:', e);
    } finally {
      setMoveOutsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'all') fetchLeases();
    if (activeTab === 'renewals') fetchRenewals();
    if (activeTab === 'moveouts') fetchMoveOuts();
  }, [activeTab, fetchLeases, fetchRenewals, fetchMoveOuts]);

  // Auto-select exact lease / request when leaseId query parameter is provided
  const targetLeaseId = searchParams.get('leaseId');
  useEffect(() => {
    if (!targetLeaseId) return;

    if (activeTab === 'all' && leases.length > 0) {
      const match = leases.find(l => l._id === targetLeaseId || l.leaseNumber === targetLeaseId);
      if (match) {
        setSelected(match);
        setModal('view');
      }
    } else if (activeTab === 'renewals' && renewals.length > 0) {
      const match = renewals.find(r => r.lease?._id === targetLeaseId || r.lease === targetLeaseId || r._id === targetLeaseId);
      if (match) {
        setSelectedRenewal(match);
      }
    } else if (activeTab === 'moveouts' && moveOuts.length > 0) {
      const match = moveOuts.find(m => m._id === targetLeaseId || m.leaseNumber === targetLeaseId);
      if (match) {
        setSelectedMoveOut(match);
      }
    }
  }, [targetLeaseId, activeTab, leases, renewals, moveOuts]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const handleApproveRenewal = async (renewal) => {
    // Client-side deadline check safeguard
    const now = new Date();
    if (renewal.lease?.endDate && new Date(renewal.lease.endDate).getTime() < now.getTime()) {
      alert('Cannot approve renewal: The renewal deadline for this lease has passed.');
      return;
    }
    if (!window.confirm(`Approve renewal request for ${renewal.property?.name}? A renewed lease will be generated idempotently.`)) {
      return;
    }
    try {
      setActionLoading(true);
      await leaseService.approveRenewal(renewal._id);
      fetchRenewals();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || err.message || 'Failed to approve renewal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeMoveOut = async (leaseId) => {
    if (!window.confirm('Finalize move-out and release this property as available for new bookings?')) {
      return;
    }
    try {
      setActionLoading(true);
      await leaseService.finalizeMoveOut(leaseId);
      fetchMoveOuts();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || err.message || 'Failed to finalize move-out');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessRefundPayout = async (settlementId, leaseId) => {
    if (!window.confirm('Initiate partial deposit refund payout to tenant through the payment gateway?')) {
      return;
    }
    try {
      setProcessingRefundId(settlementId || leaseId);
      await leaseService.processDepositRefundPayout({ settlementId, leaseId });
      fetchMoveOuts();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || err.message || 'Failed to process deposit refund payout');
    } finally {
      setProcessingRefundId(null);
    }
  };

  const handleTerminate = async () => {
    if (!window.confirm(`Terminate lease ${selected?.leaseNumber}?`)) return;
    try {
      await leaseService.terminateLease(selected._id);
      setModal(null);
      setSelected(null);
      fetchLeases();
    } catch (err) {
      console.error(err);
    }
  };

  const pendingRenewalsCount = renewals.filter(r => ['requested', 'under_review', 'pending', 'counter_offer'].includes(r.status)).length;
  const activeMoveOutsCount = moveOuts.filter(m => m.moveOutStatus && m.moveOutStatus !== 'completed').length;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-400 to-cyan-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-500 dark:text-blue-400">Contracts &amp; Lifecycle</p>
          </div>
          <h1 className="text-3xl font-black text-foreground">Lease Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Authoritative portal for tenancies, renewals, move-outs &amp; inspections</p>
        </div>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black text-sm hover:opacity-90 transition-all shadow-lg active:scale-95 transition-transform cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Lease
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/50 border border-border w-fit">
        <button
          onClick={() => handleTabChange('all')}
          className={cn(
            "px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'all'
              ? "bg-white text-blue-600 shadow-sm dark:bg-card dark:text-blue-400"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>ALL LEASES</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted border border-border text-muted-foreground">{total}</span>
        </button>

        <button
          onClick={() => handleTabChange('renewals')}
          className={cn(
            "px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'renewals'
              ? "bg-white text-indigo-600 shadow-sm dark:bg-card dark:text-indigo-400"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>RENEWAL REQUESTS</span>
          {pendingRenewalsCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30">
              {pendingRenewalsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('moveouts')}
          className={cn(
            "px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'moveouts'
              ? "bg-white text-amber-600 shadow-sm dark:bg-card dark:text-amber-400"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>MOVE-OUT NOTICES</span>
          {activeMoveOutsCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
              {activeMoveOutsCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ALL LEASES */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={queryFilter || statusFilter}
              onChange={e => {
                const val = e.target.value;
                setPage(1);
                if (val === 'expiring_soon' || val === 'unpaid_expired') {
                  setQueryFilter(val);
                  setStatusFilter('');
                } else {
                  setQueryFilter('');
                  setStatusFilter(val);
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-card">All Statuses &amp; Lifecycles</option>
              <option value="active" className="bg-card">Active Only</option>
              <option value="expiring_soon" className="bg-card">Expiring Within 7 Days</option>
              <option value="expired" className="bg-card">Expired Leases</option>
              <option value="unpaid_expired" className="bg-card">Expired with Unpaid Dues</option>
              <option value="pending" className="bg-card">Pending</option>
              <option value="terminated" className="bg-card">Terminated</option>
            </select>

            {(queryFilter || statusFilter) && (
              <button
                onClick={() => { setQueryFilter(''); setStatusFilter(''); setPage(1); }}
                className="text-xs font-bold text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl bg-muted/40 border border-border transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Leases Table */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Lease #', 'Property', 'Tenant', 'Period', 'Monthly Rent', 'Status / Lifecycle', 'Outstanding Dues', ''].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-16 text-muted-foreground/40">Loading leases...</td></tr>
                  ) : leases.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-16 text-muted-foreground/40">No leases found matching current criteria</td></tr>
                  ) : leases.map((l, i) => {
                    const now = new Date();
                    const isPastEndDate = l.endDate && new Date(l.endDate).getTime() < now.getTime();
                    const effectiveStatus = l.effectiveStatus || (isPastEndDate ? 'expired' : l.status);

                    let sc = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pending;
                    if (effectiveStatus === 'expired') {
                      sc = STATUS_CONFIG.expired;
                    } else if (l.status === 'pending' && l.signature) {
                      sc = { label: 'Upcoming', class: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20 dark:text-indigo-400', icon: Clock };
                    }
                    const SIcon = sc.icon;

                    const days = l.endDate ? Math.ceil((new Date(l.endDate) - now) / (1000 * 60 * 60 * 24)) : null;
                    const hasDues = l.paymentSummary?.hasOutstandingDues || l.lifecycle?.hasOutstandingDues;
                    const duesAmount = l.paymentSummary?.unpaidTotal || l.lifecycle?.paymentSummary?.unpaidTotal || 0;

                    return (
                      <motion.tr key={l._id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        onClick={() => { setSelected(l); setModal('view'); }}
                        className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors group"
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-bold text-foreground/90">{l.leaseNumber}</p>
                          {l.renewedLease && (
                            <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
                              <RefreshCw className="w-2.5 h-2.5" /> Renewed
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-foreground">{l.property?.name || '—'}</p>
                          <p className="text-xs text-muted-foreground/60 truncate max-w-[180px]">{l.property?.address}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm text-foreground/80 font-medium">{l.tenant?.firstName} {l.tenant?.lastName}</p>
                          <p className="text-xs text-muted-foreground/50">{l.tenant?.email}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-xs text-muted-foreground font-medium">{new Date(l.startDate).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground/60">→ {new Date(l.endDate).toLocaleDateString()}</p>
                          {effectiveStatus === 'active' && days !== null && days <= 7 && days > 0 && (
                            <span className="text-[10px] font-black text-orange-400">({days}d left)</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-bold text-foreground">
                          {l.rentAmount === 0 ? 'FREE' : `₹${l.rentAmount?.toLocaleString('en-IN')}`}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold', sc.class)}>
                            <SIcon className="w-3 h-3" />
                            <span>{sc.label}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {hasDues ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                              <AlertCircle className="w-3 h-3" />
                              <span>₹{duesAmount.toLocaleString('en-IN')} Unpaid</span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40 font-medium">None</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button onClick={(e) => { e.stopPropagation(); setSelected(l); setModal('view'); }}
                            className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100 cursor-pointer">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {total > LIMIT && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground/60">Showing {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} of {total}</p>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 transition-all border border-border cursor-pointer">← Prev</button>
                  <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 transition-all border border-border cursor-pointer">Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RENEWAL REQUESTS */}
      {activeTab === 'renewals' && (
        <div className="space-y-4">
          {renewalsLoading ? (
            <div className="text-center py-16 text-muted-foreground/40">Loading renewal requests...</div>
          ) : renewals.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-border text-center space-y-2">
              <RefreshCw className="w-8 h-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm font-bold text-foreground">No Lease Renewal Requests</p>
              <p className="text-xs text-muted-foreground">Tenant renewal submissions for your properties will appear here for approval or rejection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renewals.map((r) => {
                const now = new Date();
                const leaseEnd = r.lease?.endDate ? new Date(r.lease.endDate) : null;
                const isDeadlinePassed = leaseEnd && leaseEnd.getTime() < now.getTime();
                const isReviewable = ['requested', 'under_review', 'pending', 'counter_offer'].includes(r.status);

                return (
                  <motion.div
                    key={r._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-sm shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-foreground">{r.property?.name || 'Property'}</h3>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                              r.status === 'approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              r.status === 'rejected' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                              "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            )}>
                              {r.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{r.property?.address}</p>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground/60">{r.renewalNumber}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60">Tenant Details</p>
                          <p className="font-bold text-foreground">{r.tenant?.firstName} {r.tenant?.lastName}</p>
                          <p className="text-muted-foreground/70">{r.tenant?.email}</p>
                          {r.tenant?.phone && <p className="text-muted-foreground/60">{r.tenant.phone}</p>}
                        </div>

                        <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60">Current Terms</p>
                          <p className="text-muted-foreground">Lease: <strong className="text-foreground">{r.lease?.leaseNumber}</strong></p>
                          <p className="text-muted-foreground">Rent: <strong className="text-foreground">₹{r.lease?.rentAmount?.toLocaleString('en-IN')}</strong></p>
                          <p className="text-muted-foreground">Expiry: <strong className="text-foreground">{leaseEnd ? leaseEnd.toLocaleDateString() : '—'}</strong></p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/15 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-indigo-400 uppercase text-[10px]">Proposed Renewal Terms</span>
                          <span className="font-black text-foreground">₹{r.proposedRent?.toLocaleString('en-IN')} / mo</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground text-[10px]">Duration:</span>
                            <p className="font-bold text-foreground">{r.duration || '12 Months'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[10px]">Proposed Period:</span>
                            <p className="font-bold text-foreground">
                              {r.requestedStartDate ? new Date(r.requestedStartDate).toLocaleDateString() : '—'} → {r.requestedEndDate ? new Date(r.requestedEndDate).toLocaleDateString() : '—'}
                            </p>
                          </div>
                        </div>
                        {r.message && (
                          <div className="pt-1 border-t border-indigo-500/10 text-xs text-muted-foreground italic">
                            "{r.message}"
                          </div>
                        )}
                      </div>

                      {/* Deadline Alert */}
                      {isDeadlinePassed && isReviewable && (
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Renewal deadline has passed. This request can no longer be approved.</span>
                        </div>
                      )}

                      {r.status === 'rejected' && r.rejectionReason && (
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
                          Rejection Reason: <strong className="text-foreground">{r.rejectionReason}</strong>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {isReviewable && (
                      <div className="flex gap-2 pt-3 border-t border-border">
                        <button
                          type="button"
                          onClick={() => { setSelectedRenewal(r); setModal('rejectRenewal'); }}
                          className="flex-1 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-black text-xs transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading || isDeadlinePassed}
                          onClick={() => handleApproveRenewal(r)}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg disabled:opacity-40 transition-all cursor-pointer"
                        >
                          {actionLoading ? 'Approving...' : 'Approve Renewal'}
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MOVE-OUT NOTICES & INSPECTIONS */}
      {activeTab === 'moveouts' && (
        <div className="space-y-4">
          {moveOutsLoading ? (
            <div className="text-center py-16 text-muted-foreground/40">Loading move-out notices...</div>
          ) : moveOuts.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-border text-center space-y-2">
              <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm font-bold text-foreground">No Active Move-Out Notices</p>
              <p className="text-xs text-muted-foreground">Move-out notices and scheduled inspections will appear here throughout their 4-stage lifecycle.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {moveOuts.map((m) => {
                const moveStatus = m.moveOutStatus || 'requested';

                // Stepper stages
                const stages = [
                  { key: 'notice', label: '1. Notice Submitted', completed: true },
                  { key: 'inspection_scheduled', label: '2. Inspection Scheduled', completed: ['inspection_scheduled', 'inspection_completed', 'refund_processing', 'completed'].includes(moveStatus) },
                  { key: 'inspection_completed', label: '3. Inspection Done', completed: ['inspection_completed', 'refund_processing', 'completed'].includes(moveStatus) },
                  { key: 'completed', label: '4. Move-Out Finalized', completed: moveStatus === 'completed' },
                ];

                return (
                  <motion.div
                    key={m._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-foreground">{m.property?.name}</h3>
                          <span className="text-xs text-muted-foreground font-mono">({m.leaseNumber})</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{m.property?.address}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">Tenant:</span>
                        <span className="text-xs font-black text-foreground">{m.tenant?.firstName} {m.tenant?.lastName}</span>
                      </div>
                    </div>

                    {/* Stepper Display */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                      {stages.map((st) => (
                        <div
                          key={st.key}
                          className={cn(
                            "p-2.5 rounded-xl border text-center transition-all",
                            st.completed
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold"
                              : "bg-muted/30 border-border text-muted-foreground/60 font-medium"
                          )}
                        >
                          <div className="flex items-center justify-center gap-1.5 text-xs">
                            {st.completed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5" />}
                            <span>{st.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Move-Out Notice Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-muted/20 p-3 rounded-xl border border-border">
                      <div>
                        <span className="text-[10px] font-black uppercase text-muted-foreground/60">Notice Date</span>
                        <p className="font-bold text-foreground">{m.moveOutNoticeDate ? new Date(m.moveOutNoticeDate).toLocaleDateString() : '—'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-muted-foreground/60">Expected Move-Out Date</span>
                        <p className="font-bold text-foreground">{m.expectedMoveOutDate ? new Date(m.expectedMoveOutDate).toLocaleDateString() : '—'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-muted-foreground/60">Departure Reason</span>
                        <p className="font-bold text-foreground">{m.moveOutReason || 'Relocation / End of Lease'}</p>
                      </div>
                    </div>

                    {m.moveOutComments && (
                      <p className="text-xs text-muted-foreground italic px-1">
                        Notes: "{m.moveOutComments}"
                      </p>
                    )}

                    {/* Outstanding Dues Notice */}
                    {m.paymentSummary?.hasOutstandingDues && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold">
                          <AlertCircle className="w-4 h-4" /> Unpaid dues on this lease: ₹{m.paymentSummary?.unpaidTotal?.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Move-out does not waive dues</span>
                      </div>
                    )}

                    {/* Stage 3 Deposit Settlement Panel */}
                    {['inspection_completed', 'refund_processing', 'completed'].includes(moveStatus) && (
                      <div className={cn(
                        "p-4 rounded-xl border text-xs space-y-2.5",
                        m.isSettled
                          ? "bg-emerald-500/10 border-emerald-500/20"
                          : "bg-amber-500/10 border-amber-500/20"
                      )}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {m.isSettled ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span className="font-black text-emerald-400">Security Deposit Settled</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                  Authoritative
                                </span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                <span className="font-black text-amber-400">Deposit Settlement Required</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                  Action Needed
                                </span>
                              </>
                            )}
                          </div>

                          {m.isSettled ? (
                            <button
                              type="button"
                              onClick={() => { setSelectedMoveOut(m); setModal('viewSettlement'); }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 w-fit"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Settlement Details
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setSelectedMoveOut(m); setModal('settleDeposit'); }}
                              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 w-fit"
                            >
                              <IndianRupee className="w-3.5 h-3.5" /> Settle Security Deposit
                            </button>
                          )}
                        </div>

                        {m.isSettled ? (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-muted-foreground">
                              <div className="p-2 rounded-lg bg-card/60 border border-border/50">
                                <span className="text-[9px] font-black uppercase text-muted-foreground/60">Deposit Held</span>
                                <p className="font-bold text-foreground">₹{m.settlement?.depositAmount?.toLocaleString('en-IN') ?? m.depositAmount?.toLocaleString('en-IN') ?? 0}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-card/60 border border-border/50">
                                <span className="text-[9px] font-black uppercase text-muted-foreground/60">Total Deductions</span>
                                <p className="font-bold text-foreground">₹{m.settlement?.totalDeduction?.toLocaleString('en-IN') ?? 0}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <span className="text-[9px] font-black uppercase text-emerald-400">Refund Due</span>
                                <p className="font-black text-emerald-400">₹{m.settlement?.refundAmount?.toLocaleString('en-IN') ?? 0}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-card/60 border border-border/50">
                                <span className="text-[9px] font-black uppercase text-muted-foreground/60">Outstanding Balance</span>
                                <p className="font-bold text-foreground">₹{m.settlement?.outstandingBalance?.toLocaleString('en-IN') ?? 0}</p>
                              </div>
                            </div>

                            {/* Gateway Refund Lifecycle Control */}
                            <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">Refund Status:</span>
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border",
                                  m.settlement?.refundStatus === 'paid' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                                  m.settlement?.refundStatus === 'processing' || processingRefundId === (m.settlement?._id || m._id) ? "bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse" :
                                  m.settlement?.refundStatus === 'failed' ? "bg-rose-500/20 text-rose-300 border-rose-500/30" :
                                  m.settlement?.refundStatus === 'due' ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                                  "bg-muted text-muted-foreground border-border"
                                )}>
                                  {m.settlement?.refundStatus === 'paid' ? `✓ Paid (Ref: ${m.settlement?.gatewayRefundId || 'RFN'})` :
                                   processingRefundId === (m.settlement?._id || m._id) || m.settlement?.refundStatus === 'processing' ? '⏳ Processing Payout...' :
                                   m.settlement?.refundStatus === 'failed' ? '⚠️ Refund Delayed' :
                                   m.settlement?.refundStatus === 'due' ? '⏳ Refund Pending' :
                                   'No Refund Due'}
                                </span>
                                {m.settlement?.refundStatus === 'failed' && m.settlement?.refundFailureReason && (
                                  <span className="text-[10px] text-rose-400 italic">
                                    ({m.settlement.refundFailureReason})
                                  </span>
                                )}
                              </div>

                              {/* Payout Action Button */}
                              {m.settlement?.refundAmount > 0 && ['due', 'failed'].includes(m.settlement?.refundStatus) && (
                                <button
                                  type="button"
                                  disabled={processingRefundId === (m.settlement?._id || m._id)}
                                  onClick={() => handleProcessRefundPayout(m.settlement?._id, m._id)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  {processingRefundId === (m.settlement?._id || m._id) ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing...
                                    </>
                                  ) : m.settlement?.refundStatus === 'failed' ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5" /> Retry Refund (₹{m.settlement?.refundAmount?.toLocaleString('en-IN')})
                                    </>
                                  ) : (
                                    <>
                                      <IndianRupee className="w-3.5 h-3.5" /> Process Refund (₹{m.settlement?.refundAmount?.toLocaleString('en-IN')})
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Inspection has concluded. Settle deposit deductions (unpaid rent, inspection repairs, utilities) before move-out can be finalized.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions Workflow Bar */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      {['requested', 'notice_submitted'].includes(moveStatus) && (
                        <button
                          type="button"
                          onClick={() => { setSelectedMoveOut(m); setModal('scheduleInspection'); }}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                        >
                          Schedule Inspection
                        </button>
                      )}

                      {moveStatus === 'inspection_scheduled' && (
                        <button
                          type="button"
                          onClick={() => { setSelectedMoveOut(m); setModal('completeInspection'); }}
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                        >
                          Complete Inspection Report
                        </button>
                      )}

                      {['inspection_completed', 'refund_processing'].includes(moveStatus) && (
                        <>
                          {!m.isSettled ? (
                            <button
                              type="button"
                              onClick={() => { setSelectedMoveOut(m); setModal('settleDeposit'); }}
                              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <IndianRupee className="w-3.5 h-3.5" /> Settle Security Deposit
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleFinalizeMoveOut(m._id)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                            >
                              {actionLoading ? 'Finalizing...' : 'Finalize Move-Out & Release Unit'}
                            </button>
                          )}
                        </>
                      )}

                      {moveStatus === 'completed' && (
                        <span className="text-xs font-bold text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          Move-Out Finalized — Unit Released
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {modal === 'create' && (
          <CreateLeaseModal onClose={() => setModal(null)} onSave={() => { setModal(null); fetchLeases(); }} />
        )}
        {modal === 'view' && (
          <ViewLeaseModal lease={selected} onClose={() => { setModal(null); setSelected(null); }} onTerminate={handleTerminate} />
        )}
        {modal === 'rejectRenewal' && selectedRenewal && (
          <RejectRenewalModal
            renewal={selectedRenewal}
            onClose={() => { setModal(null); setSelectedRenewal(null); }}
            onSaved={() => { fetchRenewals(); }}
          />
        )}
        {modal === 'scheduleInspection' && selectedMoveOut && (
          <ScheduleInspectionModal
            lease={selectedMoveOut}
            onClose={() => { setModal(null); setSelectedMoveOut(null); }}
            onSaved={() => { fetchMoveOuts(); }}
          />
        )}
        {modal === 'completeInspection' && selectedMoveOut && (
          <CompleteInspectionModal
            lease={selectedMoveOut}
            onClose={() => { setModal(null); setSelectedMoveOut(null); }}
            onSaved={() => { fetchMoveOuts(); }}
          />
        )}
        {modal === 'settleDeposit' && selectedMoveOut && (
          <SettleDepositModal
            lease={selectedMoveOut}
            onClose={() => { setModal(null); setSelectedMoveOut(null); }}
            onSaved={() => { fetchMoveOuts(); }}
          />
        )}
        {modal === 'viewSettlement' && selectedMoveOut && (
          <ViewDepositSettlementModal
            lease={selectedMoveOut}
            onClose={() => { setModal(null); setSelectedMoveOut(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

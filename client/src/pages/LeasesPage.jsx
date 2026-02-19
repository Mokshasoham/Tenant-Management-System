import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { leaseService, tenantService, propertyService } from '../services/api';
import {
  Plus, Search, Eye, X, FileText, Calendar, IndianRupee,
  Building2, User, CheckCircle2, Clock, XCircle, AlertTriangle
} from 'lucide-react';
import { cn } from '../utils/cn';

const STATUS_CONFIG = {
  active: { label: 'Active', class: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  pending: { label: 'Pending', class: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Clock },
  expired: { label: 'Expired', class: 'text-white/30 bg-white/5 border-white/10', icon: XCircle },
  terminated: { label: 'Terminated', class: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: AlertTriangle },
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
      setError(err.response?.data?.message || 'Failed to create lease');
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
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-blue-500/20 bg-[#0a0f1e]"
      >
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0f1e] z-10">
          <h2 className="text-lg font-black text-white">Create Lease</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>}
          <SelectField label="Tenant *" value={form.tenantId} onChange={v => {
            const t = tenants.find(x => x._id === v);
            set('tenantId', v);
            if (t) set('rentAmount', t.monthlyIncome ? '' : '');
          }}>
            <option value="" className="bg-gray-900">Select Tenant</option>
            {tenants.map(t => <option key={t._id} value={t._id} className="bg-gray-900">{t.firstName} {t.lastName} — {t.email}</option>)}
          </SelectField>
          <SelectField label="Property *" value={form.propertyId} onChange={v => {
            const p = properties.find(x => x._id === v);
            set('propertyId', v);
            if (p) { set('rentAmount', p.rentAmount); set('depositAmount', p.depositAmount || ''); }
          }}>
            <option value="" className="bg-gray-900">Select Property</option>
            {properties.map(p => <option key={p._id} value={p._id} className="bg-gray-900">{p.name} — {p.address}</option>)}
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
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Utilities Included</p>
            <div className="flex gap-3 flex-wrap">
              {['water', 'electricity', 'gas', 'internet'].map(u => (
                <button key={u} type="button" onClick={() => setUtil(u)}
                  className={cn('px-3 py-1.5 rounded-lg border text-xs font-bold transition-all capitalize', form.utilities[u]
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'bg-white/5 border-white/10 text-white/30 hover:border-white/20')}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <TextAreaField label="Terms & Conditions" value={form.terms} onChange={v => set('terms', v)} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-white/40 hover:text-white transition-all font-bold">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black hover:opacity-90 transition-all disabled:opacity-50">
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
  const sc = STATUS_CONFIG[lease.status] || STATUS_CONFIG.pending;
  const Icon = sc.icon;
  const days = lease.endDate ? Math.ceil((new Date(lease.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0f1e] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <h2 className="text-lg font-black text-white">{lease.leaseNumber}</h2>
            <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-bold mt-1', sc.class)}>
              <Icon className="w-3 h-3" /> {sc.label}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <InfoBlock icon={User} label="Tenant" value={`${lease.tenant?.firstName || ''} ${lease.tenant?.lastName || ''}`} sub={lease.tenant?.email} />
            <InfoBlock icon={Building2} label="Property" value={lease.property?.name} sub={lease.property?.address} />
            <InfoBlock icon={Calendar} label="Start Date" value={new Date(lease.startDate).toLocaleDateString()} />
            <InfoBlock icon={Calendar} label="End Date" value={new Date(lease.endDate).toLocaleDateString()}
              sub={days !== null ? (days > 0 ? `${days} days remaining` : `${Math.abs(days)} days overdue`) : ''} />
            <InfoBlock icon={IndianRupee} label="Monthly Rent" value={`₹${lease.rentAmount?.toLocaleString('en-IN')}`} />
            <InfoBlock icon={IndianRupee} label="Deposit" value={`₹${lease.depositAmount?.toLocaleString('en-IN') || '0'}`} />
          </div>
          {lease.utilities && (
            <div className="p-3 rounded-xl bg-white/3 border border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/25 mb-2">Utilities Included</p>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(lease.utilities).filter(([, v]) => v).map(([k]) => (
                  <span key={k} className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold capitalize">{k}</span>
                ))}
                {!Object.values(lease.utilities).some(Boolean) && <span className="text-white/25 text-xs">None included</span>}
              </div>
            </div>
          )}
          {lease.terms && <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-sm text-white/40 whitespace-pre-wrap">{lease.terms}</div>}
        </div>
        {lease.status === 'active' && (
          <div className="px-6 pb-6">
            <button onClick={onTerminate}
              className="w-full py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-black hover:bg-rose-500/20 transition-all">
              Terminate Lease
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function InfoBlock({ icon: Icon, label, value, sub }) {
  return (
    <div className="p-3 rounded-xl bg-white/3 border border-white/5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-blue-400/60" />
        <p className="text-[9px] font-black uppercase tracking-widest text-white/25">{label}</p>
      </div>
      <p className="text-sm font-bold text-white">{value || '—'}</p>
      {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all" />
    </div>
  );
}

function SelectField({ label, value, onChange, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all appearance-none">
        {children}
      </select>
    </div>
  );
}

function TextAreaField({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all resize-none" />
    </div>
  );
}

export default function LeasesPage() {
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const LIMIT = 10;

  const fetchLeases = useCallback(async () => {
    try {
      setLoading(true);
      const res = await leaseService.getAllLeases({ page, limit: LIMIT, status: statusFilter });
      setLeases(res.data);
      setTotal(res.pagination?.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchLeases(); }, [fetchLeases]);

  const handleTerminate = async () => {
    if (!window.confirm(`Terminate lease ${selected?.leaseNumber}?`)) return;
    try {
      await leaseService.terminateLease(selected._id);
      setModal(null); setSelected(null);
      fetchLeases();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-400 to-cyan-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400">Contracts</p>
          </div>
          <h1 className="text-3xl font-black text-white">Leases <span className="text-white/20 font-bold text-lg">({total})</span></h1>
        </div>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black text-sm hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
          <Plus className="w-4 h-4" /> Create Lease
        </button>
      </motion.div>

      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none appearance-none">
          <option value="" className="bg-gray-900">All Statuses</option>
          {Object.keys(STATUS_CONFIG).map(s => (
            <option key={s} value={s} className="bg-gray-900">{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Lease #', 'Property', 'Tenant', 'Period', 'Rent', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/25">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16 text-white/30">Loading...</td></tr>
              ) : leases.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-white/30">No leases found</td></tr>
              ) : leases.map((l, i) => {
                const sc = STATUS_CONFIG[l.status] || STATUS_CONFIG.pending;
                const SIcon = sc.icon;
                return (
                  <motion.tr key={l._id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    onClick={() => { setSelected(l); setModal('view'); }}
                    className="border-b border-white/3 hover:bg-white/3 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-bold text-white/80">{l.leaseNumber}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-white/70">{l.property?.name || '—'}</p>
                      <p className="text-xs text-white/30">{l.property?.address}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-white/70">{l.tenant?.firstName} {l.tenant?.lastName}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-white/50">{new Date(l.startDate).toLocaleDateString()}</p>
                      <p className="text-xs text-white/30">→ {new Date(l.endDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-bold text-white">₹{l.rentAmount?.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5">
                      <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold', sc.class)}>
                        <SIcon className="w-3 h-3" /> {sc.label}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={(e) => { e.stopPropagation(); setSelected(l); setModal('view'); }}
                        className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100">
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
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
            <p className="text-xs text-white/30">Showing {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} of {total}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all">← Prev</button>
              <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all">Next →</button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal === 'create' && (
          <CreateLeaseModal onClose={() => setModal(null)} onSave={() => { setModal(null); fetchLeases(); }} />
        )}
        {modal === 'view' && (
          <ViewLeaseModal lease={selected} onClose={() => { setModal(null); setSelected(null); }} onTerminate={handleTerminate} />
        )}
      </AnimatePresence>
    </div>
  );
}

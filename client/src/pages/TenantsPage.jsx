import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tenantService } from '../services/api';
import {
  Plus, Search, Edit2, Trash2, Eye, X, User, Mail, Phone,
  MapPin, Briefcase, IndianRupee, Shield, ChevronDown, AlertTriangle,
  CheckCircle2, XCircle, Filter
} from 'lucide-react';
import { cn } from '../utils/cn';

const STATUS_CONFIG = {
  active: { label: 'Active', icon: CheckCircle2, class: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  inactive: { label: 'Inactive', icon: XCircle, class: 'text-white/40 bg-white/5 border-white/10' },
  banned: { label: 'Banned', icon: AlertTriangle, class: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
};

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', phone: '', address: '',
  idNumber: '', occupationStatus: 'employed', monthlyIncome: '',
  emergencyContact: { name: '', phone: '', relationship: '' }, notes: '',
};

function TenantModal({ tenant, onClose, onSave }) {
  const [form, setForm] = useState(tenant ? {
    ...tenant,
    monthlyIncome: tenant.monthlyIncome || '',
    emergencyContact: tenant.emergencyContact || { name: '', phone: '', relationship: '' },
  } : { ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const setEC = (key, val) => setForm(prev => ({
    ...prev, emergencyContact: { ...prev.emergencyContact, [key]: val },
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (tenant) {
        await tenantService.updateTenant(tenant._id, form);
      } else {
        await tenantService.createTenant(form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-blue-500/20 bg-[#0a0f1e]"
      >
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0f1e] z-10">
          <h2 className="text-lg font-black text-white">{tenant ? 'Edit Tenant' : 'Add New Tenant'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" required value={form.firstName} onChange={v => set('firstName', v)} />
            <Field label="Last Name" required value={form.lastName} onChange={v => set('lastName', v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" type="email" required value={form.email} onChange={v => set('email', v)} />
            <Field label="Phone" required value={form.phone} onChange={v => set('phone', v)} />
          </div>
          <Field label="Address" required value={form.address} onChange={v => set('address', v)} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="ID Number" value={form.idNumber} onChange={v => set('idNumber', v)} />
            <SelectField label="Employment" value={form.occupationStatus} onChange={v => set('occupationStatus', v)}
              options={['employed', 'self-employed', 'student', 'retired', 'other']} />
          </div>
          <Field label="Monthly Income (₹)" type="number" value={form.monthlyIncome} onChange={v => set('monthlyIncome', v)} />
          <div className="border-t border-white/5 pt-4">
            <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-3">Emergency Contact</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Name" value={form.emergencyContact.name} onChange={v => setEC('name', v)} />
              <Field label="Phone" value={form.emergencyContact.phone} onChange={v => setEC('phone', v)} />
              <Field label="Relationship" value={form.emergencyContact.relationship} onChange={v => setEC('relationship', v)} />
            </div>
          </div>
          <TextAreaField label="Notes" value={form.notes} onChange={v => set('notes', v)} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all font-bold">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black hover:opacity-90 transition-all disabled:opacity-50">
              {loading ? 'Saving...' : (tenant ? 'Save Changes' : 'Add Tenant')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ViewModal({ tenant, onClose, onEdit }) {
  if (!tenant) return null;
  const sc = STATUS_CONFIG[tenant.status] || STATUS_CONFIG.active;
  const Icon = sc.icon;
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, x: 40 }} animate={{ scale: 1, x: 0 }}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0f1e] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-black text-white">Tenant Profile</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-2xl font-black text-white">
              {tenant.firstName?.[0]}{tenant.lastName?.[0]}
            </div>
            <div>
              <h3 className="text-xl font-black text-white">{tenant.firstName} {tenant.lastName}</h3>
              <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold mt-1', sc.class)}>
                <Icon className="w-3 h-3" /> {sc.label}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoItem icon={Mail} label="Email" value={tenant.email} />
            <InfoItem icon={Phone} label="Phone" value={tenant.phone} />
            <InfoItem icon={MapPin} label="Address" value={tenant.address} />
            <InfoItem icon={Briefcase} label="Employment" value={tenant.occupationStatus} />
            {tenant.monthlyIncome && <InfoItem icon={IndianRupee} label="Monthly Income" value={`₹${tenant.monthlyIncome.toLocaleString('en-IN')}`} />}
            {tenant.idNumber && <InfoItem icon={Shield} label="ID Number" value={tenant.idNumber} />}
          </div>
          {tenant.emergencyContact?.name && (
            <div className="p-3 rounded-xl bg-white/3 border border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Emergency Contact</p>
              <p className="text-sm font-bold text-white">{tenant.emergencyContact.name}</p>
              <p className="text-xs text-white/40">{tenant.emergencyContact.phone} • {tenant.emergencyContact.relationship}</p>
            </div>
          )}
          {tenant.notes && <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-sm text-white/50">{tenant.notes}</div>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onEdit} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-black hover:opacity-90 transition-all flex items-center justify-center gap-2">
            <Edit2 className="w-4 h-4" /> Edit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}{required && ' *'}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all appearance-none">
        {options.map(o => <option key={o} value={o} className="bg-gray-900">{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
      </select>
    </div>
  );
}

function TextAreaField({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all resize-none" />
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-blue-400/60 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-white/25">{label}</p>
        <p className="text-sm text-white/70">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'view'
  const [selected, setSelected] = useState(null);
  const LIMIT = 12;

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await tenantService.getAllTenants({ page, limit: LIMIT, search, status: statusFilter });
      setTenants(res.data);
      setTotal(res.pagination?.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this tenant? This cannot be undone.')) return;
    try {
      await tenantService.deleteTenant(id);
      fetchTenants();
    } catch (err) { console.error(err); }
  };

  const handleStatusChange = async (id, status, e) => {
    e.stopPropagation();
    try {
      await tenantService.changeTenantStatus(id, status);
      fetchTenants();
    } catch (err) { console.error(err); }
  };

  const openEdit = (t) => { setSelected(t); setModal('edit'); };
  const openView = (t) => { setSelected(t); setModal('view'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-400 to-cyan-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400">Directory</p>
          </div>
          <h1 className="text-3xl font-black text-white">Tenants <span className="text-white/20 font-bold text-lg">({total})</span></h1>
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black text-sm hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
          <Plus className="w-4 h-4" /> Add Tenant
        </button>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-all" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/40 transition-all appearance-none">
          <option value="" className="bg-gray-900">All Statuses</option>
          <option value="active" className="bg-gray-900">Active</option>
          <option value="inactive" className="bg-gray-900">Inactive</option>
          <option value="banned" className="bg-gray-900">Banned</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/5 bg-white/3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Tenant', 'Contact', 'Employment', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/25">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-16 text-white/30">Loading...</td></tr>
              ) : tenants.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-16 text-white/30">No tenants found</td></tr>
              ) : tenants.map((t, i) => {
                const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.active;
                const StatusIcon = sc.icon;
                return (
                  <motion.tr key={t._id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => openView(t)}
                    className="border-b border-white/3 hover:bg-white/3 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600/80 to-cyan-600/80 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                          {t.firstName?.[0]}{t.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{t.firstName} {t.lastName}</p>
                          <p className="text-xs text-white/30">{t.idNumber || 'No ID'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-white/60">{t.email}</p>
                      <p className="text-xs text-white/30">{t.phone}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-white/50 capitalize">{t.occupationStatus}</td>
                    <td className="px-5 py-3.5">
                      <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold', sc.class)}>
                        <StatusIcon className="w-3 h-3" /> {sc.label}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                          className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => handleDelete(t._id, e)}
                          className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
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

      {/* Modals */}
      <AnimatePresence>
        {(modal === 'add' || modal === 'edit') && (
          <TenantModal
            tenant={modal === 'edit' ? selected : null}
            onClose={closeModal}
            onSave={() => { closeModal(); fetchTenants(); }}
          />
        )}
        {modal === 'view' && (
          <ViewModal
            tenant={selected}
            onClose={closeModal}
            onEdit={() => { setModal('edit'); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

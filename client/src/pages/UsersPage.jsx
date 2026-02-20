import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '../services/api';
import {
  Plus, Search, Edit2, Trash2, X, Shield, User, Mail, Phone,
  CheckCircle2, XCircle, Key
} from 'lucide-react';
import { cn } from '../utils/cn';

const ROLE_CONFIG = {
  admin: { class: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20' },
  manager: { class: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20' },
  tenant: { class: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
};

const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', password: '', role: 'tenant' };

function UserModal({ user, onClose, onSave }) {
  const isEdit = !!user;
  const [form, setForm] = useState(isEdit ? {
    firstName: user.firstName, lastName: user.lastName,
    email: user.email, phone: user.phone || '', role: user.role, password: '',
  } : { ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (isEdit) {
        const payload = { firstName: form.firstName, lastName: form.lastName, phone: form.phone };
        await userService.updateUser(user._id, payload);
      } else {
        await userService.createUser(form);
      }
      onSave();
    } catch (err) { setError(err.message || 'Failed to save user'); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-black text-foreground">{isEdit ? 'Edit User' : 'Create User'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name *" value={form.firstName} onChange={v => set('firstName', v)} required />
            <Field label="Last Name *" value={form.lastName} onChange={v => set('lastName', v)} required />
          </div>
          <Field label="Email *" type="email" value={form.email} onChange={v => set('email', v)} required disabled={isEdit} />
          <Field label="Phone" value={form.phone} onChange={v => set('phone', v)} />
          {!isEdit && <Field label="Password *" type="password" value={form.password} onChange={v => set('password', v)} required />}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Role</label>
            <div className="flex gap-2">
              {['tenant', 'manager', 'admin'].map(r => (
                <button key={r} type="button" disabled={isEdit} onClick={() => set('role', r)}
                  className={cn('flex-1 py-2 rounded-xl border text-xs font-black capitalize transition-all', form.role === r
                    ? ROLE_CONFIG[r]?.class
                    : 'border-border text-muted-foreground/40 hover:border-border/80 hover:bg-muted disabled:opacity-40')}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground font-bold transition-all transition-colors">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-black hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20">
              {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create User')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, value, onChange, type = 'text', required, disabled }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} disabled={disabled}
        className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-muted-foreground/30" />
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const LIMIT = 12;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await userService.getAllUsers({ page, limit: LIMIT, search, role: roleFilter });
      setUsers(res.data?.data || res.data || []);
      setTotal(res.data?.pagination?.total || res.pagination?.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this user?')) return;
    try { await userService.deleteUser(id); fetchUsers(); }
    catch (e) { console.error(e); }
  };

  const handleToggleStatus = async (id, e) => {
    e.stopPropagation();
    try { await userService.toggleUserStatus(id); fetchUsers(); }
    catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Administration</p>
          </div>
          <h1 className="text-3xl font-black text-foreground">Users <span className="text-muted-foreground/20 font-bold text-lg">({total})</span></h1>
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </motion.div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
          <option value="" className="bg-card">All Roles</option>
          <option value="admin" className="bg-card">Admin</option>
          <option value="manager" className="bg-card">Manager</option>
          <option value="tenant" className="bg-card">Tenant</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm transition-colors">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {['User', 'Contact', 'Role', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-16 text-muted-foreground/30">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-16 text-muted-foreground/30">No users found</td></tr>
            ) : users.map((u, i) => {
              const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.tenant;
              return (
                <motion.tr key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 hover:bg-muted/50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-lg',
                        u.role === 'admin' ? 'bg-gradient-to-br from-violet-600 to-purple-700' : u.role === 'manager' ? 'bg-gradient-to-br from-blue-600 to-cyan-700' : 'bg-gradient-to-br from-emerald-600 to-teal-700')}>
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground/60">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground/60">{u.phone || '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold capitalize', rc.class)}>
                      <Shield className="w-3 h-3" /> {u.role}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-black capitalize shadow-sm',
                      u.isActive ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400' : 'text-muted-foreground/40 bg-muted border-border')}>
                      {u.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {u.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); setSelected(u); setModal('edit'); }}
                        className="p-2 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={e => handleToggleStatus(u._id, e)}
                        title={u.isActive ? 'Deactivate' : 'Activate'}
                        className={cn('p-2 rounded-lg transition-all', u.isActive
                          ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20')}>
                        {u.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={e => handleDelete(u._id, e)}
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
        {total > LIMIT && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground/60 font-medium">Showing {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} of {total}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-4 py-1.5 rounded-xl text-xs font-black text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 transition-all border border-border shadow-sm">← Prev</button>
              <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}
                className="px-4 py-1.5 rounded-xl text-xs font-black text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 transition-all border border-border shadow-sm">Next →</button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(modal === 'add' || modal === 'edit') && (
          <UserModal user={modal === 'edit' ? selected : null}
            onClose={() => { setModal(null); setSelected(null); }}
            onSave={() => { setModal(null); setSelected(null); fetchUsers(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

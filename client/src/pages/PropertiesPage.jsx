import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService } from '../services/api';
import {
  Plus, Search, Edit2, Trash2, X, Home, Building2, MapPin,
  IndianRupee, Bed, Bath, Square, CheckCircle2, AlertTriangle,
  Wrench, Users, Tag
} from 'lucide-react';
import { cn } from '../utils/cn';
import { getDisplayStatus } from '../utils/propertyHelper';

const STATUS_CONFIG = {
  available: { label: 'Available', class: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400', icon: CheckCircle2 },
  occupied: { label: 'Occupied', class: 'text-blue-600 bg-blue-500/10 border-blue-500/20 dark:text-blue-400', icon: Users },
  maintenance: { label: 'Maintenance', class: 'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400', icon: Wrench },
  rented: { label: 'Rented', class: 'text-violet-600 bg-violet-500/10 border-violet-500/20 dark:text-violet-400', icon: Tag },
};

const TYPE_ICONS = { apartment: Building2, house: Home, commercial: Building2, land: Square };

import PropertyModal from '../components/PropertyModal';

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const LIMIT = 9;

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const res = await propertyService.getAllProperties({ page, limit: LIMIT, search, type: typeFilter, status: statusFilter });
      setProperties(res.data?.data || res.data || []);
      setTotal(res.data?.pagination?.total || res.pagination?.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this property?')) return;
    try { await propertyService.deleteProperty(id); fetchProperties(); }
    catch (err) { console.error(err); }
  };

  const handleStatusChange = async (id, status) => {
    try { await propertyService.changePropertyStatus(id, status); fetchProperties(); }
    catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-400 to-cyan-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-500 dark:text-blue-400">Portfolio</p>
          </div>
          <h1 className="text-3xl font-black text-foreground">Properties <span className="text-muted-foreground/40 font-bold text-lg">({total})</span></h1>
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black text-sm hover:opacity-90 transition-all shadow-lg active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" /> Add Property
        </button>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search properties..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder-muted-foreground/30 focus:outline-none focus:border-primary/40 transition-all" />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none appearance-none">
          <option value="" className="bg-card">All Types</option>
          {['apartment', 'house', 'commercial', 'land'].map(t => (
            <option key={t} value={t} className="bg-card">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none appearance-none">
          <option value="" className="bg-card">All Statuses</option>
          {Object.keys(STATUS_CONFIG).map(s => (
            <option key={s} value={s} className="bg-card">{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-muted/40 p-5 animate-pulse h-48" />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground/30 font-bold">No properties found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p, i) => {
            const getStatusConfig = (displayStatus, status) => {
              if (displayStatus === 'Available' || (!displayStatus && status === 'available')) {
                return { label: 'Available', class: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 };
              }
              if (displayStatus?.startsWith('Available from')) {
                return { label: displayStatus, class: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', icon: CheckCircle2 };
              }
              if (displayStatus === 'Under Maintenance' || (!displayStatus && status === 'maintenance')) {
                return { label: 'Under Maintenance', class: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: Wrench };
              }
              return { label: displayStatus || 'Sold Out', class: 'text-rose-500 bg-rose-500/10 border-rose-500/20', icon: Users };
            };
            const sc = getStatusConfig(getDisplayStatus(p), p.status);
            const StatusIcon = sc.icon;
            const TypeIcon = TYPE_ICONS[p.type] || Building2;
            return (
              <motion.div key={p._id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative rounded-2xl border border-border bg-card/60 p-5 hover:border-primary/30 hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                    <TypeIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold', sc.class)}>
                    <StatusIcon className="w-3 h-3" /> {sc.label}
                  </div>
                </div>
                <h3 className="font-black text-foreground mb-1 group-hover:text-primary transition-colors">{p.name}</h3>
                <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {p.address}{p.city ? `, ${p.city}` : ''}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground/50 mb-4">
                  {p.bedrooms != null && <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{p.bedrooms}</span>}
                  {p.bathrooms != null && <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{p.bathrooms}</span>}
                  {p.squareFeet && <span className="flex items-center gap-1"><Square className="w-3 h-3" />{p.squareFeet} sqft</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-foreground">₹{p.rentAmount?.toLocaleString('en-IN')}<span className="text-muted-foreground font-normal text-xs">/mo</span></span>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setSelected(p); setModal('edit'); }}
                      className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => handleDelete(p._id, e)}
                      className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Showing {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} of {total}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 border border-border transition-all">← Prev</button>
            <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 border border-border transition-all">Next →</button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {(modal === 'add' || modal === 'edit') && (
          <PropertyModal
            property={modal === 'edit' ? selected : null}
            onClose={() => { setModal(null); setSelected(null); }}
            onSave={() => { setModal(null); setSelected(null); fetchProperties(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

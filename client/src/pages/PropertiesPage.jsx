import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService } from '../services/api';
import {
  Plus, Search, Edit2, Trash2, X, Home, Building2, MapPin,
  IndianRupee, Bed, Bath, Square, CheckCircle2, AlertTriangle,
  Wrench, Users, Tag
} from 'lucide-react';
import { cn } from '../utils/cn';

const STATUS_CONFIG = {
  available: { label: 'Available', class: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  occupied: { label: 'Occupied', class: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Users },
  maintenance: { label: 'Maintenance', class: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Wrench },
  rented: { label: 'Rented', class: 'text-violet-400 bg-violet-500/10 border-violet-500/20', icon: Tag },
};

const TYPE_ICONS = { apartment: Building2, house: Home, commercial: Building2, land: Square };

const EMPTY_FORM = {
  name: '', address: '', city: '', state: '', zipCode: '', country: 'India',
  type: 'apartment', bedrooms: '', bathrooms: '', squareFeet: '',
  rentAmount: '', depositAmount: '', description: '', notes: '',
  amenities: '',
};

// ── Country list ──
const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Singapore',
  'United Arab Emirates', 'Saudi Arabia', 'Germany', 'France', 'Netherlands',
  'Japan', 'China', 'South Korea', 'Malaysia', 'Thailand', 'Bangladesh',
  'Pakistan', 'Sri Lanka', 'Nepal', 'Spain', 'Italy', 'Sweden', 'Switzerland',
  'New Zealand', 'South Africa', 'Nigeria', 'Kenya', 'Brazil', 'Mexico',
];

// ── Indian States & UTs ──
const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  // UTs
  'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

function PropertyModal({ property, onClose, onSave }) {
  const [form, setForm] = useState(property ? {
    ...property,
    amenities: (property.amenities || []).join(', '),
    bedrooms: property.bedrooms ?? '',
    bathrooms: property.bathrooms ?? '',
    squareFeet: property.squareFeet ?? '',
    depositAmount: property.depositAmount ?? '',
  } : { ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        amenities: form.amenities ? form.amenities.split(',').map(a => a.trim()).filter(Boolean) : [],
      };
      if (property) await propertyService.updateProperty(property._id, payload);
      else await propertyService.createProperty(payload);
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-blue-500/20 bg-[#0a0f1e]"
      >
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0f1e] z-10">
          <h2 className="text-lg font-black text-white">{property ? 'Edit Property' : 'Add Property'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>}
          <Field label="Property Name" required value={form.name} onChange={v => set('name', v)} />
          <Field label="Address" required value={form.address} onChange={v => set('address', v)} />
          {/* Country → drives state options */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Country *</label>
              <select value={form.country} onChange={e => { set('country', e.target.value); set('state', ''); }}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all appearance-none">
                <option value="" className="bg-gray-900">Select Country</option>
                {COUNTRIES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30">State / Region *</label>
              {form.country === 'India' ? (
                <select value={form.state} onChange={e => set('state', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all appearance-none">
                  <option value="" className="bg-gray-900">Select State</option>
                  {INDIA_STATES.map(s => <option key={s} value={s} className="bg-gray-900">{s}</option>)}
                </select>
              ) : (
                <input type="text" value={form.state} onChange={e => set('state', e.target.value)}
                  placeholder="Enter state / region"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" value={form.city} onChange={v => set('city', v)} />
            <Field label="ZIP / PIN Code" value={form.zipCode} onChange={v => set('zipCode', v)} />
          </div>
          <SelectField label="Type" value={form.type} onChange={v => set('type', v)}
            options={['apartment', 'house', 'commercial', 'land']} />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Bedrooms" type="number" value={form.bedrooms} onChange={v => set('bedrooms', v)} />
            <Field label="Bathrooms" type="number" value={form.bathrooms} onChange={v => set('bathrooms', v)} />
            <Field label="Sq. Feet" type="number" value={form.squareFeet} onChange={v => set('squareFeet', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monthly Rent (₹)" type="number" required value={form.rentAmount} onChange={v => set('rentAmount', v)} />
            <Field label="Deposit (₹)" type="number" value={form.depositAmount} onChange={v => set('depositAmount', v)} />
          </div>
          <Field label="Amenities (comma-separated)" value={form.amenities} onChange={v => set('amenities', v)}
            placeholder="Parking, Pool, Gym, Laundry..." />
          <TextAreaField label="Description" value={form.description} onChange={v => set('description', v)} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-white/40 hover:text-white transition-all font-bold">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black hover:opacity-90 transition-all disabled:opacity-50">
              {loading ? 'Saving...' : (property ? 'Save Changes' : 'Add Property')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, value, onChange, type = 'text', required, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}{required && ' *'}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all" />
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
        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all resize-none" />
    </div>
  );
}

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
      setProperties(res.data);
      setTotal(res.pagination?.total || 0);
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
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400">Portfolio</p>
          </div>
          <h1 className="text-3xl font-black text-white">Properties <span className="text-white/20 font-bold text-lg">({total})</span></h1>
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black text-sm hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
          <Plus className="w-4 h-4" /> Add Property
        </button>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search properties..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-all" />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none appearance-none">
          <option value="" className="bg-gray-900">All Types</option>
          {['apartment', 'house', 'commercial', 'land'].map(t => (
            <option key={t} value={t} className="bg-gray-900">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none appearance-none">
          <option value="" className="bg-gray-900">All Statuses</option>
          {Object.keys(STATUS_CONFIG).map(s => (
            <option key={s} value={s} className="bg-gray-900">{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-white/3 p-5 animate-pulse h-48" />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-20 text-white/20 font-bold">No properties found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p, i) => {
            const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.available;
            const StatusIcon = sc.icon;
            const TypeIcon = TYPE_ICONS[p.type] || Building2;
            return (
              <motion.div key={p._id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative rounded-2xl border border-white/5 bg-white/3 p-5 hover:border-blue-500/20 hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/20">
                    <TypeIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold', sc.class)}>
                    <StatusIcon className="w-3 h-3" /> {sc.label}
                  </div>
                </div>
                <h3 className="font-black text-white mb-1 group-hover:text-blue-300 transition-colors">{p.name}</h3>
                <p className="text-xs text-white/40 mb-4 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {p.address}{p.city ? `, ${p.city}` : ''}
                </p>
                <div className="flex items-center gap-4 text-xs text-white/30 mb-4">
                  {p.bedrooms != null && <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{p.bedrooms}</span>}
                  {p.bathrooms != null && <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{p.bathrooms}</span>}
                  {p.squareFeet && <span className="flex items-center gap-1"><Square className="w-3 h-3" />{p.squareFeet} sqft</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-white">₹{p.rentAmount?.toLocaleString('en-IN')}<span className="text-white/30 font-normal text-xs">/mo</span></span>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setSelected(p); setModal('edit'); }}
                      className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all">
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
          <p className="text-xs text-white/30">Showing {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} of {total}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 border border-white/5 transition-all">← Prev</button>
            <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 border border-white/5 transition-all">Next →</button>
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

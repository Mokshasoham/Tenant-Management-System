import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Wrench, AlertTriangle, Calendar as CalendarIcon, Clock, UploadCloud, Check, Building2, MapPin } from 'lucide-react';
import { propertyService, maintenanceService } from '../../../services/api';
import { cn } from '../../../utils/cn';

const CATEGORIES = [
  { id: 'plumbing', label: 'Plumbing', icon: '🚿' },
  { id: 'electrical', label: 'Electrical', icon: '⚡' },
  { id: 'hvac', label: 'HVAC / Cooling', icon: '❄️' },
  { id: 'appliance', label: 'Appliance', icon: '🔧' },
  { id: 'structural', label: 'Structural', icon: '🏗️' },
  { id: 'pest', label: 'Pest Control', icon: '🐛' },
  { id: 'cleaning', label: 'Cleaning', icon: '🧹' },
  { id: 'other', label: 'Other Repair', icon: '📋' },
];

const TIME_SLOTS = [
  { id: 'morning', label: 'Morning (8 AM - 12 PM)', icon: '🌅' },
  { id: 'afternoon', label: 'Afternoon (12 PM - 4 PM)', icon: '☀️' },
  { id: 'evening', label: 'Evening (4 PM - 8 PM)', icon: '🌙' },
];

export default function TenantMaintenanceRequestForm({ selectedLease, canChangeLease, onChangeLease, onClose, onSave, theme }) {
  const [form, setForm] = useState({
    title: '',
    category: 'plumbing',
    priority: 'medium',
    description: '',
    property: selectedLease?.property?._id || selectedLease?.property || '',
    unit: selectedLease?.property?.unit || '',
    requestedVisitDate: '',
    requestedTimeSlot: 'morning',
  });

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedLease) {
      fetchProperties();
    } else {
      setForm((prev) => ({
        ...prev,
        property: selectedLease.property?._id || selectedLease.property || '',
        unit: selectedLease.property?.unit || prev.unit || '',
      }));
    }
  }, [selectedLease]);

  const fetchProperties = async () => {
    try {
      const res = await propertyService.getAllProperties({ limit: 100 });
      const list = res.data?.data || res.data || (Array.isArray(res) ? res : []);
      setProperties(list);
      if (list.length > 0) {
        setForm((prev) => ({ ...prev, property: list[0]._id }));
      }
    } catch (err) {
      console.error('Error loading properties for tenant request form:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError('Please provide a title and detailed description.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await maintenanceService.createRequest({
        title: form.title,
        category: form.category,
        priority: form.priority,
        description: form.description,
        lease: selectedLease?._id || undefined,
        property: selectedLease?.property?._id || selectedLease?.property || form.property || undefined,
        unit: selectedLease?.property?.unit || form.unit || undefined,
        requestedVisitDate: form.requestedVisitDate || undefined,
        requestedTimeSlot: form.requestedTimeSlot || 'morning',
      });
      onSave && onSave();
    } catch (err) {
      console.error('Error submitting maintenance request:', err);
      setError(err?.message || 'Failed to submit maintenance request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[600] flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className={cn(
          "w-full max-w-xl p-6 rounded-[2.5rem] border shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto scrollbar-none",
          theme === 'light' ? "bg-white text-slate-900 border-slate-200" : "bg-[#0c0d15] text-white border-white/15 shadow-black"
        )}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Smart Maintenance Request</h3>
              <p className="text-[10px] text-muted-foreground font-medium">
                Submit repair ticket & schedule preferred visit time
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Lease / Property Indicator */}
        {selectedLease && (
          <div className={cn(
            "p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-sm",
            theme === 'light' ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-500/10 border-amber-500/20"
          )}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 block">
                  Property / Lease
                </span>
                <p className="text-xs font-black text-foreground truncate">
                  {selectedLease.property?.name || 'Selected Property'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {selectedLease.property?.address ? `${selectedLease.property.address} • ` : ''}Lease #{selectedLease.leaseNumber || String(selectedLease._id).slice(-8)}
                </p>
              </div>
            </div>

            {canChangeLease && (
              <button
                type="button"
                onClick={onChangeLease}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 font-black text-[10px] uppercase tracking-wider shrink-0 transition-colors cursor-pointer border border-amber-500/30"
              >
                Change
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Issue Title */}
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">
              Issue Title *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Water Leakage Under Sink / Kitchen AC Not Cooling"
              className={cn(
                "w-full p-3 rounded-2xl border font-semibold focus:outline-none transition-all",
                theme === 'light' ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-white/10"
              )}
            />
          </div>

          {/* Category Selector */}
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat.id })}
                  className={cn(
                    "p-2.5 rounded-2xl border text-[11px] font-bold transition-all flex items-center gap-2 cursor-pointer",
                    form.category === cat.id
                      ? "bg-amber-600 text-white border-amber-500 shadow-md"
                      : "bg-slate-900/40 border-white/5 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{cat.icon}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Priority Selector */}
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1.5">
              Urgency Priority
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['low', 'medium', 'high', 'emergency'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, priority: p })}
                  className={cn(
                    "py-2 px-1 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all text-center cursor-pointer capitalize",
                    form.priority === p
                      ? p === 'emergency' ? "bg-rose-600 text-white border-rose-500 animate-pulse" : "bg-amber-600 text-white border-amber-500 shadow-md"
                      : "bg-slate-900/40 border-white/5 text-muted-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">
              Detailed Problem Description *
            </label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the problem in detail (location in unit, when it started)..."
              className={cn(
                "w-full p-3 rounded-2xl border font-semibold focus:outline-none transition-all",
                theme === 'light' ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-white/10"
              )}
            />
          </div>

          {/* Preferred Repair Visit Schedule */}
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
            <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" /> Preferred Repair Visit Schedule
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase text-muted-foreground block mb-1">
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={form.requestedVisitDate}
                  onChange={(e) => setForm({ ...form, requestedVisitDate: e.target.value })}
                  className={cn(
                    "w-full p-2.5 rounded-xl border font-mono text-xs focus:outline-none",
                    theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-white/10"
                  )}
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-muted-foreground block mb-1">
                  Time Window
                </label>
                <select
                  value={form.requestedTimeSlot}
                  onChange={(e) => setForm({ ...form, requestedTimeSlot: e.target.value })}
                  className={cn(
                    "w-full p-2.5 rounded-xl border font-bold text-xs focus:outline-none",
                    theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-white/10"
                  )}
                >
                  {TIME_SLOTS.map((s) => (
                    <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-border text-xs font-black hover:bg-muted transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-black shadow-lg shadow-amber-600/30 hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? 'Submitting Ticket...' : 'Submit Ticket & Schedule Visit'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

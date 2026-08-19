import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  DollarSign,
  TrendingUp,
  Users,
  ShieldCheck,
  Building2,
  Save,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Edit3,
  Check,
  AlertCircle
} from 'lucide-react';
import { subscriptionService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';

export default function AdminSubscriptionPage() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState({
    tenantPlans: {
      free: { maxLeases: 2, price: 0 },
      plus: { maxLeases: 4, price: 499 },
      pro: { maxLeases: 999999, price: 999 },
    },
    managerPlans: {
      starter: { maxProperties: 3, price: 0 },
      plus: { maxProperties: 5, price: 1499 },
      pro: { maxProperties: 999999, price: 2999 },
    },
  });
  const [toastMessage, setToastMessage] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, tenantPlansRes, managerPlansRes] = await Promise.all([
        subscriptionService.getAdminStats().catch(() => ({ data: {} })),
        subscriptionService.getPlans('tenant').catch(() => ({ data: [] })),
        subscriptionService.getPlans('manager').catch(() => ({ data: [] })),
      ]);

      setStats(statsRes?.data?.data || statsRes?.data || {});

      const tList = tenantPlansRes?.data?.data || tenantPlansRes?.data || [];
      const mList = managerPlansRes?.data?.data || managerPlansRes?.data || [];

      if (tList.length > 0 || mList.length > 0) {
        setPlans((prev) => {
          const next = { ...prev };
          tList.forEach((p) => {
            if (next.tenantPlans[p.planId]) {
              next.tenantPlans[p.planId].price = p.price;
              next.tenantPlans[p.planId].maxLeases = p.maxLeases;
            }
          });
          mList.forEach((p) => {
            if (next.managerPlans[p.planId]) {
              next.managerPlans[p.planId].price = p.price;
              next.managerPlans[p.planId].maxProperties = p.maxProperties;
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.error('Error fetching admin subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await subscriptionService.updateAdminConfig(plans);
      setToastMessage('✅ Subscription plans and pricing saved successfully!');
      setTimeout(() => setToastMessage(null), 4000);
      fetchData();
    } catch (err) {
      console.error('Error updating plan config:', err);
      setToastMessage('❌ Failed to update subscription settings.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 border border-slate-700 text-white shadow-2xl flex items-center gap-3 text-sm font-bold"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-black tracking-widest uppercase mb-2">
              <ShieldCheck className="w-3 h-3" />
              <span>ADMIN COMMAND CENTER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Subscription Management &amp; Pricing
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Configure Resident and Manager subscription plan pricing, limits, and review live revenue metrics.
            </p>
          </div>

          <button
            onClick={fetchData}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0B1530] to-[#050A19] border border-indigo-500/30 shadow-xl space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Subscriptions
            </span>
            <div className="text-3xl font-black text-white">
              {stats?.activeSubscriptions || 0}
            </div>
            <span className="text-[11px] text-indigo-400 font-medium">Across all tenants &amp; managers</span>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#061D1A] to-[#030E0C] border border-emerald-500/30 shadow-xl space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Monthly Recurring Revenue
            </span>
            <div className="text-3xl font-black text-emerald-400 font-mono">
              ₹{stats?.totalMonthlyRevenue || 0}
            </div>
            <span className="text-[11px] text-emerald-400/80 font-medium">From active paid subscriptions</span>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#1C1405] to-[#0A0702] border border-amber-500/30 shadow-xl space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Managed Accounts
            </span>
            <div className="text-3xl font-black text-amber-400 font-mono">
              {stats?.totalSubscriptions || 0}
            </div>
            <span className="text-[11px] text-amber-400/80 font-medium">Free &amp; paid users registered</span>
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSaveConfig} className="space-y-8">
          {/* Tenant Plan Configs */}
          <div className="p-6 sm:p-8 rounded-[28px] bg-slate-950/80 border border-emerald-500/30 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Tenant (Resident) Plans</h2>
                <p className="text-xs text-slate-400">Controls active lease capacity limits and pricing for residents.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Resident Free */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <h3 className="text-sm font-black text-white uppercase">Resident Free</h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Max Leases</label>
                    <input
                      type="number"
                      value={plans.tenantPlans.free.maxLeases}
                      onChange={(e) => setPlans({
                        ...plans,
                        tenantPlans: {
                          ...plans.tenantPlans,
                          free: { ...plans.tenantPlans.free, maxLeases: Number(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Monthly Price (₹)</label>
                    <input
                      type="number"
                      disabled
                      value={0}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-slate-800 text-slate-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Resident Plus */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-emerald-400 uppercase">Resident Plus</h3>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">POPULAR</span>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Max Leases</label>
                    <input
                      type="number"
                      value={plans.tenantPlans.plus.maxLeases}
                      onChange={(e) => setPlans({
                        ...plans,
                        tenantPlans: {
                          ...plans.tenantPlans,
                          plus: { ...plans.tenantPlans.plus, maxLeases: Number(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Monthly Price (₹)</label>
                    <input
                      type="number"
                      value={plans.tenantPlans.plus.price}
                      onChange={(e) => setPlans({
                        ...plans,
                        tenantPlans: {
                          ...plans.tenantPlans,
                          plus: { ...plans.tenantPlans.plus, price: Number(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Resident Pro */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-amber-400 uppercase">Resident Pro</h3>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">BEST VALUE</span>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Max Leases (999999 = Unlimited)</label>
                    <input
                      type="number"
                      value={plans.tenantPlans.pro.maxLeases}
                      onChange={(e) => setPlans({
                        ...plans,
                        tenantPlans: {
                          ...plans.tenantPlans,
                          pro: { ...plans.tenantPlans.pro, maxLeases: Number(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Monthly Price (₹)</label>
                    <input
                      type="number"
                      value={plans.tenantPlans.pro.price}
                      onChange={(e) => setPlans({
                        ...plans,
                        tenantPlans: {
                          ...plans.tenantPlans,
                          pro: { ...plans.tenantPlans.pro, price: Number(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Manager Plan Configs */}
          <div className="p-6 sm:p-8 rounded-[28px] bg-slate-950/80 border border-indigo-500/30 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Manager (Portfolio) Plans</h2>
                <p className="text-xs text-slate-400">Controls property portfolio capacity limits and pricing for managers.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Starter */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <h3 className="text-sm font-black text-white uppercase">Manager Starter</h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Max Properties</label>
                    <input
                      type="number"
                      value={plans.managerPlans.starter.maxProperties}
                      onChange={(e) => setPlans({
                        ...plans,
                        managerPlans: {
                          ...plans.managerPlans,
                          starter: { ...plans.managerPlans.starter, maxProperties: Number(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Monthly Price (₹)</label>
                    <input
                      type="number"
                      disabled
                      value={0}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-slate-800 text-slate-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Manager Plus */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-indigo-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-indigo-400 uppercase">Manager Plus</h3>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">POPULAR</span>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Max Properties</label>
                    <input
                      type="number"
                      value={plans.managerPlans.plus.maxProperties}
                      onChange={(e) => setPlans({
                        ...plans,
                        managerPlans: {
                          ...plans.managerPlans,
                          plus: { ...plans.managerPlans.plus, maxProperties: Number(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Monthly Price (₹)</label>
                    <input
                      type="number"
                      value={plans.managerPlans.plus.price}
                      onChange={(e) => setPlans({
                        ...plans,
                        managerPlans: {
                          ...plans.managerPlans,
                          plus: { ...plans.managerPlans.plus, price: Number(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-indigo-400 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Manager Pro */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-cyan-400 uppercase">Manager Pro</h3>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">GROWING</span>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Max Properties (999999 = Unlimited)</label>
                    <input
                      type="number"
                      value={plans.managerPlans.pro.maxProperties}
                      onChange={(e) => setPlans({
                        ...plans,
                        managerPlans: {
                          ...plans.managerPlans,
                          pro: { ...plans.managerPlans.pro, maxProperties: Number(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Monthly Price (₹)</label>
                    <input
                      type="number"
                      value={plans.managerPlans.pro.price}
                      onChange={(e) => setPlans({
                        ...plans,
                        managerPlans: {
                          ...plans.managerPlans,
                          pro: { ...plans.managerPlans.pro, price: Number(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-400 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Configurations...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Plan Configurations</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

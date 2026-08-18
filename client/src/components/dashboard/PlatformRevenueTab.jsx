import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    DollarSign, TrendingUp, Sliders, CheckCircle2, 
    AlertCircle, RefreshCw, Save, Percent, Shield,
    Receipt, Building2, User, CreditCard
} from 'lucide-react';
import { platformService } from '../../services/api';
import { cn } from '../../utils/cn';

export default function PlatformRevenueTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [metrics, setMetrics] = useState({
        totalPlatformRevenue: 0,
        totalRentProcessed: 0,
        platformFeesCollected: 0,
        managerCommissionsCollected: 0,
        refundedPlatformFees: 0,
        successfulPayments: 0,
        totalTransactions: 0,
    });
    const [transactions, setTransactions] = useState([]);
    const [settings, setSettings] = useState({
        platformFeeEnabled: true,
        platformFeeType: 'percentage',
        platformFeePercentage: 1.0,
        platformFeeFixedAmount: 0,
        platformFeePayer: 'tenant',
        platformFeeTaxPercentage: 0,
        managerCommissionEnabled: false,
        managerCommissionPercentage: 0,
    });
    const [message, setMessage] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [revRes, setRes] = await Promise.allSettled([
                platformService.getAdminRevenueSummary(),
                platformService.getPlatformSettings(),
            ]);

            if (revRes.status === 'fulfilled') {
                const raw = revRes.value?.data?.data || revRes.value?.data || revRes.value;
                if (raw?.metrics) setMetrics(raw.metrics);
                if (Array.isArray(raw?.recentTransactions)) setTransactions(raw.recentTransactions);
            }

            if (setRes.status === 'fulfilled') {
                const raw = setRes.value?.data?.data || setRes.value?.data || setRes.value;
                if (raw) setSettings(prev => ({ ...prev, ...raw }));
            }
        } catch (err) {
            console.error('Error loading platform revenue data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await platformService.updatePlatformSettings(settings);
            setMessage({ type: 'success', text: 'Platform revenue settings updated successfully!' });
            const raw = res?.data?.data || res?.data || res;
            if (raw) setSettings(prev => ({ ...prev, ...raw }));
        } catch (err) {
            setMessage({ 
                type: 'error', 
                text: err?.response?.data?.message || err?.message || 'Failed to update platform settings.' 
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-foreground">TMS Platform Revenue Model</h2>
                    <p className="text-xs text-muted-foreground">Server-calculated revenue ledger, fee breakdown, and admin fee controls</p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-xs font-bold text-foreground hover:bg-muted transition-all cursor-pointer w-fit"
                >
                    <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh Revenue Data
                </button>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl border border-border bg-card/40 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                            Net TMS Earnings
                        </span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Platform Revenue</p>
                    <p className="text-2xl font-black text-foreground">₹{Number(metrics.totalPlatformRevenue || 0).toLocaleString('en-IN')}</p>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card/40 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Rent Volume
                        </span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Total Rent Processed</p>
                    <p className="text-2xl font-black text-foreground">₹{Number(metrics.totalRentProcessed || 0).toLocaleString('en-IN')}</p>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card/40 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                            <Percent className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                            Active {settings.platformFeePercentage}%
                        </span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Platform Fees Collected</p>
                    <p className="text-2xl font-black text-foreground">₹{Number(metrics.platformFeesCollected || 0).toLocaleString('en-IN')}</p>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card/40 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                            <Shield className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                            Verified Ledger
                        </span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Captured Transactions</p>
                    <p className="text-2xl font-black text-foreground">{metrics.successfulPayments || 0} / {metrics.totalTransactions || 0}</p>
                </div>
            </div>

            {/* Fee Settings Configuration Card */}
            <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-6">
                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-border">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                        <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-foreground">Platform Fee & Commission Configuration</h3>
                        <p className="text-xs text-muted-foreground">Modify server-side fees applied transparently at checkout</p>
                    </div>
                </div>

                {message && (
                    <div className={cn(
                        "p-4 rounded-xl mb-5 flex items-center gap-2.5 text-xs font-bold border",
                        message.type === 'success' 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    )}>
                        {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSaveSettings} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Platform Fee Toggle & Rate */}
                        <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-foreground">Enable Platform Fee</label>
                                <input
                                    type="checkbox"
                                    checked={settings.platformFeeEnabled}
                                    onChange={(e) => setSettings({ ...settings, platformFeeEnabled: e.target.checked })}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-muted-foreground font-medium block mb-1.5">Platform Fee (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={settings.platformFeePercentage}
                                    onChange={(e) => setSettings({ ...settings, platformFeePercentage: Number(e.target.value) })}
                                    disabled={!settings.platformFeeEnabled}
                                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Fee Payer */}
                        <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border">
                            <label className="text-xs font-bold text-foreground block">Fee Payer</label>
                            <select
                                value={settings.platformFeePayer}
                                onChange={(e) => setSettings({ ...settings, platformFeePayer: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="tenant">Tenant (Added to Rent)</option>
                                <option value="manager">Manager (Deducted from Rent)</option>
                                <option value="split">Split 50/50</option>
                            </select>
                            <p className="text-[10px] text-muted-foreground">Default: Tenant pays transparent 1% fee at checkout.</p>
                        </div>

                        {/* Manager Commission */}
                        <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-foreground">Manager Commission</label>
                                <input
                                    type="checkbox"
                                    checked={settings.managerCommissionEnabled}
                                    onChange={(e) => setSettings({ ...settings, managerCommissionEnabled: e.target.checked })}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-muted-foreground font-medium block mb-1.5">Commission (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={settings.managerCommissionPercentage}
                                    onChange={(e) => setSettings({ ...settings, managerCommissionPercentage: Number(e.target.value) })}
                                    disabled={!settings.managerCommissionEnabled}
                                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                        >
                            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            {saving ? 'Saving Changes...' : 'Save Platform Settings'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Live Payment Transactions Audit Table */}
            <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-6">
                <h3 className="text-sm font-black text-foreground mb-4">Revenue Ledger & Verified Transactions</h3>
                {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-36 text-muted-foreground text-xs">
                        <Receipt className="w-8 h-8 opacity-20 mb-2" />
                        No verified revenue transactions recorded yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-border text-muted-foreground font-black uppercase text-[9px] tracking-wider">
                                    <th className="py-3 px-3">Tenant / Property</th>
                                    <th className="py-3 px-3">Gross Rent</th>
                                    <th className="py-3 px-3">TMS Platform Fee</th>
                                    <th className="py-3 px-3">Commission</th>
                                    <th className="py-3 px-3">Manager Net</th>
                                    <th className="py-3 px-3">Status</th>
                                    <th className="py-3 px-3">Payment Ref</th>
                                    <th className="py-3 px-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {transactions.map((tx) => (
                                    <tr key={tx._id} className="hover:bg-muted/30 transition-colors">
                                        <td className="py-3 px-3">
                                            <p className="font-bold text-foreground">
                                                {tx.tenant ? `${tx.tenant.firstName || ''} ${tx.tenant.lastName || ''}` : 'Tenant'}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">{tx.property?.name || 'Property'}</p>
                                        </td>
                                        <td className="py-3 px-3 font-bold text-foreground">
                                            ₹{Number(tx.rentAmount || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3 px-3 font-black text-indigo-400">
                                            ₹{Number(tx.platformFee || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3 px-3 text-muted-foreground">
                                            ₹{Number(tx.managerCommission || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3 px-3 font-black text-emerald-400">
                                            ₹{Number(tx.managerNetAmount || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 font-mono text-[10px] text-muted-foreground">
                                            {tx.razorpayPaymentId || '—'}
                                        </td>
                                        <td className="py-3 px-3 text-[10px] text-muted-foreground">
                                            {new Date(tx.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

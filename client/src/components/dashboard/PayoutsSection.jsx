import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wallet, ArrowDownToLine, History, TrendingUp, 
    CheckCircle2, Clock, XCircle, AlertCircle, Info,
    CreditCard, ShieldCheck, X, Building2, ExternalLink, RefreshCw
} from 'lucide-react';
import { payoutService, stripeConnectService } from '../../services/api';
import { cn } from '../../utils/cn';

export default function PayoutsSection() {
    const [stats, setStats] = useState({ available: 0, totalEarned: 0, pending: 0, isPayoutReady: false, payoutDisabledReason: null });
    const [connectData, setConnectData] = useState({
        configured: true,
        connected: false,
        payoutsEnabled: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        onboardingStatus: 'not_connected',
        status: 'not_connected',
        message: 'Connect your bank account to receive property rental payouts securely.',
        bankName: null,
        accountNumberLast4: null
    });
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [requestAmount, setRequestAmount] = useState('');
    const [requesting, setRequesting] = useState(false);
    const [message, setMessage] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [summaryRes, historyRes, connectRes] = await Promise.allSettled([
                payoutService.getPayoutSummary(),
                payoutService.getAllPayouts(),
                stripeConnectService.getStatus()
            ]);

            if (summaryRes.status === 'fulfilled') {
                const s = summaryRes.value.data?.data || summaryRes.value.data || {};
                setStats({
                    available: s.available ?? s.availableBalance ?? 0,
                    totalEarned: s.totalEarned ?? 0,
                    pending: s.pending ?? s.totalPending ?? 0,
                    isPayoutReady: s.isPayoutReady ?? false,
                    payoutDisabledReason: s.payoutDisabledReason || null,
                    accountNumberLast4: s.accountNumberLast4 || null,
                    bankName: s.bankName || null,
                });
            }

            if (historyRes.status === 'fulfilled') {
                const h = historyRes.value.data?.data || historyRes.value.data || [];
                setHistory(Array.isArray(h) ? h : []);
            }

            if (connectRes.status === 'fulfilled') {
                const c = connectRes.value.data?.data || connectRes.value.data || {};
                setConnectData({
                    configured: connectRes.value.data?.configured ?? true,
                    connected: connectRes.value.data?.connected ?? false,
                    payoutsEnabled: c.payoutsEnabled ?? false,
                    chargesEnabled: c.chargesEnabled ?? false,
                    detailsSubmitted: c.detailsSubmitted ?? false,
                    onboardingStatus: c.onboardingStatus || 'not_connected',
                    status: c.status || (c.payoutsEnabled ? 'payouts_enabled' : 'not_connected'),
                    message: c.message || connectRes.value.data?.message || 'Connect your bank account to receive property rental payouts securely.',
                    bankName: c.bankName || null,
                    accountNumberLast4: c.accountNumberLast4 || null,
                });
            }
        } catch (error) {
            console.error('Failed to fetch payout data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleConnectStripe = async () => {
        setConnecting(true);
        setMessage(null);
        try {
            const res = await stripeConnectService.getOnboardingLink();
            if (res.data?.url) {
                window.location.href = res.data.url;
            } else {
                setMessage({ type: 'error', text: 'Failed to generate Stripe onboarding link.' });
            }
        } catch (error) {
            const errMsg = error.response?.data?.message || error.message || 'Failed to start Stripe onboarding.';
            setMessage({ type: 'error', text: errMsg });
        } finally {
            setConnecting(false);
        }
    };

    const handleManageStripe = async () => {
        setConnecting(true);
        setMessage(null);
        try {
            const res = await stripeConnectService.getLoginLink();
            if (res.data?.url) {
                window.open(res.data.url, '_blank');
            } else {
                setMessage({ type: 'error', text: 'Failed to generate Stripe management link.' });
            }
        } catch (error) {
            const errMsg = error.response?.data?.message || error.message || 'Failed to open Stripe management.';
            setMessage({ type: 'error', text: errMsg });
        } finally {
            setConnecting(false);
        }
    };

    const handleOpenConfirm = (e) => {
        e.preventDefault();
        setMessage(null);

        if (!connectData.payoutsEnabled) {
            setMessage({ 
                type: 'error', 
                text: connectData.connected 
                    ? 'Stripe payouts are not enabled for this account yet.'
                    : 'Please connect your bank account before requesting a payout.' 
            });
            return;
        }

        const parsed = parseFloat(requestAmount);
        if (!parsed || isNaN(parsed) || parsed < 500) {
            setMessage({ type: 'error', text: 'Minimum payout amount is ₹500.' });
            return;
        }

        if (parsed > stats.available) {
            setMessage({ 
                type: 'error', 
                text: `Insufficient available balance. Available: ₹${stats.available.toLocaleString('en-IN')}` 
            });
            return;
        }

        setShowConfirmModal(true);
    };

    const handleConfirmPayout = async () => {
        const parsed = parseFloat(requestAmount);
        if (!parsed || parsed < 500) return;

        setRequesting(true);
        setMessage(null);
        setShowConfirmModal(false);

        try {
            const res = await payoutService.requestPayout({ 
                amount: parsed,
                idempotencyKey: `PAYOUT_${Date.now()}`
            });
            setMessage({ 
                type: 'success', 
                text: res.data?.message || 'Payout request submitted to your connected bank account!' 
            });
            setRequestAmount('');
            fetchData();
        } catch (error) {
            const errMsg = error.response?.data?.message || error.message || 'Failed to submit payout request.';
            setMessage({ type: 'error', text: errMsg });
        } finally {
            setRequesting(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'paid':
            case 'completed': 
                return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case 'processing':
            case 'approved': 
                return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
            case 'requested':
            case 'pending': 
                return <Clock className="w-4 h-4 text-amber-500" />;
            case 'failed':
            case 'rejected':
            case 'cancelled': 
                return <XCircle className="w-4 h-4 text-rose-500" />;
            default: 
                return <Info className="w-4 h-4 text-muted-foreground" />;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Balance & Bank Payout Account & Request */}
            <div className="lg:col-span-1 space-y-6">
                {/* Available to Withdraw Hero Card */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-xl"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet size={120} />
                    </div>
                    
                    <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">Available to Withdraw</p>
                    <h2 className="text-5xl font-black mb-8">₹{stats.available.toLocaleString('en-IN')}</h2>
                    
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase opacity-60">Total Earned</p>
                            <p className="text-lg font-black">₹{stats.totalEarned.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase opacity-60">Pending</p>
                            <p className="text-lg font-black">₹{stats.pending.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Bank Payout Account Card */}
                <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-blue-500" /> Bank Payout Account
                        </h3>
                        {connectData.payoutsEnabled ? (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Payouts Enabled
                            </span>
                        ) : connectData.connected ? (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                                <Clock className="w-3 h-3" /> Setup Incomplete
                            </span>
                        ) : null}
                    </div>

                    {/* State 5: Payouts Enabled */}
                    {connectData.payoutsEnabled ? (
                        <div className="space-y-3">
                            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-start gap-3">
                                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-emerald-400">✓ Bank account connected</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Payouts are enabled to your connected Stripe account
                                        {connectData.bankName && ` • ${connectData.bankName}`}
                                        {connectData.accountNumberLast4 && ` (•• ${connectData.accountNumberLast4})`}.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleManageStripe}
                                disabled={connecting}
                                className="w-full py-2.5 rounded-xl border border-border bg-card hover:bg-muted/80 text-foreground font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                            >
                                <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                                {connecting ? 'Opening...' : 'Manage Payout Account'}
                            </button>
                        </div>
                    ) : connectData.status === 'verification_pending' ? (
                        /* State 4: Verification Pending */
                        <div className="space-y-3">
                            <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-start gap-3">
                                <Clock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-blue-400">Stripe is verifying your payout account.</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Bank payouts will be enabled automatically as soon as verification completes.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={fetchData}
                                className="w-full py-2.5 rounded-xl border border-border bg-card hover:bg-muted/80 text-foreground font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                                <RefreshCw className="w-3.5 h-3.5 text-blue-500" /> Refresh Status
                            </button>
                        </div>
                    ) : connectData.status === 'verification_required' ? (
                        /* State 3: Verification Required */
                        <div className="space-y-3">
                            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-amber-400">Additional verification is required.</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Stripe requires updated verification details before payouts can be activated.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleConnectStripe}
                                disabled={connecting}
                                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                            >
                                {connecting ? 'Redirecting to Stripe...' : 'Complete Verification'}
                            </button>
                        </div>
                    ) : connectData.connected ? (
                        /* State 2 & 6: Onboarding Incomplete or Payouts Disabled */
                        <div className="space-y-3">
                            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-3">
                                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-amber-400">Stripe payout setup is incomplete.</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Complete your Stripe onboarding to start receiving rental payouts into your bank account.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleConnectStripe}
                                disabled={connecting}
                                className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                            >
                                {connecting ? 'Redirecting to Stripe...' : 'Complete Setup'}
                            </button>
                        </div>
                    ) : (
                        /* State 1: Not Connected */
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Connect your bank account to receive property rental payouts securely via Stripe Connect.
                            </p>
                            <button
                                type="button"
                                onClick={handleConnectStripe}
                                disabled={connecting}
                                className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                            >
                                {connecting ? 'Connecting to Stripe...' : 'Connect Bank Account'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Request Payout Form Card */}
                <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-6">
                    <h3 className="text-sm font-black text-foreground mb-4 flex items-center gap-2">
                        <ArrowDownToLine className="w-4 h-4 text-blue-500" /> Request Payout
                    </h3>
                    
                    <form onSubmit={handleOpenConfirm} className="space-y-4">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black">₹</span>
                            <input 
                                type="number"
                                value={requestAmount}
                                onChange={(e) => setRequestAmount(e.target.value)}
                                placeholder="Min. ₹500"
                                min="500"
                                max={stats.available > 0 ? stats.available : undefined}
                                className="w-full bg-white/5 border border-border rounded-xl py-3 pl-8 pr-4 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            />
                        </div>
                        
                        <button 
                            type="submit"
                            disabled={requesting || !requestAmount || stats.available < 500 || !connectData.payoutsEnabled}
                            className="w-full py-3 rounded-xl bg-blue-500 text-white font-black text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg cursor-pointer"
                        >
                            {requesting ? 'Processing...' : 'Withdraw to Bank'}
                        </button>
                    </form>

                    <AnimatePresence>
                        {message && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className={cn(
                                    "mt-4 p-3 rounded-lg text-xs font-bold flex items-center gap-2",
                                    message.type === 'success' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                )}
                            >
                                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                <span>{message.text}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-3">
                        <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Funds are typically transferred to your connected Stripe bank account within 2-3 business days after approval.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right: History */}
            <div className="lg:col-span-2 space-y-4">
                <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                            <History className="w-4 h-4 text-blue-500" /> Withdrawal History
                        </h3>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
                            ))
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                <History className="w-12 h-12 opacity-20 mb-2" />
                                <p className="text-sm font-bold italic">No payouts requested yet.</p>
                            </div>
                        ) : (
                            history.map((item, i) => (
                                <motion.div 
                                    key={item._id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-transparent hover:border-white/5 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-lg bg-white/5">
                                            <CreditCard className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">₹{(item.amount || 0).toLocaleString('en-IN')}</p>
                                            <p className="text-[10px] text-muted-foreground font-medium">
                                                Requested on {new Date(item.requestedAt || item.createdAt).toLocaleDateString()}
                                                {item.accountNumberLast4 && ` • Account ending in ${item.accountNumberLast4}`}
                                            </p>
                                            {item.failureReason && (
                                                <p className="text-[10px] text-rose-400 font-medium mt-0.5">{item.failureReason}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/5">
                                            {getStatusIcon(item.status)}
                                            <span className="text-[9px] font-black uppercase text-foreground/70">{item.status}</span>
                                        </div>
                                        {(item.completedAt || item.processedAt) && (
                                            <p className="text-[8px] text-muted-foreground italic">
                                                Processed {new Date(item.completedAt || item.processedAt).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Payout Confirmation Modal */}
            <AnimatePresence>
                {showConfirmModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-foreground">Confirm Payout</h3>
                                        <p className="text-xs text-muted-foreground">Withdraw funds to connected bank account</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowConfirmModal(false)}
                                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-3 bg-muted/30 border border-border/60 rounded-2xl p-4">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground font-semibold">Amount to Withdraw:</span>
                                    <span className="text-base font-black text-blue-500">₹{parseFloat(requestAmount || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground font-semibold">Destination:</span>
                                    <span className="font-bold text-foreground">
                                        {connectData.bankName || 'Connected Stripe Bank Account'}
                                        {connectData.accountNumberLast4 && ` (•• ${connectData.accountNumberLast4})`}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs border-t border-border/40 pt-2">
                                    <span className="text-muted-foreground font-semibold">Available Balance:</span>
                                    <span className="font-bold text-foreground">₹{stats.available.toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                This payout will be processed securely through your connected Stripe account and transferred directly to your external bank account.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-bold text-xs transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmPayout}
                                    disabled={requesting}
                                    className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs transition-all shadow-lg disabled:opacity-50 cursor-pointer"
                                >
                                    {requesting ? 'Submitting...' : 'Confirm Withdrawal'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}



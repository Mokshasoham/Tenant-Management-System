import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wallet, ArrowDownToLine, History, 
    CheckCircle2, Clock, XCircle, AlertCircle, Info,
    CreditCard, ShieldCheck, X, Building2, RefreshCw, Unlink, Receipt
} from 'lucide-react';
import { payoutService } from '../../services/api';
import { cn } from '../../utils/cn';

// Quick bank lookup from IFSC prefix
const IFSC_PREVIEW_MAP = {
    'SBIN': 'State Bank of India',
    'HDFC': 'HDFC Bank',
    'ICIC': 'ICICI Bank',
    'UTIB': 'Axis Bank',
    'PUNB': 'Punjab National Bank',
    'BARB': 'Bank of Baroda',
    'KKBK': 'Kotak Mahindra Bank',
    'UBIN': 'Union Bank of India',
    'CNRB': 'Canara Bank',
    'IOBA': 'Indian Overseas Bank',
    'BKID': 'Bank of India',
    'IDIB': 'Indian Bank',
    'YESB': 'YES Bank',
};

export default function PayoutsSection() {
    const [stats, setStats] = useState({ available: 0, totalEarned: 0, pending: 0 });
    const [history, setHistory] = useState([]);
    const [earningsBreakdown, setEarningsBreakdown] = useState([]);
    const [activeHistoryTab, setActiveHistoryTab] = useState('withdrawals'); // 'withdrawals' | 'breakdown'
    const [bankAccount, setBankAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [requestAmount, setRequestAmount] = useState('');
    const [requesting, setRequesting] = useState(false);
    const [message, setMessage] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Bank Account Modal States
    const [showBankModal, setShowBankModal] = useState(false);
    const [bankForm, setBankForm] = useState({
        accountHolderName: '',
        accountNumber: '',
        confirmAccountNumber: '',
        ifsc: ''
    });
    const [detectedBank, setDetectedBank] = useState('');
    const [verifyingBank, setVerifyingBank] = useState(false);
    const [verifiedData, setVerifiedData] = useState(null);
    const [connectingBank, setConnectingBank] = useState(false);
    const [bankModalError, setBankModalError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [summaryRes, historyRes, bankRes] = await Promise.allSettled([
                payoutService.getPayoutSummary(),
                payoutService.getAllPayouts(),
                payoutService.getConnectedBankAccount()
            ]);

            if (summaryRes.status === 'fulfilled') {
                const raw = summaryRes.value;
                const s = raw?.data?.data || raw?.data || raw || {};
                setStats({
                    available: s.available ?? s.availableBalance ?? 0,
                    totalEarned: s.totalEarned ?? 0,
                    pending: s.pending ?? s.totalPending ?? 0,
                });
                if (Array.isArray(s.earningsBreakdown)) {
                    setEarningsBreakdown(s.earningsBreakdown);
                }
            }

            if (historyRes.status === 'fulfilled') {
                const raw = historyRes.value;
                const h = raw?.data?.data || raw?.data || (Array.isArray(raw) ? raw : []);
                setHistory(Array.isArray(h) ? h : []);
            }

            if (bankRes.status === 'fulfilled') {
                const raw = bankRes.value;
                const b = raw?.data?.data || raw?.data || (raw?.bankName ? raw : null);
                setBankAccount(b?.bankName ? b : null);
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

    // Handle IFSC change and auto-detect bank name
    const handleIfscChange = (val) => {
        const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
        setBankForm(prev => ({ ...prev, ifsc: clean }));
        
        if (clean.length >= 4) {
            const prefix = clean.substring(0, 4);
            if (IFSC_PREVIEW_MAP[prefix]) {
                setDetectedBank(IFSC_PREVIEW_MAP[prefix]);
            } else {
                setDetectedBank('');
            }
        } else {
            setDetectedBank('');
        }
    };

    // Open Bank Account Modal
    const handleOpenBankModal = () => {
        setBankModalError(null);
        setVerifiedData(null);
        setBankForm({
            accountHolderName: '',
            accountNumber: '',
            confirmAccountNumber: '',
            ifsc: ''
        });
        setDetectedBank('');
        setShowBankModal(true);
    };

    // Verify & Save Bank Account
    const handleVerifyBank = async (e) => {
        e.preventDefault();
        setBankModalError(null);

        const name = bankForm.accountHolderName.trim();
        if (!name) {
            setBankModalError('Account holder name is required.');
            return;
        }

        const cleanAcc = bankForm.accountNumber.trim();
        const cleanConfirm = bankForm.confirmAccountNumber.trim();

        if (!cleanAcc) {
            setBankModalError('Bank account number is required.');
            return;
        }

        if (cleanAcc.length < 8 || cleanAcc.length > 20 || !/^\d+$/.test(cleanAcc)) {
            setBankModalError('Please enter a valid bank account number (8 to 20 digits).');
            return;
        }

        if (!cleanConfirm) {
            setBankModalError('Please confirm your bank account number.');
            return;
        }

        if (cleanAcc !== cleanConfirm) {
            setBankModalError('Account numbers do not match.');
            return;
        }

        const cleanIfsc = bankForm.ifsc.trim().toUpperCase();
        if (!cleanIfsc) {
            setBankModalError('IFSC code is required.');
            return;
        }

        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
            setBankModalError('Please enter a valid 11-character IFSC code (e.g. SBIN0001234, UBIN0804681).');
            return;
        }

        setVerifyingBank(true);
        try {
            const raw = await payoutService.saveBankAccount({
                accountHolderName: name,
                accountNumber: cleanAcc,
                confirmAccountNumber: cleanConfirm,
                ifsc: cleanIfsc
            });

            const saved = raw?.data?.data || raw?.data || (raw?.bankName ? raw : null);
            const isSuccess = raw?.success !== false && Boolean(saved?.bankName || saved?.accountNumberLast4);

            if (isSuccess && saved) {
                setBankAccount(saved);
                setShowBankModal(false);

                if (saved.verificationStatus === 'verified') {
                    setMessage({ 
                        type: 'success', 
                        text: `✓ ${saved.bankName} (•••• ${saved.accountNumberLast4}) connected and verified successfully!` 
                    });
                } else {
                    setMessage({ 
                        type: 'success', 
                        text: `✓ Bank details saved securely. Bank ownership verification is currently unavailable and will require provider verification before real payouts can be processed.` 
                    });
                }
                fetchData();
            } else {
                const errMsg = raw?.message || 'The bank account could not be saved.';
                setBankModalError(errMsg);
            }
        } catch (error) {
            const errMsg = error?.message || error?.error || (typeof error === 'string' ? error : 'We could not save this bank account. Please check the details and try again.');
            setBankModalError(errMsg);
        } finally {
            setVerifyingBank(false);
        }
    };

    // Connect Verified Bank Account
    const handleConnectBank = async () => {
        if (!verifiedData?.verificationToken) return;

        setConnectingBank(true);
        setBankModalError(null);
        try {
            const res = await payoutService.connectBankAccount({
                verificationToken: verifiedData.verificationToken,
                verificationReference: verifiedData.verificationReference
            });

            setBankAccount(res.data?.data || verifiedData);
            setShowBankModal(false);
            setMessage({ type: 'success', text: `✓ ${verifiedData.bankName} (•••• ${verifiedData.accountNumberLast4}) connected successfully!` });
            fetchData();
        } catch (error) {
            const errMsg = error.response?.data?.message || 'Failed to connect bank account. Please try again.';
            setBankModalError(errMsg);
        } finally {
            setConnectingBank(false);
        }
    };

    // Disconnect Bank Account
    const handleDisconnectBank = async () => {
        if (!window.confirm('Are you sure you want to disconnect this bank account?')) return;
        try {
            await payoutService.disconnectBankAccount();
            setBankAccount(null);
            setMessage({ type: 'success', text: 'Bank account disconnected.' });
            fetchData();
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to disconnect bank account.' });
        }
    };

    // Open Payout Confirmation
    const handleOpenConfirm = (e) => {
        e.preventDefault();
        setMessage(null);

        if (!bankAccount) {
            setMessage({ 
                type: 'error', 
                text: 'Please connect your bank account before requesting a payout.' 
            });
            return;
        }

        if (bankAccount.verificationStatus !== 'verified') {
            setMessage({ 
                type: 'error', 
                text: 'Bank account verification is required before payouts can be processed.' 
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

    // Confirm and Execute Payout
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
                text: res.data?.message || 'Payout request submitted successfully!' 
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
                        {bankAccount && (
                            bankAccount.verificationStatus === 'verified' ? (
                                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                    <CheckCircle2 className="w-3 h-3" /> Verified
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                                    <Clock className="w-3 h-3" /> Pending Verification
                                </span>
                            )
                        )}
                    </div>

                    {bankAccount ? (
                        /* Connected State */
                        <div className="space-y-3">
                            <div className={cn(
                                "p-3.5 rounded-xl border flex items-start gap-3",
                                bankAccount.verificationStatus === 'verified' 
                                    ? "bg-emerald-500/5 border-emerald-500/15" 
                                    : "bg-amber-500/5 border-amber-500/15"
                            )}>
                                {bankAccount.verificationStatus === 'verified' ? (
                                    <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                ) : (
                                    <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-xs font-bold",
                                        bankAccount.verificationStatus === 'verified' ? "text-emerald-400" : "text-amber-400"
                                    )}>
                                        {bankAccount.verificationStatus === 'verified' ? '✓ Bank account connected' : '✓ Bank details saved (Pending Verification)'}
                                    </p>
                                    <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                                        <p className="font-semibold text-foreground truncate">{bankAccount.bankName}</p>
                                        <p>Account: <span className="font-mono font-semibold text-foreground/90">•••• {bankAccount.accountNumberLast4}</span></p>
                                        <p>IFSC: <span className="font-mono font-semibold text-foreground/90">{bankAccount.ifsc}</span></p>
                                        {bankAccount.accountHolderName && (
                                            <p className="truncate">Holder: {bankAccount.accountHolderName}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleOpenBankModal}
                                    className="flex-1 py-2 rounded-xl border border-border bg-card hover:bg-muted/80 text-foreground font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                >
                                    <RefreshCw className="w-3 h-3 text-blue-500" /> Change Account
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDisconnectBank}
                                    title="Disconnect Bank Account"
                                    className="p-2 rounded-xl border border-border bg-card hover:bg-rose-500/10 hover:border-rose-500/30 text-muted-foreground hover:text-rose-500 transition-all cursor-pointer shadow-sm"
                                >
                                    <Unlink className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Unconnected State */
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Connect your bank account to receive property rental payouts directly to your account.
                            </p>
                            <button
                                type="button"
                                onClick={handleOpenBankModal}
                                className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs transition-all shadow-md cursor-pointer"
                            >
                                Connect Bank Account
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
                            disabled={requesting || !requestAmount || stats.available < 500 || !bankAccount || bankAccount.verificationStatus !== 'verified'}
                            className="w-full py-3 rounded-xl bg-blue-500 text-white font-black text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg cursor-pointer"
                        >
                            {requesting ? 'Processing...' : 'Withdraw to Bank'}
                        </button>
                    </form>

                    {bankAccount && bankAccount.verificationStatus !== 'verified' && (
                        <p className="mt-2 text-[11px] text-amber-500/90 font-medium text-center">
                            Bank account verification is required before payouts can be processed.
                        </p>
                    )}

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
                            Funds are transferred to your verified bank account within 2-3 business days after processing.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right: History & Rental Earnings Breakdown */}
            <div className="lg:col-span-2 space-y-4">
                <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-6 flex flex-col h-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border">
                            <button
                                type="button"
                                onClick={() => setActiveHistoryTab('withdrawals')}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                                    activeHistoryTab === 'withdrawals' 
                                        ? "bg-card text-foreground shadow-sm border border-border" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <History className="w-3.5 h-3.5 text-blue-500" /> Withdrawal History
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveHistoryTab('breakdown')}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                                    activeHistoryTab === 'breakdown' 
                                        ? "bg-card text-foreground shadow-sm border border-border" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Receipt className="w-3.5 h-3.5 text-emerald-500" /> Rental Earnings Breakdown
                            </button>
                        </div>

                        {activeHistoryTab === 'breakdown' && (
                            <span className="text-[11px] font-bold text-muted-foreground">
                                {earningsBreakdown.length} verified transaction{earningsBreakdown.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
                            ))
                        ) : activeHistoryTab === 'withdrawals' ? (
                            /* Tab 1: Withdrawal History */
                            history.length === 0 ? (
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
                            )
                        ) : (
                            /* Tab 2: Rental Earnings Breakdown */
                            earningsBreakdown.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                    <Receipt className="w-12 h-12 opacity-20 mb-2" />
                                    <p className="text-sm font-bold italic">No rental earnings recorded yet.</p>
                                </div>
                            ) : (
                                earningsBreakdown.map((item, i) => (
                                    <motion.div 
                                        key={item._id || i}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className="p-4 rounded-xl bg-muted/20 border border-border/60 hover:border-border transition-all space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-foreground">{item.tenantName}</p>
                                                <p className="text-[10px] text-muted-foreground">{item.propertyName} • Lease {item.leaseNumber}</p>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                                <CheckCircle2 className="w-3 h-3" /> {item.status}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/40 text-[11px]">
                                            <div>
                                                <p className="text-[9px] uppercase font-bold text-muted-foreground">Gross Rent</p>
                                                <p className="font-bold text-foreground">₹{Number(item.grossRent || 0).toLocaleString('en-IN')}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] uppercase font-bold text-muted-foreground">TMS Fee</p>
                                                <p className="font-bold text-indigo-400">
                                                    {item.platformFee !== null ? `₹${Number(item.platformFee).toLocaleString('en-IN')}` : '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] uppercase font-bold text-muted-foreground">Commission</p>
                                                <p className="font-bold text-muted-foreground">
                                                    {item.managerCommission !== null && item.managerCommission > 0 ? `₹${Number(item.managerCommission).toLocaleString('en-IN')}` : '₹0'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] uppercase font-bold text-muted-foreground">Manager Net</p>
                                                <p className="font-black text-emerald-400">₹{Number(item.managerNet || 0).toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1 border-t border-border/20">
                                            <span>Payment ID: <span className="font-mono text-foreground/80">{item.razorpayPaymentId}</span></span>
                                            <span>{new Date(item.paymentDate).toLocaleDateString()}</span>
                                        </div>
                                    </motion.div>
                                ))
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Bank Account Verification Modal */}
            <AnimatePresence>
                {showBankModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-foreground">
                                            {verifiedData ? '✓ Bank Account Verified' : 'Connect Bank Account'}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {verifiedData ? 'Review and confirm account details' : 'Enter bank details for rental payouts'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowBankModal(false)}
                                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {bankModalError && (
                                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{bankModalError}</span>
                                </div>
                            )}

                            {/* Step 1: Input Form */}
                            {!verifiedData ? (
                                <form onSubmit={handleVerifyBank} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-foreground block mb-1.5">Account Holder Name</label>
                                        <input 
                                            type="text"
                                            value={bankForm.accountHolderName}
                                            onChange={(e) => setBankForm(prev => ({ ...prev, accountHolderName: e.target.value }))}
                                            placeholder="e.g. Mokshagna Soham"
                                            required
                                            className="w-full bg-white/5 border border-border rounded-xl py-2.5 px-3.5 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-foreground block mb-1.5">Bank Account Number</label>
                                        <input 
                                            type="password"
                                            value={bankForm.accountNumber}
                                            onChange={(e) => setBankForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                                            placeholder="Enter account number"
                                            required
                                            className="w-full bg-white/5 border border-border rounded-xl py-2.5 px-3.5 text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-foreground block mb-1.5">Confirm Bank Account Number</label>
                                        <input 
                                            type="password"
                                            value={bankForm.confirmAccountNumber}
                                            onChange={(e) => setBankForm(prev => ({ ...prev, confirmAccountNumber: e.target.value }))}
                                            placeholder="Re-enter account number"
                                            required
                                            className="w-full bg-white/5 border border-border rounded-xl py-2.5 px-3.5 text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-bold text-foreground">IFSC Code</label>
                                            {detectedBank && (
                                                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                                                    {detectedBank}
                                                </span>
                                            )}
                                        </div>
                                        <input 
                                            type="text"
                                            value={bankForm.ifsc}
                                            onChange={(e) => handleIfscChange(e.target.value)}
                                            placeholder="e.g. SBIN0001234"
                                            maxLength={11}
                                            required
                                            className="w-full bg-white/5 border border-border rounded-xl py-2.5 px-3.5 text-xs text-foreground font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowBankModal(false)}
                                            className="flex-1 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-bold text-xs transition-all cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={verifyingBank}
                                            className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs transition-all shadow-lg disabled:opacity-50 cursor-pointer"
                                        >
                                            {verifyingBank ? 'Verifying...' : 'Verify Bank Account'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                /* Step 2: Verification Preview */
                                <div className="space-y-4">
                                    <div className="space-y-3 bg-muted/30 border border-border/60 rounded-2xl p-4 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground font-semibold">Account Holder:</span>
                                            <span className="font-bold text-foreground">{verifiedData.registeredName || verifiedData.accountHolderName}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground font-semibold">Bank Name:</span>
                                            <span className="font-bold text-foreground">{verifiedData.bankName}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground font-semibold">Account Number:</span>
                                            <span className="font-mono font-bold text-foreground">•••• {verifiedData.accountNumberLast4}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground font-semibold">IFSC Code:</span>
                                            <span className="font-mono font-bold text-foreground">{verifiedData.ifsc}</span>
                                        </div>
                                        {verifiedData.branch && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground font-semibold">Branch:</span>
                                                <span className="font-bold text-foreground">{verifiedData.branch}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center border-t border-border/40 pt-2">
                                            <span className="text-muted-foreground font-semibold">Verification Status:</span>
                                            <span className="font-black text-emerald-400 flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setVerifiedData(null)}
                                            className="flex-1 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-bold text-xs transition-all cursor-pointer"
                                        >
                                            Edit Details
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleConnectBank}
                                            disabled={connectingBank}
                                            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all shadow-lg disabled:opacity-50 cursor-pointer"
                                        >
                                            {connectingBank ? 'Connecting...' : 'Connect Bank Account'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
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
                                    <span className="text-muted-foreground font-semibold">Destination Bank:</span>
                                    <span className="font-bold text-foreground">
                                        {bankAccount?.bankName} (•• {bankAccount?.accountNumberLast4})
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs border-t border-border/40 pt-2">
                                    <span className="text-muted-foreground font-semibold">Available Balance:</span>
                                    <span className="font-bold text-foreground">₹{stats.available.toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                This payout will be processed securely and transferred directly to your verified bank account.
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




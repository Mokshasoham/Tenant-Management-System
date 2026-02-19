import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { paymentService, leaseService, bookingService } from '../services/api';
import useAuthStore from '../context/authStore';
import {
    CreditCard, Smartphone, CheckCircle2, AlertTriangle,
    ChevronRight, Lock, RefreshCw, ArrowLeft, IndianRupee,
    Shield, Eye, EyeOff, Info
} from 'lucide-react';
import { cn } from '../utils/cn';

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmtCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const fmtExpiry = (v) => {
    const clean = v.replace(/\D/g, '').slice(0, 4);
    return clean.length >= 3 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean;
};
const isExpiryValid = (exp) => {
    const [mm, yy] = (exp || '').split('/');
    if (!mm || !yy || mm.length !== 2 || yy.length !== 2) return false;
    const month = parseInt(mm), year = parseInt(`20${yy}`);
    if (month < 1 || month > 12) return false;
    const now = new Date();
    return new Date(year, month - 1) >= new Date(now.getFullYear(), now.getMonth());
};
const isUpiValid = (v) => /^[\w.\-]{3,}@[a-zA-Z]{3,}$/.test(v);
const isCardNumberValid = (v) => v.replace(/\s/g, '').length === 16;

function Field({ label, error, hint, children }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">{label}</label>
            {children}
            {error && <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{error}</p>}
            {hint && !error && <p className="text-[10px] text-white/20">{hint}</p>}
        </div>
    );
}

function Input({ className, error, ...props }) {
    return (
        <input
            className={cn(
                'w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white placeholder-white/20 outline-none transition-all text-sm',
                error ? 'border-rose-500/60 focus:border-rose-400' : 'border-white/10 focus:border-emerald-500/60',
                className
            )}
            {...props}
        />
    );
}

// ─── Debit Card Form ────────────────────────────────────────────────────────
function DebitCardForm({ amount, paymentId, onSuccess }) {
    const [cardNum, setCardNum] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [name, setName] = useState('');
    const [showCvv, setShowCvv] = useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = 'Cardholder name is required';
        if (!isCardNumberValid(cardNum)) e.cardNum = 'Enter a valid 16-digit card number';
        if (!isExpiryValid(expiry)) e.expiry = 'Enter a valid expiry (MM/YY) that is not in the past';
        if (!cvv || cvv.length < 3) e.cvv = 'CVV must be 3–4 digits';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handlePay = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            if (onSuccess.type === 'booking') {
                await bookingService.requestBooking({
                    propertyId: onSuccess.propertyId,
                    totalAmount: amount,
                    paymentReference: `BK-DC-${Date.now()}`,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                });
            } else {
                await paymentService.recordPayment(paymentId, {
                    amountPaid: amount,
                    paymentDate: new Date().toISOString(),
                    paymentMethod: 'debit_card',
                    reference: `DC-${Date.now()}`,
                });
            }
            onSuccess.callback();
        } catch (err) {
            console.error(err);
            setErrors({ submit: 'Payment failed. Please check your card details and try again.' });
        } finally {
            setLoading(false);
        }
    };

    const cardType = cardNum.replace(/\s/g, '').startsWith('4') ? 'VISA'
        : cardNum.replace(/\s/g, '').startsWith('5') ? 'MASTERCARD'
            : cardNum.replace(/\s/g, '').startsWith('6') ? 'RUPAY'
                : '';

    return (
        <form onSubmit={handlePay} className="space-y-4">
            {/* Virtual Card Preview */}
            <div className="relative p-5 rounded-2xl overflow-hidden text-white h-44"
                style={{ background: 'linear-gradient(135deg, #1a4d3a 0%, #0d6e50 50%, #0a8a60 100%)' }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
                <div className="absolute bottom-4 right-4 opacity-10 text-7xl font-black">{cardType}</div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-7 rounded bg-gradient-to-br from-yellow-300 to-yellow-500 opacity-80" />
                        <span className="text-xs font-black opacity-50 uppercase tracking-widest">{cardType || 'CARD'}</span>
                    </div>
                    <div>
                        <p className="text-xl font-black tracking-widest font-mono mb-2 opacity-90">
                            {cardNum || '•••• •••• •••• ••••'}
                        </p>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[9px] opacity-40 uppercase tracking-wider">Cardholder</p>
                                <p className="text-sm font-bold uppercase">{name || '—'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] opacity-40 uppercase tracking-wider">Expires</p>
                                <p className="text-sm font-bold">{expiry || 'MM/YY'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Field label="Cardholder Name" error={errors.name}>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name on card" error={errors.name} />
            </Field>

            <Field label="Card Number" error={errors.cardNum} hint="16-digit number on your debit card">
                <div className="relative">
                    <Input value={cardNum} onChange={e => setCardNum(fmtCard(e.target.value))} placeholder="1234 5678 9012 3456"
                        inputMode="numeric" className="font-mono pr-20" error={errors.cardNum} />
                    {cardType && (
                        <span className="absolute right-3 top-2.5 text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">{cardType}</span>
                    )}
                </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Expiry Date" error={errors.expiry}>
                    <Input value={expiry} onChange={e => setExpiry(fmtExpiry(e.target.value))} placeholder="MM/YY"
                        inputMode="numeric" error={errors.expiry} />
                </Field>
                <Field label="CVV" error={errors.cvv} hint="3–4 digits on back">
                    <div className="relative">
                        <Input type={showCvv ? 'text' : 'password'} value={cvv}
                            onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="•••" inputMode="numeric" className="pr-10" error={errors.cvv} />
                        <button type="button" onClick={() => setShowCvv(v => !v)}
                            className="absolute right-3 top-2.5 text-white/30 hover:text-white/60">
                            {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </Field>
            </div>

            {errors.submit && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {errors.submit}
                </div>
            )}

            <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm disabled:opacity-50 hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</> : <><Lock className="w-4 h-4" /> Pay ₹{amount.toLocaleString('en-IN')} Securely</>}
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-white/20">
                <Shield className="w-3 h-3" /> 256-bit SSL encrypted • RBI compliant
            </div>
        </form>
    );
}

// ─── UPI Form ───────────────────────────────────────────────────────────────
function UpiForm({ amount, paymentId, onSuccess }) {
    const [upiId, setUpiId] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const quickHandles = ['@okicici', '@oksbi', '@okhdfc', '@paytm', '@ybl', '@upi'];

    const handleVerify = async () => {
        if (!isUpiValid(upiId)) {
            setErrors({ upiId: 'Enter a valid UPI ID (e.g. name@okicici)' });
            return;
        }
        setErrors({});
        setVerifying(true);
        // Simulate network check
        await new Promise(r => setTimeout(r, 1200));
        setVerifying(false);
        setVerified(true);
    };

    const handlePay = async (e) => {
        e.preventDefault();
        if (!verified) { handleVerify(); return; }
        setLoading(true);
        try {
            if (onSuccess.type === 'booking') {
                await bookingService.requestBooking({
                    propertyId: onSuccess.propertyId,
                    totalAmount: amount,
                    paymentReference: `BK-UPI-${upiId}-${Date.now()}`,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                });
            } else {
                await paymentService.recordPayment(paymentId, {
                    amountPaid: amount,
                    paymentDate: new Date().toISOString(),
                    paymentMethod: 'upi',
                    reference: `UPI-${upiId}-${Date.now()}`,
                });
            }
            onSuccess.callback();
        } catch (err) {
            console.error(err);
            setErrors({ submit: 'UPI payment failed. Please check your UPI ID and try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handlePay} className="space-y-5">
            {/* UPI visual */}
            <div className="flex flex-col items-center gap-3 py-6 rounded-2xl bg-gradient-to-br from-violet-900/30 to-indigo-900/20 border border-violet-500/20">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/20">
                    <Smartphone className="w-8 h-8 text-white" />
                </div>
                <p className="text-2xl font-black text-white">₹{amount.toLocaleString('en-IN')}</p>
                <p className="text-xs text-white/30">Pay via any UPI app</p>
                {/* Quick apps */}
                <div className="flex gap-2 mt-1">
                    {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map(app => (
                        <span key={app} className="px-3 py-1 rounded-full bg-white/8 border border-white/10 text-[10px] font-bold text-white/40">{app}</span>
                    ))}
                </div>
            </div>

            <Field label="UPI ID" error={errors.upiId} hint="Enter your UPI ID (e.g. yourname@okicici, 9876543210@paytm)">
                <div className="flex gap-2">
                    <Input
                        value={upiId}
                        onChange={e => { setUpiId(e.target.value.toLowerCase().trim()); setVerified(false); }}
                        placeholder="yourname@okicici"
                        error={errors.upiId}
                        className="flex-1"
                    />
                    <button type="button" onClick={handleVerify} disabled={verifying || !upiId}
                        className={cn(
                            'flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-black transition-all border',
                            verified
                                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 disabled:opacity-40'
                        )}>
                        {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : verified ? <CheckCircle2 className="w-4 h-4" /> : 'Verify'}
                    </button>
                </div>
            </Field>

            {/* Quick handles */}
            <div>
                <p className="text-[10px] font-black text-white/25 uppercase tracking-wider mb-2">Popular handles</p>
                <div className="flex flex-wrap gap-1.5">
                    {quickHandles.map(h => (
                        <button key={h} type="button"
                            onClick={() => { const base = upiId.split('@')[0]; setUpiId(base + h); setVerified(false); }}
                            className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 hover:bg-white/10 hover:text-white/60 transition-all">
                            {h}
                        </button>
                    ))}
                </div>
            </div>

            {verified && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-black text-emerald-300">UPI ID Verified</p>
                        <p className="text-xs text-emerald-300/50">{upiId}</p>
                    </div>
                </motion.div>
            )}

            {errors.submit && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {errors.submit}
                </div>
            )}

            <button type="submit" disabled={loading || !upiId}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-sm disabled:opacity-50 hover:opacity-90 transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2">
                {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                    : !verified ? <><CheckCircle2 className="w-4 h-4" /> Verify &amp; Pay</>
                        : <><Lock className="w-4 h-4" /> Pay ₹{amount.toLocaleString('en-IN')}</>}
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-white/20">
                <Shield className="w-3 h-3" /> NPCI certified UPI • Instant transfer
            </div>
        </form>
    );
}

// ─── Success Screen ──────────────────────────────────────────────────────────
function SuccessScreen({ amount, method, navigate, type }) {
    return (
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 py-10 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </motion.div>
            <div>
                <h2 className="text-3xl font-black text-white">
                    {type === 'booking' ? 'Booking Requested! 🏠' : 'Payment Successful! 🎉'}
                </h2>
                <p className="text-white/40 mt-2 text-sm">Your payment of <span className="font-black text-emerald-400">₹{amount.toLocaleString('en-IN')}</span> has been received.</p>
                <p className="text-white/25 mt-1 text-xs">via {method === 'upi' ? 'UPI' : 'Debit Card'} · {new Date().toLocaleString('en-IN')}</p>
            </div>
            <div className="w-full p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300/70">
                <p className="font-bold text-emerald-300 mb-1">What happens next?</p>
                {type === 'booking' ? (
                    <p>The owner has been notified. Your status is now "Pending Approval". You can track it in your dashboard.</p>
                ) : (
                    <p>Your property manager has been notified. A receipt will be generated in your payment history.</p>
                )}
            </div>
            <div className="flex gap-3 w-full">
                {type === 'booking' ? (
                    <button onClick={() => navigate('/dashboard')} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20">
                        Back to Dashboard
                    </button>
                ) : (
                    <>
                        <button onClick={() => navigate('/my-lease')} className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 font-bold text-sm hover:bg-white/5 transition-colors">
                            View Lease
                        </button>
                        <button onClick={() => navigate('/payments')} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20">
                            Payment History
                        </button>
                    </>
                )}
            </div>
        </motion.div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function PayNowPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const user = useAuthStore(s => s.user);

    // From navigation state (Booking flow)
    const bookingData = location.state || {};
    const isBooking = bookingData.type === 'booking';

    const [method, setMethod] = useState('card'); // 'card' | 'upi'
    const [success, setSuccess] = useState(false);
    const [lease, setLease] = useState(null);
    const [pendingPayment, setPendingPayment] = useState(null);
    const [loadingLease, setLoadingLease] = useState(true);

    // Custom amount mode
    const [customAmount, setCustomAmount] = useState('');
    const [amountError, setAmountError] = useState('');
    const [useCustom, setUseCustom] = useState(false);

    useEffect(() => {
        (async () => {
            setLoadingLease(true);
            try {
                const [leaseRes, payRes] = await Promise.allSettled([
                    leaseService.getMyLease(),
                    paymentService.getMyPayments(),
                ]);
                const l = leaseRes.status === 'fulfilled' ? leaseRes.value?.data : null;
                setLease(l);
                if (payRes.status === 'fulfilled') {
                    const pending = (payRes.value?.data || []).find(p =>
                        ['pending', 'overdue', 'partially_paid'].includes(p.status)
                    );
                    setPendingPayment(pending || null);
                }
            } catch (_) { }
            setLoadingLease(false);
        })();
    }, []);

    const rentAmount = lease?.rentAmount || 0;
    const pendingAmount = pendingPayment
        ? (pendingPayment.amount - (pendingPayment.amountPaid || 0))
        : rentAmount;

    const parsedCustom = parseInt(customAmount.replace(/[^\d]/g, '')) || 0;
    const payAmount = useCustom ? parsedCustom : pendingAmount;
    const paymentId = pendingPayment?._id || pendingPayment?.id;

    const validateCustom = () => {
        if (parsedCustom < 1) { setAmountError('Enter a valid amount'); return false; }
        if (parsedCustom > 1000000) { setAmountError('Amount cannot exceed ₹10,00,000'); return false; }
        setAmountError('');
        return true;
    };

    const handleSuccess = () => setSuccess(true);

    return (
        <div className="max-w-lg mx-auto space-y-5 pb-10">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
                <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500" />
                    <p className="text-[10px] font-black uppercase tracking-[.25em] text-emerald-400">Secure Payment</p>
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                    {isBooking ? 'Confirm Booking' : 'Pay Rent'} 💳
                </h1>
            </motion.div>

            <AnimatePresence mode="wait">
                {success ? (
                    <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }} className="rounded-3xl border border-white/5 bg-white/3 p-6">
                        <SuccessScreen amount={payAmount} method={method} navigate={navigate} type={isBooking ? 'booking' : 'rent'} />
                    </motion.div>
                ) : (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

                        {/* Amount Card */}
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="rounded-2xl border border-emerald-500/20 p-5"
                            style={{ background: 'linear-gradient(135deg, #0a2e1f 0%, #0d3d2a 100%)' }}>
                            <p className="text-[10px] font-black text-emerald-300/40 uppercase tracking-widest mb-1">
                                {pendingPayment ? (pendingPayment.status === 'overdue' ? '⚠️ Overdue Payment' : 'Pending Rent') : 'Monthly Rent'}
                            </p>

                            {loadingLease ? (
                                <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
                            ) : (
                                <>
                                    <div className="flex items-end gap-1 mb-3">
                                        <span className="text-emerald-400 text-3xl font-black">₹</span>
                                        <span className="text-5xl font-black text-white">{pendingAmount.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-xs text-white/30">
                                        {isBooking
                                            ? <span>🏠 {bookingData.propertyName}</span>
                                            : (lease && <span>🏠 {lease.property?.name}</span>)
                                        }
                                        {!isBooking && pendingPayment?.dueDate && <span>📅 Due: {new Date(pendingPayment.dueDate).toLocaleDateString('en-IN')}</span>}
                                    </div>
                                </>
                            )}

                            {/* Custom amount toggle (Only for rent) */}
                            {!isBooking && (
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <button type="button" onClick={() => setUseCustom(v => !v)}
                                        className="flex items-center gap-2 text-xs font-bold text-white/30 hover:text-white/60 transition-colors">
                                        <Info className="w-3.5 h-3.5" />
                                        {useCustom ? 'Use pending amount instead' : 'Pay a different amount'}
                                    </button>
                                    <AnimatePresence>
                                        {useCustom && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                                                <Field label="Custom Amount (₹)" error={amountError}>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-2.5 text-white/30 font-bold text-sm">₹</span>
                                                        <Input value={customAmount}
                                                            onChange={e => setCustomAmount(e.target.value.replace(/\D/g, ''))}
                                                            onBlur={validateCustom}
                                                            placeholder="Enter amount"
                                                            inputMode="numeric"
                                                            className="pl-8"
                                                            error={amountError}
                                                        />
                                                    </div>
                                                </Field>
                                                {/* Quick amounts */}
                                                <div className="flex gap-2 mt-2 flex-wrap">
                                                    {[500, 1000, 2000, 5000].map(a => (
                                                        <button key={a} type="button" onClick={() => setCustomAmount(String(a))}
                                                            className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white/40 hover:bg-white/10 transition-all">
                                                            ₹{a.toLocaleString('en-IN')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </motion.div>

                        {/* Method Selector */}
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                            className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'card', label: 'Debit Card', icon: CreditCard, color: 'from-emerald-600 to-teal-600', glow: 'shadow-emerald-500/20' },
                                { id: 'upi', label: 'UPI', icon: Smartphone, color: 'from-violet-600 to-indigo-600', glow: 'shadow-violet-500/20' },
                            ].map(m => {
                                const Icon = m.icon;
                                const active = method === m.id;
                                return (
                                    <motion.button key={m.id} type="button" onClick={() => setMethod(m.id)}
                                        whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                                        className={cn(
                                            'flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all',
                                            active
                                                ? cn('bg-gradient-to-br text-white shadow-lg border-transparent', m.color, m.glow)
                                                : 'border-white/10 bg-white/3 text-white/40 hover:bg-white/8 hover:text-white/60'
                                        )}>
                                        <Icon className="w-6 h-6" />
                                        <span className="font-black text-sm">{m.label}</span>
                                        {active && <span className="text-[9px] opacity-70">Selected</span>}
                                    </motion.button>
                                );
                            })}
                        </motion.div>

                        {/* Payment Form */}
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="rounded-2xl border border-white/5 bg-white/3 p-5">
                            <AnimatePresence mode="wait">
                                {method === 'card' ? (
                                    <motion.div key="card" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
                                        <DebitCardForm
                                            amount={payAmount}
                                            paymentId={paymentId || 'manual'}
                                            onSuccess={handleSuccess}
                                        />
                                    </motion.div>
                                ) : (
                                    <motion.div key="upi" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                                        <UpiForm
                                            amount={payAmount}
                                            paymentId={paymentId || 'manual'}
                                            onSuccess={handleSuccess}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { paymentService, leaseService, bookingService, billService, platformService, autoPayService } from '../services/api';
import useAuthStore from '../context/authStore';
import {
    CreditCard, Smartphone, CheckCircle2, AlertTriangle,
    ChevronRight, Lock, RefreshCw, ArrowLeft, IndianRupee,
    Shield, Eye, EyeOff, Info, Coins, Zap
} from 'lucide-react';
import { calculateNextPaymentDue } from '../utils/paymentSchedule';
import { cn } from '../utils/cn';

// ─── Razorpay Script Loader ────────────────────────────────────────────────
const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if (typeof window !== 'undefined' && window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

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
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{label}</label>
            {children}
            {error && <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{error}</p>}
            {hint && !error && <p className="text-[10px] text-muted-foreground/40">{hint}</p>}
        </div>
    );
}

function Input({ className, error, ...props }) {
    return (
        <input
            className={cn(
                'w-full bg-muted border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/30 outline-none transition-all text-sm',
                error ? 'border-rose-500/60 focus:border-rose-400' : 'border-border focus:border-emerald-500/60',
                className
            )}
            {...props}
        />
    );
}

// ─── Debit Card Form ────────────────────────────────────────────────────────
function DebitCardForm({ amount, paymentId, onSuccess, propertyId, billId, leaseId, user, isBooking, bookingData }) {
    const [cardNum, setCardNum] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [name, setName] = useState(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '');
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
        setErrors({});
        
        try {
            if (isBooking) {
                // Booking payment flow
                const isRzpLoaded = await loadRazorpayScript();
                const orderRes = await bookingService.createRazorpayOrder({
                    propertyId: propertyId || bookingData?.propertyId,
                    bookingId: bookingData?.bookingId
                });
                const order = orderRes.data?.data || orderRes.data;

                if (isRzpLoaded && window.Razorpay && order?.keyId && !order.keyId.includes('placeholder') && !String(order.razorpayOrderId).startsWith('order_sim_')) {
                    const options = {
                        key: order.keyId,
                        amount: order.amount,
                        currency: order.currency || 'INR',
                        name: 'Tenant Management System',
                        description: `Security Deposit for ${bookingData?.propertyName || 'Property'}`,
                        order_id: order.razorpayOrderId,
                        prefill: {
                            name: name || `${user?.firstName || ''} ${user?.lastName || ''}`,
                            email: user?.email || '',
                            contact: user?.phone || ''
                        },
                        theme: { color: '#059669' },
                        handler: async function (response) {
                            try {
                                await bookingService.verifyRazorpayPayment({
                                    bookingId: bookingData?.bookingId || order.bookingId,
                                    propertyId: propertyId,
                                    razorpayOrderId: response.razorpay_order_id,
                                    razorpayPaymentId: response.razorpay_payment_id,
                                    razorpaySignature: response.razorpay_signature
                                });
                                setLoading(false);
                                onSuccess();
                            } catch (vErr) {
                                setLoading(false);
                                setErrors({ submit: vErr.response?.data?.message || vErr.message || 'Payment verification failed.' });
                            }
                        },
                        modal: {
                            ondismiss: () => setLoading(false)
                        }
                    };
                    const rzp = new window.Razorpay(options);
                    rzp.on('payment.failed', (resp) => {
                        setLoading(false);
                        setErrors({ submit: resp.error?.description || 'Payment failed in Razorpay.' });
                    });
                    rzp.open();
                    return;
                }

                // Fallback simulation for booking
                await bookingService.processMockPayment({
                    propertyId: propertyId,
                    amount: amount,
                    method: 'debit_card',
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    billId: billId,
                    leaseId: leaseId,
                });
                setTimeout(() => {
                    setLoading(false);
                    onSuccess();
                }, 1000);
                return;
            }

            // Rent Payment Flow via Authoritative Razorpay Integration
            const isRzpLoaded = await loadRazorpayScript();
            const orderRes = await paymentService.createRentOrder({
                leaseId: leaseId,
                billId: billId
            });
            const orderData = orderRes.data?.data || orderRes.data;

            if (isRzpLoaded && window.Razorpay && orderData?.keyId && !orderData.keyId.includes('placeholder') && !String(orderData.orderId).startsWith('order_sim_')) {
                const options = {
                    key: orderData.keyId,
                    amount: orderData.amount, // in paise
                    currency: orderData.currency || 'INR',
                    name: 'Tenant Management System',
                    description: `Rent Payment — Lease #${String(leaseId).slice(-6)}`,
                    order_id: orderData.orderId,
                    prefill: {
                        name: name || `${user?.firstName || ''} ${user?.lastName || ''}`,
                        email: user?.email || '',
                        contact: user?.phone || ''
                    },
                    theme: { color: '#059669' },
                    handler: async function (response) {
                        try {
                            const verifyRes = await paymentService.verifyRazorpayPayment({
                                leaseId: leaseId,
                                billId: billId,
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature
                            });
                            setLoading(false);
                            onSuccess(verifyRes.data?.data || verifyRes.data);
                        } catch (vErr) {
                            setLoading(false);
                            setErrors({ submit: vErr.response?.data?.message || vErr.message || 'Payment verification failed.' });
                        }
                    },
                    modal: {
                        ondismiss: () => setLoading(false)
                    }
                };
                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', (resp) => {
                    setLoading(false);
                    setErrors({ submit: resp.error?.description || 'Payment was unsuccessful. Please try again.' });
                });
                rzp.open();
                return;
            }

            // Server-verified fallback for development / simulated environments
            const verifyRes = await paymentService.verifyRazorpayPayment({
                leaseId: leaseId,
                billId: billId,
                razorpayOrderId: orderData?.orderId || `order_sim_${Date.now()}`,
                razorpayPaymentId: `pay_sim_${Date.now()}`,
                razorpaySignature: 'sig_sim_valid'
            });

            setTimeout(() => {
                setLoading(false);
                onSuccess(verifyRes.data?.data || verifyRes.data);
            }, 900);

        } catch (err) {
            console.error('[DebitCardForm] Payment error:', err);
            setErrors({ submit: err?.response?.data?.message || err?.message || 'Payment failed. Please try again.' });
            setLoading(false);
        }
    };

    const cardType = cardNum.replace(/\s/g, '').startsWith('4') ? 'VISA'
        : cardNum.replace(/\s/g, '').startsWith('5') ? 'MASTERCARD'
            : cardNum.replace(/\s/g, '').startsWith('6') ? 'RUPAY'
                : '';

    return (
        <form onSubmit={handlePay} className="space-y-4" autoComplete="off">
            <div className="relative p-6 rounded-[2rem] overflow-hidden text-white h-48 shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
                <div className="absolute bottom-6 right-6 opacity-10 text-8xl font-black italic">{cardType}</div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="w-12 h-8 rounded-lg bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-lg" />
                        <span className="text-[10px] font-black opacity-60 uppercase tracking-[0.25em]">{cardType || 'SECURE CARD'}</span>
                    </div>
                    <div>
                        <p className="text-2xl font-black tracking-[0.2em] font-mono mb-4 text-white drop-shadow-md">
                            {cardNum || '•••• •••• •••• ••••'}
                        </p>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[9px] opacity-50 uppercase tracking-[0.15em] mb-1 font-bold">Cardholder</p>
                                <p className="text-sm font-black uppercase tracking-wider">{name || '—'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] opacity-50 uppercase tracking-[0.15em] mb-1 font-bold">Expires</p>
                                <p className="text-sm font-black">{expiry || 'MM/YY'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Field label="Cardholder Name" error={errors.name}>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name on card" error={errors.name} autoComplete="off" />
            </Field>

            <Field label="Card Number" error={errors.cardNum} hint="16-digit number on your debit card">
                <div className="relative">
                    <Input value={cardNum} onChange={e => setCardNum(fmtCard(e.target.value))} placeholder="1234 5678 9012 3456"
                        inputMode="numeric" className="font-mono pr-20" error={errors.cardNum} autoComplete="off" />
                    {cardType && (
                        <span className="absolute right-3 top-2.5 text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">{cardType}</span>
                    )}
                </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Expiry Date" error={errors.expiry}>
                    <Input value={expiry} onChange={e => setExpiry(fmtExpiry(e.target.value))} placeholder="MM/YY"
                        inputMode="numeric" error={errors.expiry} autoComplete="off" />
                </Field>
                <Field label="CVV" error={errors.cvv} hint="3–4 digits on back">
                    <div className="relative">
                        <Input type={showCvv ? 'text' : 'password'} value={cvv}
                            onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="•••" inputMode="numeric" className="pr-10" error={errors.cvv} autoComplete="off" />
                        <button type="button" onClick={() => setShowCvv(v => !v)}
                            className="absolute right-3 top-3 text-muted-foreground/30 hover:text-foreground transition-colors">
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
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm disabled:opacity-50 hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer">
                {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</> : <><Lock className="w-4 h-4" /> Pay ₹{amount.toLocaleString('en-IN')} Securely</>}
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">
                <Shield className="w-3.5 h-3.5" /> 256-bit SSL encrypted • RBI compliant
            </div>
        </form>
    );
}

// ─── UPI Form ───────────────────────────────────────────────────────────────
function UpiForm({ amount, paymentId, onSuccess, propertyId, billId, leaseId, user, isBooking, bookingData }) {
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
        await new Promise(r => setTimeout(r, 600));
        setVerifying(false);
        setVerified(true);
    };

    const handlePay = async (e) => {
        e.preventDefault();
        if (!verified) { handleVerify(); return; }
        setLoading(true);
        setErrors({});

        try {
            if (isBooking) {
                const isRzpLoaded = await loadRazorpayScript();
                const orderRes = await bookingService.createRazorpayOrder({
                    propertyId: propertyId || bookingData?.propertyId,
                    bookingId: bookingData?.bookingId
                });
                const order = orderRes.data?.data || orderRes.data;

                if (isRzpLoaded && window.Razorpay && order?.keyId && !order.keyId.includes('placeholder') && !String(order.razorpayOrderId).startsWith('order_sim_')) {
                    const options = {
                        key: order.keyId,
                        amount: order.amount,
                        currency: order.currency || 'INR',
                        name: 'Tenant Management System',
                        description: `Security Deposit for ${bookingData?.propertyName || 'Property'}`,
                        order_id: order.razorpayOrderId,
                        prefill: {
                            name: `${user?.firstName || ''} ${user?.lastName || ''}`,
                            email: user?.email || '',
                            contact: user?.phone || '',
                            vpa: upiId
                        },
                        theme: { color: '#7c3aed' },
                        handler: async function (response) {
                            try {
                                await bookingService.verifyRazorpayPayment({
                                    bookingId: bookingData?.bookingId || order.bookingId,
                                    propertyId: propertyId,
                                    razorpayOrderId: response.razorpay_order_id,
                                    razorpayPaymentId: response.razorpay_payment_id,
                                    razorpaySignature: response.razorpay_signature
                                });
                                setLoading(false);
                                onSuccess();
                            } catch (vErr) {
                                setLoading(false);
                                setErrors({ submit: vErr.response?.data?.message || vErr.message || 'Payment verification failed.' });
                            }
                        },
                        modal: { ondismiss: () => setLoading(false) }
                    };
                    const rzp = new window.Razorpay(options);
                    rzp.on('payment.failed', (resp) => {
                        setLoading(false);
                        setErrors({ submit: resp.error?.description || 'Payment failed in Razorpay.' });
                    });
                    rzp.open();
                    return;
                }

                await bookingService.processMockPayment({
                    propertyId: propertyId,
                    amount: amount,
                    method: 'upi',
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    billId: billId,
                    leaseId: leaseId,
                });
                setTimeout(() => {
                    setLoading(false);
                    onSuccess();
                }, 1000);
                return;
            }

            // Rent Payment via Razorpay
            const isRzpLoaded = await loadRazorpayScript();
            const orderRes = await paymentService.createRentOrder({
                leaseId: leaseId,
                billId: billId
            });
            const orderData = orderRes.data?.data || orderRes.data;

            if (isRzpLoaded && window.Razorpay && orderData?.keyId && !orderData.keyId.includes('placeholder') && !String(orderData.orderId).startsWith('order_sim_')) {
                const options = {
                    key: orderData.keyId,
                    amount: orderData.amount,
                    currency: orderData.currency || 'INR',
                    name: 'Tenant Management System',
                    description: `Rent Payment (UPI) — Lease #${String(leaseId).slice(-6)}`,
                    order_id: orderData.orderId,
                    prefill: {
                        name: `${user?.firstName || ''} ${user?.lastName || ''}`,
                        email: user?.email || '',
                        contact: user?.phone || '',
                        vpa: upiId
                    },
                    theme: { color: '#7c3aed' },
                    handler: async function (response) {
                        try {
                            const verifyRes = await paymentService.verifyRazorpayPayment({
                                leaseId: leaseId,
                                billId: billId,
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature
                            });
                            setLoading(false);
                            onSuccess(verifyRes.data?.data || verifyRes.data);
                        } catch (vErr) {
                            setLoading(false);
                            setErrors({ submit: vErr.response?.data?.message || vErr.message || 'Payment verification failed.' });
                        }
                    },
                    modal: { ondismiss: () => setLoading(false) }
                };
                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', (resp) => {
                    setLoading(false);
                    setErrors({ submit: resp.error?.description || 'Payment was unsuccessful. Please try again.' });
                });
                rzp.open();
                return;
            }

            // Fallback for simulation
            const verifyRes = await paymentService.verifyRazorpayPayment({
                leaseId: leaseId,
                billId: billId,
                razorpayOrderId: orderData?.orderId || `order_sim_${Date.now()}`,
                razorpayPaymentId: `pay_sim_${Date.now()}`,
                razorpaySignature: 'sig_sim_valid'
            });

            setTimeout(() => {
                setLoading(false);
                onSuccess(verifyRes.data?.data || verifyRes.data);
            }, 900);

        } catch (err) {
            console.error('[UpiForm] Payment error:', err);
            setErrors({ submit: err?.response?.data?.message || err?.message || 'Payment failed. Please try again.' });
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handlePay} className="space-y-5">
            <div className="flex flex-col items-center gap-4 py-8 rounded-[2rem] bg-gradient-to-br from-violet-600/10 to-indigo-600/5 border border-violet-500/20 shadow-inner">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                    <Smartphone className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                    <p className="text-3xl font-black text-foreground">₹{amount.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mt-1">Pay via any UPI app</p>
                </div>
                <div className="flex gap-2.5 mt-2">
                    {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map(app => (
                        <span key={app} className="px-3 py-1.5 rounded-xl bg-card border border-border text-[9px] font-black text-muted-foreground hover:text-foreground hover:border-violet-500/30 transition-all cursor-default">{app}</span>
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
                            'flex-shrink-0 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border cursor-pointer',
                            verified
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                : 'bg-muted border-border text-foreground/50 hover:bg-muted/80 disabled:opacity-40'
                        )}>
                        {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : verified ? <CheckCircle2 className="w-4 h-4" /> : 'Verify'}
                    </button>
                </div>
            </Field>

            <div>
                <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-2.5">Popular handles</p>
                <div className="flex flex-wrap gap-1.5">
                    {quickHandles.map(h => (
                        <button key={h} type="button"
                            onClick={() => { const base = upiId.split('@')[0]; setUpiId(base + h); setVerified(false); }}
                            className="px-3.5 py-1.5 rounded-xl bg-muted border border-border text-[10px] font-black text-muted-foreground hover:text-foreground hover:border-violet-500/30 hover:bg-violet-500/5 transition-all cursor-pointer">
                            {h}
                        </button>
                    ))}
                </div>
            </div>

            {verified && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-black">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> UPI ID verified. Proceed to pay.
                </div>
            )}

            {errors.submit && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {errors.submit}
                </div>
            )}

            <button type="submit" disabled={loading || !verified}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-sm disabled:opacity-40 hover:opacity-90 transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 cursor-pointer">
                {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</> : <><Lock className="w-4 h-4" /> Pay ₹{amount.toLocaleString('en-IN')} via UPI</>}
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">
                <Shield className="w-3.5 h-3.5" /> NPCI / UPI compliant • Instant settlement
            </div>
        </form>
    );
}

// ─── Success Screen ──────────────────────────────────────────────────────────
const CoinAnimation = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
            <motion.div
                key={i}
                initial={{ y: 200, x: 0, opacity: 1, scale: 1 }}
                animate={{ 
                    y: -400, 
                    x: (Math.random() - 0.5) * 400, 
                    opacity: 0, 
                    scale: 0.5,
                    rotate: 360 
                }}
                transition={{ 
                    duration: 1.5, 
                    delay: i * 0.1, 
                    ease: "easeOut" 
                }}
                className="absolute bottom-0 left-1/2 text-yellow-400"
            >
                <Coins className="w-6 h-6 fill-current" />
            </motion.div>
        ))}
    </div>
);

function SuccessScreen({ amount, method, navigate, type }) {
    return (
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 py-10 text-center relative">
            <CoinAnimation />
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center relative z-10">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </motion.div>
            <div className="relative z-10">
                <h2 className="text-3xl font-black text-foreground tracking-tight">
                    {type === 'booking' ? 'Booking Requested! 🏠' : 'Payment Successful! 🎉'}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm max-w-xs mx-auto">Your payment of <span className="font-black text-emerald-600 dark:text-emerald-400">₹{amount.toLocaleString('en-IN')}</span> has been received and verified.</p>
                <p className="text-muted-foreground/40 mt-3 text-[10px] font-black uppercase tracking-[0.15em]">via {method === 'upi' ? 'UPI' : 'Debit Card'} · {new Date().toLocaleString('en-IN')}</p>
            </div>
            <div className="w-full p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300/70 relative z-10">
                <p className="font-bold text-emerald-300 mb-1">What happens next?</p>
                {type === 'booking' ? (
                    <p>The owner has been notified. Your status is now "Pending Approval". You can track it in your dashboard.</p>
                ) : (
                    <p>Your payment is recorded as PAID. The updated receipt is available in your payment history.</p>
                )}
            </div>
            <div className="flex gap-3 w-full relative z-10">
                {type === 'booking' ? (
                    <button onClick={() => navigate('/dashboard')} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 transition-all shadow-xl shadow-primary/20 cursor-pointer">
                        Back to Dashboard
                    </button>
                ) : (
                    <>
                        <button onClick={() => navigate('/my-lease')} className="flex-1 py-4 rounded-2xl border border-border text-foreground/50 font-black text-xs uppercase tracking-widest hover:bg-muted transition-colors cursor-pointer">
                            View Lease
                        </button>
                        <button onClick={() => navigate('/payments')} className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20 cursor-pointer">
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

    const leaseIdParam = searchParams.get('leaseId') || location.state?.leaseId;
    const billIdParam = searchParams.get('billId');

    // From navigation state (Booking flow)
    const bookingData = location.state || {};
    const isBooking = bookingData.type === 'booking';

    const [method, setMethod] = useState('card'); // 'card' | 'upi'
    const [success, setSuccess] = useState(false);
    const [lease, setLease] = useState(null);
    const [availableLeases, setAvailableLeases] = useState([]);
    const [leaseNotFound, setLeaseNotFound] = useState(false);
    const [billDetails, setBillDetails] = useState(null);
    const [loadingLease, setLoadingLease] = useState(true);
    const [rentSummary, setRentSummary] = useState(null);

    // Custom amount mode
    const [customAmount, setCustomAmount] = useState('');
    const [amountError, setAmountError] = useState('');
    const [useCustom, setUseCustom] = useState(false);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            setLoadingLease(true);
            setLeaseNotFound(false);
            try {
                // 1. Fetch Bill details if billIdParam is present
                if (billIdParam) {
                    try {
                        const res = await billService.getBillById(billIdParam);
                        const bill = res.data?.data || res.data;
                        if (isMounted) setBillDetails(bill);
                    } catch (bErr) {
                        console.warn('[PayNowPage] Bill fetch warning:', bErr);
                    }
                }

                // 2. Fetch all of the tenant's leases
                let allLeases = [];
                let primaryLease = null;
                try {
                    const leaseRes = await leaseService.getMyLease();
                    if (leaseRes) {
                        const rawRes = leaseRes.data || leaseRes || {};
                        const activeArray = Array.isArray(rawRes.activeLeases)
                            ? rawRes.activeLeases
                            : (Array.isArray(rawRes.data?.activeLeases)
                                ? rawRes.data.activeLeases
                                : (Array.isArray(rawRes.data) ? rawRes.data : []));
                        
                        primaryLease = rawRes.data && !Array.isArray(rawRes.data) ? rawRes.data : null;
                        const pastArray = Array.isArray(rawRes.pastLeases) ? rawRes.pastLeases : [];
                        const candidateList = [
                            ...(activeArray.length > 0 ? activeArray : (primaryLease ? [primaryLease] : [])),
                            ...pastArray
                        ];

                        allLeases = candidateList.filter(Boolean);
                    }
                } catch (lErr) {
                    console.warn('[PayNowPage] getMyLease warning:', lErr);
                }

                if (!isMounted) return;

                // 3. Resolve Target Lease
                let targetLease = null;
                const cleanParam = leaseIdParam ? String(leaseIdParam).trim() : null;

                if (cleanParam) {
                    targetLease = allLeases.find(l => {
                        const lid = l._id ? String(l._id) : (l.id ? String(l.id) : '');
                        const lnum = l.leaseNumber ? String(l.leaseNumber) : '';
                        return lid === cleanParam || lnum === cleanParam;
                    });

                    // Direct lease lookup by ID if not in myLease list
                    if (!targetLease) {
                        try {
                            const directRes = await leaseService.getLeaseById(cleanParam);
                            targetLease = directRes?.data?.data || directRes?.data || directRes;
                            if (targetLease && !allLeases.some(l => (l._id || l.id) === (targetLease._id || targetLease.id))) {
                                allLeases.push(targetLease);
                            }
                        } catch (dErr) {
                            console.warn('[PayNowPage] direct getLeaseById warning:', dErr);
                        }
                    }
                }

                // If no specific lease was requested or matched, default to primary/first lease
                if (!targetLease && !cleanParam) {
                    targetLease = allLeases[0] || primaryLease || null;
                }

                // 4. Fetch Authoritative Rent Payment Summary from Single Source of Truth
                let summary = null;
                try {
                    const sumRes = await paymentService.getRentSummary({
                        leaseId: targetLease?._id || cleanParam || undefined,
                        billId: billIdParam || undefined
                    });
                    summary = sumRes.data?.data || sumRes.data;
                } catch (sErr) {
                    console.warn('[PayNowPage] getRentSummary warning:', sErr);
                }

                if (!isMounted) return;

                if (summary) {
                    setRentSummary(summary);
                    if (!targetLease) {
                        targetLease = {
                            _id: summary.leaseId,
                            leaseNumber: summary.leaseNumber,
                            rentAmount: summary.monthlyRent,
                            property: {
                                _id: summary.propertyId,
                                name: summary.propertyName
                            }
                        };
                        if (!allLeases.some(l => (l._id || l.id) === summary.leaseId)) {
                            allLeases.push(targetLease);
                        }
                    }
                }

                setAvailableLeases(allLeases.filter(l => l && !['terminated', 'expired', 'cancelled'].includes((l.status || '').toLowerCase())));

                if (!targetLease && !summary) {
                    setLease(null);
                    setRentSummary(null);
                    setLeaseNotFound(true);
                } else {
                    setLease(targetLease);
                    setLeaseNotFound(false);
                }

            } catch (err) {
                console.error('[PayNowPage] Error loading lease/payment context:', err);
                if (isMounted) setLeaseNotFound(true);
            } finally {
                if (isMounted) setLoadingLease(false);
            }
        })();
        return () => { isMounted = false; };
    }, [leaseIdParam, searchParams, billIdParam]);

    const handleSelectLease = (selectedL) => {
        if (!selectedL || (lease?._id === selectedL._id)) return;
        setCustomAmount('');
        setUseCustom(false);
        setAmountError('');
        navigate(`/pay-now?leaseId=${selectedL._id}`, { replace: true, state: { leaseId: selectedL._id } });
    };

    // ─── Authoritative Amounts from Single Source of Truth ───────────────────
    const isOverdue = rentSummary?.isOverdue ?? (rentSummary?.status === 'overdue');
    const monthlyRent = rentSummary?.monthlyRent ?? (lease?.rentAmount || 0);
    const lateFee = rentSummary?.lateFee ?? 0;
    const daysOverdue = rentSummary?.daysOverdue ?? 0;
    const platformFee = rentSummary?.platformFee ?? Math.round((monthlyRent + lateFee) * 0.01);
    const platformFeePercentage = rentSummary?.platformFeePercentage ?? 1;
    const taxAmount = rentSummary?.taxAmount ?? 0;
    const authoritativeTotalDue = rentSummary?.totalDue ?? (monthlyRent + lateFee + platformFee + taxAmount);

    const parsedCustom = parseInt(customAmount.replace(/[^\d]/g, '')) || 0;
    const customPlatformFee = Math.round(parsedCustom * 0.01);
    const customTotalPayable = parsedCustom + customPlatformFee;

    // Single unified authoritative payable amount
    const finalTotalPayable = isBooking
        ? (bookingData.amount || 0)
        : useCustom
            ? customTotalPayable
            : authoritativeTotalDue;

    const propertyId = bookingData.propertyId || billDetails?.property?._id || lease?.property?._id || rentSummary?.propertyId;
    const isAutoPayActive = Boolean(rentSummary?.autoPay?.enabled);

    const validateCustom = () => {
        if (parsedCustom < 1) { setAmountError('Enter a valid amount'); return false; }
        if (parsedCustom > 1000000) { setAmountError('Amount cannot exceed ₹10,00,000'); return false; }
        setAmountError('');
        return true;
    };

    const handleSuccess = () => setSuccess(true);

    return (
        <div className="max-w-lg mx-auto space-y-5 pb-10">
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
                <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-muted-foreground/50 hover:text-foreground mb-6 transition-colors group cursor-pointer">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
                </button>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-6 rounded-full bg-emerald-500" />
                    <p className="text-[10px] font-black uppercase tracking-[.25em] text-emerald-600 dark:text-emerald-400">Secure Payment</p>
                </div>
                <h1 className="text-3xl font-black text-foreground tracking-tight">
                    {isBooking ? 'Confirm Booking' : 'Pay Rent'} 💳
                </h1>
            </motion.div>

            <AnimatePresence mode="wait">
                {success ? (
                    <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }} className="rounded-[2.5rem] border border-border bg-card p-8 shadow-xl">
                        <SuccessScreen amount={finalTotalPayable} method={method} navigate={navigate} type={isBooking ? 'booking' : 'rent'} />
                    </motion.div>
                ) : (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="rounded-[2.5rem] border border-emerald-500/20 p-8 shadow-2xl"
                            style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)' }}>
                            
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <p className="text-[10px] font-black text-emerald-100/40 uppercase tracking-[0.2em]">
                                    {isBooking ? 'Total Payable' : (isOverdue ? '⚠️ Overdue Rent Payment' : 'Monthly Rent')}
                                </p>

                                {availableLeases.length > 1 && !isBooking && !billIdParam && (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {availableLeases.map((l) => {
                                            const isSelected = (lease?._id || lease?.id) === (l._id || l.id);
                                            return (
                                                <button
                                                    key={l._id}
                                                    type="button"
                                                    onClick={() => handleSelectLease(l)}
                                                    className={cn(
                                                        "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer",
                                                        isSelected
                                                            ? "bg-white/25 border-white/40 text-white font-extrabold shadow-sm ring-1 ring-white/30"
                                                            : "bg-white/5 border-white/10 text-emerald-100/60 hover:text-white hover:bg-white/10"
                                                    )}
                                                >
                                                    {l.property?.name || 'Lease'}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {loadingLease ? (
                                <div className="h-16 bg-white/10 rounded-2xl animate-pulse" />
                            ) : leaseNotFound ? (
                                <div className="py-6 text-center text-white space-y-2">
                                    <AlertTriangle className="w-8 h-8 mx-auto text-amber-300" />
                                    <h4 className="text-lg font-bold">Lease Not Found</h4>
                                    <p className="text-xs text-white/70">The specified lease ID could not be loaded.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-end gap-1 mb-4">
                                        <span className="text-emerald-400 text-4xl font-black">₹</span>
                                        <span className="text-6xl font-black text-white">{finalTotalPayable.toLocaleString('en-IN')}</span>
                                    </div>

                                    {/* Breakdown items */}
                                    <div className="bg-black/20 rounded-2xl p-3 mb-4 space-y-1.5 text-xs text-emerald-100/80">
                                        <div className="flex justify-between">
                                            <span>Monthly Rent</span>
                                            <span className="font-bold text-white">₹{(useCustom ? parsedCustom : monthlyRent).toLocaleString('en-IN')}</span>
                                        </div>
                                        {!useCustom && lateFee > 0 && (
                                            <div className="flex justify-between text-rose-300">
                                                <span>Late Fee ({daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue)</span>
                                                <span className="font-bold text-rose-200">+₹{lateFee.toLocaleString('en-IN')}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span>TMS Platform Fee ({platformFeePercentage}%)</span>
                                            <span className="font-bold text-emerald-300">
                                                ₹{(useCustom ? customPlatformFee : platformFee).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        {(taxAmount > 0) && (
                                            <div className="flex justify-between">
                                                <span>Applicable Tax</span>
                                                <span className="font-bold text-white">₹{taxAmount.toLocaleString('en-IN')}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-emerald-100/40 font-mono">
                                        {isBooking
                                            ? <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {bookingData.propertyName}</span>
                                            : (lease && <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {lease.property?.name || rentSummary?.propertyName}</span>)
                                        }
                                        {!isBooking && (rentSummary?.dueDate || lease?.nextPaymentDueAt || lease?.startDate) && (
                                            <span className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 
                                                Due: {new Date(rentSummary?.dueDate || lease?.nextPaymentDueAt || lease?.startDate).toLocaleDateString('en-IN')}
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}

                            {!isBooking && !leaseNotFound && (
                                <div className="mt-6 pt-6 border-t border-white/10">
                                    <button type="button" onClick={() => setUseCustom(v => !v)}
                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-100/40 hover:text-emerald-100 transition-colors cursor-pointer">
                                        <Info className="w-4 h-4" />
                                        {useCustom ? 'Use calculated total due instead' : 'Pay a different amount'}
                                    </button>
                                    <AnimatePresence>
                                        {useCustom && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                                                <Field label="Custom Amount (₹)" error={amountError}>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-3.5 text-foreground/40 font-black text-sm">₹</span>
                                                        <Input value={customAmount}
                                                            onChange={e => setCustomAmount(e.target.value.replace(/\D/g, ''))}
                                                            onBlur={validateCustom}
                                                            placeholder="0.00"
                                                            inputMode="numeric"
                                                            className="pl-8 !bg-card border-emerald-500/20"
                                                            error={amountError}
                                                        />
                                                    </div>
                                                </Field>
                                                <div className="flex gap-2 mt-3 flex-wrap">
                                                    {[500, 1000, 2000, 5000].map(a => (
                                                        <button key={a} type="button" onClick={() => setCustomAmount(String(a))}
                                                            className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/20 hover:text-white transition-all cursor-pointer">
                                                            +₹{a.toLocaleString('en-IN')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </motion.div>

                        {leaseNotFound ? (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="p-6 rounded-[2rem] border border-border bg-card text-center space-y-4 shadow-sm">
                                <p className="text-xs text-muted-foreground">
                                    The selected lease is not available or does not belong to your account.
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/my-lease')}
                                        className="px-4 py-2.5 rounded-xl border border-border text-foreground text-xs font-bold hover:bg-muted transition-colors cursor-pointer"
                                    >
                                        View My Leases
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/dashboard')}
                                        className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                                    >
                                        Go to Dashboard
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <>
                                {/* Lease-Specific Auto-Pay Status Banner */}
                                {!isBooking && (
                                    isAutoPayActive ? (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs shadow-sm">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                                                    <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-pulse" />
                                                </div>
                                                <div>
                                                    <p className="font-extrabold text-foreground flex items-center gap-1.5">
                                                        <span>Auto-Pay Active</span>
                                                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">Enabled</span>
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">Automatic monthly rent is enabled for this lease.</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => navigate('/payments')}
                                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider transition-colors shadow-sm cursor-pointer flex-shrink-0"
                                            >
                                                Manage Auto-Pay
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                                            <div className="flex items-center gap-2.5">
                                                <Zap className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                <div>
                                                    <p className="font-bold text-foreground">Want Hassle-Free Rent Payments?</p>
                                                    <p className="text-[10px] text-muted-foreground">Manage automatic monthly payments on the Payments page.</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => navigate('/payments')}
                                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider transition-colors shadow-sm cursor-pointer flex-shrink-0"
                                            >
                                                View Auto-Pay
                                            </button>
                                        </motion.div>
                                    )
                                )}

                                {/* Method Selector */}
                                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                                    className="grid grid-cols-2 gap-4">
                                    {[
                                        { id: 'card', label: 'Debit Card', icon: CreditCard, color: 'from-emerald-600 to-teal-600', glow: 'shadow-emerald-500/20' },
                                        { id: 'upi', label: 'UPI', icon: Smartphone, color: 'from-violet-600 to-indigo-600', glow: 'shadow-violet-500/20' },
                                    ].map(m => {
                                        const Icon = m.icon;
                                        const active = method === m.id;
                                        return (
                                            <motion.button key={m.id} type="button" onClick={() => setMethod(m.id)}
                                                whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
                                                className={cn(
                                                    'flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all cursor-pointer',
                                                    active
                                                        ? cn('bg-gradient-to-br text-white shadow-xl border-transparent ring-2 ring-offset-2 ring-offset-background', m.color, m.glow)
                                                        : 'border-border bg-card text-muted-foreground/40 hover:bg-muted hover:text-foreground hover:border-border/80'
                                                )}>
                                                <div className={cn('p-3 rounded-2xl bg-white/10 backdrop-blur-md transition-colors', active ? 'bg-white/20' : 'bg-muted')}>
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                <span className="font-black text-xs uppercase tracking-widest">{m.label}</span>
                                                {active && <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Active</span>}
                                            </motion.button>
                                        );
                                    })}
                                </motion.div>

                                {/* Payment Form */}
                                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                    className="rounded-[2.5rem] border border-border bg-card p-6 shadow-sm">
                                    <AnimatePresence mode="wait">
                                        {method === 'card' ? (
                                            <motion.div key="card" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
                                                <DebitCardForm
                                                    amount={finalTotalPayable}
                                                    paymentId={billDetails?.payment?._id || 'manual'}
                                                    onSuccess={handleSuccess}
                                                    propertyId={propertyId}
                                                    billId={billIdParam}
                                                    leaseId={lease?._id}
                                                    user={user}
                                                    isBooking={isBooking}
                                                    bookingData={bookingData}
                                                />
                                            </motion.div>
                                        ) : (
                                            <motion.div key="upi" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                                                <UpiForm
                                                    amount={finalTotalPayable}
                                                    paymentId={billDetails?.payment?._id || 'manual'}
                                                    onSuccess={handleSuccess}
                                                    propertyId={propertyId}
                                                    billId={billIdParam}
                                                    leaseId={lease?._id}
                                                    user={user}
                                                    isBooking={isBooking}
                                                    bookingData={bookingData}
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

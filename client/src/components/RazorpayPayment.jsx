import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Shield, CreditCard, AlertTriangle, IndianRupee } from 'lucide-react';
import { bookingService } from '../services/api';
import { useNavigate } from 'react-router-dom';

/**
 * RazorpayPayment — drop-in Razorpay booking + payment flow component
 *
 * Props:
 *   property   — property object { _id, name, rentAmount, ... }
 *   onClose    — callback when the modal is dismissed
 *   onSuccess  — callback(bookingId) after payment verified
 */
export default function RazorpayPayment({ property, onClose, onSuccess }) {
    const navigate = useNavigate();
    const [step, setStep] = useState('confirm'); // confirm | paying | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const [bookingId, setBookingId] = useState(null);

    // Guard: if Razorpay SDK not loaded, inject it
    useEffect(() => {
        if (!window.Razorpay) {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    const securityDeposit = property.rentAmount * 2;
    const serviceFee = Math.round(property.rentAmount * 0.05);
    const totalPayable = property.rentAmount + securityDeposit + serviceFee;

    const handlePayNow = async () => {
        setStep('paying');
        try {
            // 1) Create Razorpay order on backend
            const res = await bookingService.createRazorpayOrder({
                propertyId: property._id,
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            });

            const { razorpayOrderId, amount, keyId, bookingId: bid } = res.data?.data || res.data;
            setBookingId(bid);

            // 2) Open Razorpay checkout
            const rzp = new window.Razorpay({
                key: keyId,
                amount,
                currency: 'INR',
                order_id: razorpayOrderId,
                name: 'TMS Platform',
                description: `Booking for ${property.name}`,
                theme: { color: '#6366f1' },
                handler: async (response) => {
                    // 3) Verify payment on backend
                    try {
                        await bookingService.verifyRazorpayPayment({
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            bookingId: bid,
                        });
                        setStep('success');
                        if (onSuccess) onSuccess(bid);
                    } catch (err) {
                        setErrorMsg('Payment verification failed. Please contact support.');
                        setStep('error');
                    }
                },
                modal: {
                    ondismiss: () => {
                        setStep('confirm');
                    },
                },
            });
            rzp.open();
        } catch (err) {
            setErrorMsg(err?.response?.data?.message || 'Failed to create payment order. Please try again.');
            setStep('error');
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
                {/* Header */}
                <div
                    className="px-7 py-6 flex items-center gap-3"
                    style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))', borderBottom: '1px solid var(--border-color)' }}
                >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: '#6366f1' }}>
                        <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Book this Property</h2>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{property.name}</p>
                    </div>
                </div>

                <div className="px-7 py-6">
                    <AnimatePresence mode="wait">

                        {/* ── CONFIRM STEP ── */}
                        {step === 'confirm' && (
                            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                                {/* Breakdown */}
                                <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)' }}>
                                    <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Payment Breakdown</p>
                                    {[
                                        { label: 'Month 1 Rent', amount: property.rentAmount },
                                        { label: 'Security Deposit (2 months)', amount: securityDeposit },
                                        { label: 'Platform Service Fee (5%)', amount: serviceFee },
                                    ].map(row => (
                                        <div key={row.label} className="flex items-center justify-between text-sm">
                                            <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                                            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>₹{row.amount.toLocaleString('en-IN')}</span>
                                        </div>
                                    ))}
                                    <div className="pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-color)' }}>
                                        <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Total Due Now</span>
                                        <span className="text-xl font-black" style={{ color: '#6366f1' }}>
                                            ₹{totalPayable.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>

                                {/* Escrow notice */}
                                <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                    <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-emerald-400">Escrow Protected</p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                            Your payment is held in secure escrow until the manager approves your booking. If rejected, you'll receive a full refund.
                                        </p>
                                    </div>
                                </div>

                                {/* Razorpay badge */}
                                <div className="flex items-center justify-center gap-2 py-2 opacity-50">
                                    <IndianRupee className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                    <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Powered by Razorpay · 256-bit SSL Encrypted</span>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-3 pt-1">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all"
                                        style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                                    >
                                        Cancel
                                    </button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handlePayNow}
                                        className="flex-1 py-3.5 rounded-2xl font-black text-sm text-white shadow-lg transition-all"
                                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
                                    >
                                        Pay ₹{totalPayable.toLocaleString('en-IN')}
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── PAYING STEP ── */}
                        {step === 'paying' && (
                            <motion.div key="paying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex flex-col items-center py-10 gap-5">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
                                        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="font-black text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Opening Razorpay...</p>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Please complete the payment in the popup window</p>
                                </div>
                            </motion.div>
                        )}

                        {/* ── SUCCESS STEP ── */}
                        {step === 'success' && (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                className="flex flex-col items-center py-8 gap-5 text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                                    className="w-24 h-24 rounded-full flex items-center justify-center"
                                    style={{ background: 'rgba(16,185,129,0.15)' }}
                                >
                                    <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                                </motion.div>
                                <div>
                                    <p className="font-black text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>Payment Successful!</p>
                                    <p style={{ color: 'var(--text-secondary)' }} className="text-sm mb-2">
                                        Your booking is now under <strong>escrow review</strong>.
                                    </p>
                                    <p style={{ color: 'var(--text-muted)' }} className="text-xs">
                                        The manager will approve within 24–48 hours. You'll receive an email confirmation.
                                    </p>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => bookingId ? navigate(`/bookings/${bookingId}`) : onClose?.()}
                                    className="px-8 py-3.5 rounded-2xl font-black text-white text-sm"
                                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}
                                >
                                    Track Booking →
                                </motion.button>
                            </motion.div>
                        )}

                        {/* ── ERROR STEP ── */}
                        {step === 'error' && (
                            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex flex-col items-center py-8 gap-5 text-center">
                                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
                                    <XCircle className="w-10 h-10 text-red-400" />
                                </div>
                                <div>
                                    <p className="font-black text-xl mb-2" style={{ color: 'var(--text-primary)' }}>Payment Failed</p>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{errorMsg}</p>
                                </div>
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 py-3 rounded-2xl font-bold text-sm"
                                        style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={() => setStep('confirm')}
                                        className="flex-1 py-3 rounded-2xl font-black text-white text-sm"
                                        style={{ background: '#ef4444' }}
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}

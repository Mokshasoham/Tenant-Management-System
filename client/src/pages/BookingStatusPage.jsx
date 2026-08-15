import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { bookingService } from '../services/api';
import useAuthStore from '../context/authStore';
import {
    CheckCircle2, Clock, XCircle, ArrowLeft,
    Calendar, MapPin, IndianRupee, Shield,
    User, Building2, ChevronRight, FileText, Info,
    AlertTriangle, X
} from 'lucide-react';
import { cn } from '../utils/cn';
import RazorpayPayment from '../components/RazorpayPayment';
import apiClient from '../services/apiClient';
import { openSecureFile } from '../utils/fileAccess';
import ManagerBookingDetailsPage from './ManagerBookingDetailsPage';

export default function BookingStatusPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRazorpay, setShowRazorpay] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelFeedback, setCancelFeedback] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [downloadingReceipt, setDownloadingReceipt] = useState(false);

    const fetchBooking = async () => {
        try {
            const res = await bookingService.getBookingById(id);
            setBooking(res.data?.data || res.data || res);
        } catch (e) {
            console.error('[BookingStatusPage] Error fetching booking:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log('[BookingStatusPage] Destination page loaded', { bookingId: id });
        fetchBooking();
    }, [id]);

    const handleDownloadReceipt = async () => {
        if (!booking?._id) return;
        setDownloadingReceipt(true);
        try {
            const res = await bookingService.getBookingReceipt(booking._id);
            const data = res?.data || res;
            if (data?.url) {
                let fullUrl = data.url;
                if (!fullUrl.startsWith('http')) {
                    const baseURL = apiClient.defaults.baseURL || '';
                    const serverOrigin = baseURL.endsWith('/api') ? baseURL.slice(0, -4) : baseURL;
                    const cleanServer = (serverOrigin || window.location.origin).replace(/\/$/, '');
                    const cleanPath = fullUrl.startsWith('/') ? fullUrl : '/' + fullUrl;
                    fullUrl = `${cleanServer}${cleanPath}`;
                }
                window.open(fullUrl, '_blank');
            } else if (data?.fileId) {
                await openSecureFile(data.fileId);
            } else {
                alert(`Receipt #${data?.receiptNumber || 'REC-' + booking._id.slice(-8).toUpperCase()} downloaded successfully.`);
            }
        } catch (err) {
            console.error('Failed to download receipt:', err);
            alert(err?.message || err?.error?.message || 'Receipt is being processed. Please try again.');
        } finally {
            setDownloadingReceipt(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );

    if (!booking) return (
        <div className="max-w-md mx-auto my-20 p-8 rounded-[2.5rem] bg-card/60 backdrop-blur-sm border border-border/80 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
                <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-foreground">This record is no longer available</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
                The booking request or visit schedule you are trying to view does not exist or has been removed.
            </p>
            <div className="flex gap-3 justify-center pt-2">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                    Dashboard
                </button>
                <button
                    onClick={() => navigate('/dashboard', { state: { activeTab: 'messages' } })}
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-xs font-black uppercase tracking-wider transition-all hover:bg-white/10 cursor-pointer"
                >
                    My Messages
                </button>
            </div>
        </div>
    );

    // Manager / Admin specific view delegation
    if (user?.role === 'manager' || user?.role === 'admin') {
        return <ManagerBookingDetailsPage booking={booking} onRefresh={fetchBooking} />;
    }

    const statusConfig = {
        pending: {
            icon: Clock,
            color: 'text-amber-400',
            bg: 'bg-amber-400/10',
            border: 'border-amber-400/20',
            title: 'Waiting for Approval',
            desc: 'The property manager is reviewing your request. You will be notified once they respond.'
        },
        approved: {
            icon: (booking?.paymentStatus === 'pending' || booking?.paymentStatus === 'failed') ? AlertTriangle : CheckCircle2,
            color: (booking?.paymentStatus === 'pending' || booking?.paymentStatus === 'failed') ? 'text-indigo-500' : 'text-emerald-400',
            bg: (booking?.paymentStatus === 'pending' || booking?.paymentStatus === 'failed') ? 'bg-indigo-500/10' : 'bg-emerald-400/10',
            border: (booking?.paymentStatus === 'pending' || booking?.paymentStatus === 'failed') ? 'border-indigo-500/20' : 'border-emerald-400/20',
            title: (booking?.paymentStatus === 'pending' || booking?.paymentStatus === 'failed') ? 'Approved – Awaiting Deposit Payment' : 'Security Deposit Secured!',
            desc: (booking?.paymentStatus === 'pending' || booking?.paymentStatus === 'failed') ? 'The manager has approved your request! Please complete the security deposit payment to generate your lease agreement.' : `Your security deposit of ₹${(booking?.totalAmount || 0).toLocaleString('en-IN')} has been received into escrow. Please proceed to review and sign your lease agreement.`,
            showButton: booking?.paymentStatus !== 'pending' && booking?.paymentStatus !== 'failed',
            showPayButton: booking?.paymentStatus === 'pending' || booking?.paymentStatus === 'failed',
            showSignButton: booking?.paymentStatus === 'paid'
        },
        rejected: {
            icon: XCircle,
            color: 'text-rose-400',
            bg: 'bg-rose-400/10',
            border: 'border-rose-400/20',
            title: 'Request Declined',
            desc: booking?.rejectionReason || 'The property manager has declined your booking request.'
        },
        cancelled: {
            icon: XCircle,
            color: 'text-rose-500',
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/20',
            title: 'Application Cancelled',
            desc: booking?.cancellationReason
                ? `Cancelled: ${booking.cancellationReason}.${(booking?.paymentStatus === 'refunded' && booking?.totalAmount > 0) ? ` Security deposit refund of ₹${booking.totalAmount?.toLocaleString('en-IN')} is recorded.` : ''}`
                : 'You have formally cancelled this lease application.',
            showButton: false,
            showPayButton: false
        }
    };

    const displayStatus = (booking?.status === 'active' || booking?.status === 'completed') ? 'approved' : (booking?.status || 'pending');
    const config = statusConfig[displayStatus] || statusConfig.pending;
    const Icon = config.icon || Clock;

    const handleChat = () => {
        navigate('/messages', {
            state: {
                recipientId: booking.manager?._id,
                recipientName: booking.manager?.firstName + ' ' + booking.manager?.lastName,
                subject: `Booking ${booking._id.slice(-8).toUpperCase()} for ${booking.property?.name}`
            }
        });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 hover:text-foreground transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Dashboard
                </button>
                <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">
                    Ref: {booking._id.slice(-8).toUpperCase()}
                </span>
            </div>

            {/* Status Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("p-10 rounded-[3rem] border-2 text-center space-y-6 shadow-xl", config.bg, config.border)}
            >
                <div className={cn("w-24 h-24 rounded-full mx-auto flex items-center justify-center border-2 bg-card/50 backdrop-blur-sm", config.border)}>
                    <Icon className={cn("w-12 h-12", config.color)} />
                </div>

                <div className="space-y-3">
                    <h1 className="text-4xl font-black text-foreground tracking-tight">{config.title}</h1>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">{config.desc}</p>
                </div>

                <div className="flex items-center justify-center gap-4 pt-4">
                    <div className="flex h-2 w-48 rounded-full bg-muted shadow-inner overflow-hidden">
                        <motion.div
                            className={cn("h-full", config.color.replace('text', 'bg'))}
                            initial={{ width: 0 }}
                            animate={{ width: booking.status === 'pending' ? '50%' : '100%' }}
                            transition={{ type: 'spring', damping: 20 }}
                        />
                    </div>
                </div>

                {config.showButton && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 max-w-md mx-auto w-full">
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            disabled={downloadingReceipt}
                            onClick={handleDownloadReceipt}
                            className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-card border border-border text-foreground text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all w-full cursor-pointer disabled:opacity-50"
                        >
                            <FileText className="w-4 h-4 text-emerald-500" /> {downloadingReceipt ? 'DOWNLOADING...' : 'DOWNLOAD RECEIPT'}
                        </motion.button>
                        {config.showSignButton && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={() => navigate('/my-lease', { state: { propertyId: booking.property?._id || booking.property, bookingId: booking._id } })}
                                className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-600/30 hover:shadow-xl transition-all w-full cursor-pointer"
                            >
                                <CheckCircle2 className="w-4 h-4" /> SIGN LEASE AGREEMENT
                            </motion.button>
                        )}
                    </div>
                )}

                {config.showPayButton && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setShowRazorpay(true)}
                        className="mt-8 flex items-center justify-center gap-2.5 px-10 py-4 rounded-2xl bg-indigo-600 border border-indigo-500 text-white text-[12px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all mx-auto active:scale-95 w-full max-w-sm"
                    >
                        <IndianRupee className="w-5 h-5" /> PAY TO ACTIVATE
                    </motion.button>
                )}
            </motion.div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Property Detail */}
                <div className="p-6 rounded-[2rem] bg-card border border-border space-y-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-0.5">Property</p>
                            <p className="text-foreground font-black tracking-tight">{booking.property?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-0.5">Lease Duration</p>
                            <p className="text-foreground font-black tracking-tight">
                                {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Payment Detail */}
                <div className="p-6 rounded-[2rem] bg-card border border-border space-y-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                            <IndianRupee className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-0.5">Amount Paid</p>
                            <p className="text-foreground font-black tracking-tight text-xl">
                                {booking.totalAmount === 0 ? 'FREE / DEMO' : `₹${booking.totalAmount?.toLocaleString('en-IN')}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-0.5">Payment Status</p>
                            <p className={cn(
                                "font-black uppercase text-[10px] tracking-widest px-2 py-0.5 rounded-lg inline-block font-mono border",
                                booking.paymentStatus === 'refunded' ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-500 dark:text-cyan-400" :
                                booking.paymentStatus === 'paid' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400" :
                                "bg-amber-500/10 border-amber-500/10 text-amber-600 dark:text-amber-400"
                            )}>
                                {booking.paymentReference === 'FREE-BOOKING' ? 'EXEMPT' : booking.paymentStatus === 'refunded' ? 'REFUND PROCESSED / SCHEDULED' : booking.paymentStatus}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Help Card */}
            <div className="p-8 rounded-[2rem] bg-blue-500/5 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="p-3 rounded-2xl bg-blue-500/10">
                        <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-foreground font-black tracking-tight">Need help with your booking?</p>
                        <p className="text-muted-foreground/50 text-xs font-medium mt-0.5">Chat with support or message the property manager.</p>
                    </div>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <button
                        onClick={handleChat}
                        className="w-full px-8 py-3.5 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                        CHAT WITH MANAGER
                    </button>
                    {booking.status !== 'cancelled' && booking.status !== 'rejected' && booking.status !== 'completed' && (
                        (user?.role !== 'tenant' || booking.status === 'pending') ? (
                            <button
                                onClick={() => setShowCancelModal(true)}
                                className="w-full px-8 py-3.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-500 w-full hover:text-white transition-all"
                            >
                                CANCEL LEASE APPLICATION
                            </button>
                        ) : null
                    )}
                </div>
            </div>

            {/* Razorpay Component */}
            {showRazorpay && (
                <RazorpayPayment
                    bookingId={booking._id}
                    property={booking.property}
                    onClose={() => setShowRazorpay(false)}
                    onSuccess={() => {
                        setShowRazorpay(false);
                        fetchBooking();
                    }}
                />
            )}

            {/* Cancellation Modal Dialog */}
            <AnimatePresence>
                {showCancelModal && (
                    <div 
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-card/90 border border-border backdrop-blur-md rounded-3xl p-6 shadow-2xl relative"
                        >
                            <button
                                onClick={() => {
                                    setShowCancelModal(false);
                                    setCancelReason('');
                                    setCancelFeedback('');
                                }}
                                className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/20 text-rose-500">
                                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-foreground">Cancel Lease Application</h3>
                                    <p className="text-xs text-muted-foreground/60">Filing this request will terminate the active draft.</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground/75 mb-1.5">
                                        Cancellation Reason <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-rose-500 transition-colors"
                                        required
                                    >
                                        <option value="">Select a reason...</option>
                                        <option value="Found another property">Found another property</option>
                                        <option value="Change of plans / Relocation">Change of plans / Relocation</option>
                                        <option value="Financial constraints">Financial constraints</option>
                                        <option value="Manager response time / Communication issues">Manager response time / Communication issues</option>
                                        <option value="Incorrect booking details selected">Incorrect booking details selected</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground/75 mb-1.5">
                                        Optional Feedback
                                    </label>
                                    <textarea
                                        value={cancelFeedback}
                                        onChange={(e) => setCancelFeedback(e.target.value)}
                                        placeholder="Share additional feedback to help us improve..."
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-rose-500 transition-colors resize-none"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowCancelModal(false);
                                        setCancelReason('');
                                        setCancelFeedback('');
                                    }}
                                    className="flex-1 py-3 rounded-2xl font-bold text-sm bg-muted border border-border text-muted-foreground hover:bg-muted/80 transition-colors"
                                >
                                    Go Back
                                </button>
                                <button
                                    disabled={!cancelReason || isCancelling}
                                    onClick={async () => {
                                        setIsCancelling(true);
                                        try {
                                            const res = await bookingService.cancelBooking(booking._id, {
                                                reason: cancelReason,
                                                feedback: cancelFeedback
                                            });
                                            setShowCancelModal(false);
                                            // Optimistically update status to trigger re-render
                                            const updatedBooking = res?.data || {
                                                ...booking,
                                                status: 'cancelled',
                                                cancellationReason: cancelReason,
                                                cancellationFeedback: cancelFeedback,
                                                paymentStatus: booking.paymentStatus === 'paid' ? 'refunded' : booking.paymentStatus
                                            };
                                            setBooking(updatedBooking);
                                            fetchBooking();
                                        } catch (e) {
                                            const errMsg = e?.message || e?.error?.message || e?.response?.data?.message || 'Failed to cancel the booking.';
                                            alert(errMsg);
                                        } finally {
                                            setIsCancelling(false);
                                        }
                                    }}
                                    className={cn(
                                        "flex-1 py-3 rounded-2xl font-black text-sm text-white shadow-lg transition-all",
                                        cancelReason && !isCancelling
                                            ? "bg-rose-500 shadow-rose-500/25 hover:bg-rose-600 active:scale-95"
                                            : "bg-muted text-muted-foreground cursor-not-allowed"
                                    )}
                                >
                                    {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

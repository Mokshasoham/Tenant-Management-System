import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { bookingService } from '../services/api';
import {
    CheckCircle2, Clock, XCircle, ArrowLeft,
    Calendar, MapPin, IndianRupee, Shield,
    User, Building2, ChevronRight, FileText, Info
} from 'lucide-react';
import { cn } from '../utils/cn';

export default function BookingStatusPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                const res = await bookingService.getBookingById(id);
                setBooking(res.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchBooking();
    }, [id]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );

    if (!booking) return (
        <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-white">Booking not found</h2>
            <button onClick={() => navigate('/dashboard')} className="mt-4 text-blue-400 font-bold flex items-center gap-2 mx-auto">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
        </div>
    );

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
            icon: CheckCircle2,
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10',
            border: 'border-emerald-400/20',
            title: 'Booking Confirmed!',
            desc: 'Congratulations! Your booking request has been approved. Welcome to your new home.',
            showButton: true
        },
        rejected: {
            icon: XCircle,
            color: 'text-rose-400',
            bg: 'bg-rose-400/10',
            border: 'border-rose-400/20',
            title: 'Request Declined',
            desc: booking.rejectionReason || 'The property manager has declined your booking request.'
        }
    };

    const config = statusConfig[booking.status] || statusConfig.pending;
    const Icon = config.icon;

    const handleDownloadReceipt = () => {
        alert('Downloading receipt for BK-' + booking._id.slice(-8).toUpperCase() + '...');
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-sm text-white/30 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Dashboard
                </button>
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                    Booking Reference: {booking._id.slice(-8).toUpperCase()}
                </span>
            </div>

            {/* Status Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("p-10 rounded-[2.5rem] border text-center space-y-6", config.bg, config.border)}
            >
                <div className={cn("w-20 h-20 rounded-full mx-auto flex items-center justify-center border-2", config.border)}>
                    <Icon className={cn("w-10 h-10", config.color)} />
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-white">{config.title}</h1>
                    <p className="text-white/50 text-sm max-w-md mx-auto">{config.desc}</p>
                </div>

                <div className="flex items-center justify-center gap-4 pt-4">
                    <div className="flex h-1.5 w-32 rounded-full bg-white/5">
                        <motion.div
                            className={cn("h-full rounded-full", config.color.replace('text', 'bg'))}
                            initial={{ width: 0 }}
                            animate={{ width: booking.status === 'pending' ? '50%' : '100%' }}
                        />
                    </div>
                </div>

                {config.showButton && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={handleDownloadReceipt}
                        className="mt-6 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-black hover:bg-white/10 mx-auto transition-all"
                    >
                        <FileText className="w-4 h-4 text-emerald-400" /> DOWNLOAD RECEIPT
                    </motion.button>
                )}
            </motion.div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Property Detail */}
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Property</p>
                            <p className="text-white font-bold">{booking.property?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Duration</p>
                            <p className="text-white font-bold">
                                {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Payment Detail */}
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <IndianRupee className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Amount Paid</p>
                            <p className="text-white font-bold">₹{booking.totalAmount?.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Payment Status</p>
                            <p className="text-white font-bold uppercase text-[10px] tracking-widest">{booking.paymentStatus}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Help Card */}
            <div className="p-6 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Info className="w-6 h-6 text-blue-400" />
                    <div>
                        <p className="text-white font-bold">Need help with your booking?</p>
                        <p className="text-white/40 text-xs">Chat with our support or message the property manager.</p>
                    </div>
                </div>
                <button onClick={() => navigate('/messages')} className="px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-500/20">
                    OPEN CHAT
                </button>
            </div>
        </div>
    );
}

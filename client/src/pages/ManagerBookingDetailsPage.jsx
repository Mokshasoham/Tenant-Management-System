import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { bookingService, leaseService } from '../services/api';
import useAuthStore from '../context/authStore';
import {
    ShieldCheck, Building2, User, Calendar, CreditCard,
    FileText, CheckCircle2, Clock, ArrowLeft, Mail, Phone,
    MapPin, ExternalLink, FileSignature, Download, IndianRupee,
    AlertTriangle, CheckSquare, XCircle, Shield, PenTool, Type,
    Upload, X, Sparkles, RefreshCw
} from 'lucide-react';
import { cn } from '../utils/cn';
import apiClient from '../services/apiClient';
import { openSecureFile } from '../utils/fileAccess';

export default function ManagerBookingDetailsPage({ booking: initialBooking, onRefresh }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const currentUser = useAuthStore((state) => state.user);

    const [booking, setBooking] = useState(initialBooking || null);
    const [loading, setLoading] = useState(!initialBooking);
    const [downloadingReceipt, setDownloadingReceipt] = useState(false);

    // Manager Counter-Sign Modal State
    const [showCounterSignModal, setShowCounterSignModal] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [printedName, setPrintedName] = useState(currentUser?.name || currentUser?.firstName ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'Property Manager');
    const [sigTab, setSigTab] = useState('draw'); // 'draw' | 'type' | 'upload'
    const [typedFont, setTypedFont] = useState('caveat');
    const [typewrittenText, setTypewrittenText] = useState(printedName);
    const [signatureData, setSignatureData] = useState('');
    const [signingError, setSigningError] = useState('');
    const [signingLoading, setSigningLoading] = useState(false);

    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const fetchBooking = async () => {
        try {
            const res = await bookingService.getBookingById(id);
            setBooking(res.data?.data || res.data || res);
        } catch (e) {
            console.error('[ManagerBookingDetailsPage] Error fetching booking:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!initialBooking) {
            fetchBooking();
        }
    }, [id, initialBooking]);

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

    // Canvas Helpers for Counter-Signing
    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }
        return {
            x: ((clientX - rect.left) / rect.width) * canvas.width,
            y: ((clientY - rect.top) / rect.height) * canvas.height
        };
    };

    const handleStartDraw = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const { x, y } = getCoordinates(e);
        setIsDrawing(true);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const handleDraw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const { x, y } = getCoordinates(e);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#0284c7'; // Sky-600
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const handleStopDraw = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            setSignatureData(canvas.toDataURL());
        }
    };

    const handleClearDraw = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setSignatureData('');
    };

    const generateTypedSignatureImage = (text, fontName) => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 150;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let fontStyle = "bold 44px 'Caveat', cursive";
        if (fontName === 'pacifico') fontStyle = "36px 'Pacifico', cursive";
        if (fontName === 'delafield') fontStyle = "68px 'Mrs Saint Delafield', cursive";
        
        ctx.font = fontStyle;
        ctx.fillStyle = '#0284c7'; // Sky-600
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        return canvas.toDataURL();
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setSigningError("Image size must be less than 2MB");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            setSignatureData(event.target.result);
            setSigningError("");
        };
        reader.readAsDataURL(file);
    };

    const handleCounterSignLease = async (e) => {
        e.preventDefault();
        setSigningError('');
        if (!agreeToTerms) {
            setSigningError('Please confirm the verification statement.');
            return;
        }
        if (!printedName.trim()) {
            setSigningError('Please enter your printed legal name.');
            return;
        }

        let finalSig = signatureData;
        if (sigTab === 'type') {
            if (!typewrittenText.trim()) {
                setSigningError('Please type your name to create your signature.');
                return;
            }
            finalSig = generateTypedSignatureImage(typewrittenText, typedFont);
        } else if (sigTab === 'draw' && !signatureData) {
            setSigningError('Please draw your signature.');
            return;
        } else if (sigTab === 'upload' && !signatureData) {
            setSigningError('Please upload a signature image.');
            return;
        }

        const targetLeaseId = booking.linkedLease?._id || booking.lease;
        if (!targetLeaseId) {
            setSigningError('No associated lease agreement found to counter-sign.');
            return;
        }

        setSigningLoading(true);
        try {
            const res = await leaseService.counterSignLease(targetLeaseId, {
                signature: finalSig,
                signatureType: sigTab,
                signedBy: printedName,
            });
            if (res.data?.success || res.success) {
                setShowCounterSignModal(false);
                fetchBooking();
                if (onRefresh) onRefresh();
            }
        } catch (err) {
            setSigningError(err.response?.data?.message || err.message || 'Failed to counter-sign lease.');
        } finally {
            setSigningLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        </div>
    );

    if (!booking) return (
        <div className="max-w-md mx-auto my-20 p-8 rounded-[2.5rem] bg-card/60 backdrop-blur-sm border border-border/80 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
                <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-foreground">Booking Record Not Found</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
                The requested booking record could not be loaded or you do not have permission to view it.
            </p>
            <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-wider transition-all"
            >
                Return to Dashboard
            </button>
        </div>
    );

    const depositAmount = booking.depositAmount || booking.totalAmount || booking.property?.depositAmount || (booking.property?.rentAmount ? booking.property.rentAmount * 2 : 0) || 0;
    const isDepositPaid = booking.paymentStatus === 'paid' || booking.status === 'active' || booking.status === 'completed';
    const linkedLease = booking.linkedLease;
    const isTenantSigned = Boolean(linkedLease?.signature && linkedLease?.signedBy && linkedLease?.signedAt);
    const isManagerSigned = Boolean(linkedLease?.managerSignature || linkedLease?.managerSignedAt);

    return (
        <div className="max-w-5xl mx-auto space-y-7 pb-12">
            {/* Top Navigation & Ref Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors group cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Dashboard
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.25em]">
                        REF: #{booking._id.slice(-8).toUpperCase()}
                    </span>
                    <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                        isDepositPaid ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    )}>
                        {isDepositPaid ? 'Deposit Paid' : 'Awaiting Deposit'}
                    </span>
                </div>
            </div>

            {/* Manager Hero Overview Card */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2.5rem] border border-cyan-500/20 bg-gradient-to-br from-[#0a1626] via-[#07101c] to-[#040810] p-7 md:p-9 shadow-2xl space-y-6"
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Manager Security Escrow View</span>
                            </div>
                            <h2 className="text-2xl font-black text-foreground tracking-tight mt-0.5">
                                {isDepositPaid ? 'Security Deposit Secured in Escrow' : 'Booking Approved – Awaiting Deposit'}
                            </h2>
                            <p className="text-xs text-muted-foreground/70 mt-1 max-w-xl">
                                {isDepositPaid
                                    ? `Security deposit of ₹${depositAmount.toLocaleString('en-IN')} is verified and held securely in escrow for ${booking.property?.name || 'the property'}.`
                                    : 'Tenant has been approved and is required to deposit the security amount to proceed with lease execution.'}
                            </p>
                        </div>
                    </div>

                    {/* Quick Hero Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        {isDepositPaid && (
                            <button
                                onClick={handleDownloadReceipt}
                                disabled={downloadingReceipt}
                                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-card border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-300 text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-50"
                            >
                                <Download className="w-4 h-4 text-cyan-400" />
                                {downloadingReceipt ? 'DOWNLOADING...' : 'DOWNLOAD RECEIPT'}
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/messages', {
                                state: {
                                    recipientId: booking.user?._id || booking.user,
                                    recipientName: `${booking.user?.firstName || 'Tenant'} ${booking.user?.lastName || ''}`.trim(),
                                    subject: `Booking Ref: #${booking._id.slice(-8).toUpperCase()}`
                                }
                            })}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-600/30 transition-all cursor-pointer"
                        >
                            <Mail className="w-4 h-4" /> MESSAGE TENANT
                        </button>
                    </div>
                </div>

                {/* Top Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                        <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">Security Deposit</span>
                        <p className="text-lg font-black text-cyan-400">₹{depositAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                        <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">Payment Status</span>
                        <div className="flex items-center gap-1.5 pt-0.5">
                            <span className={cn("w-2 h-2 rounded-full", isDepositPaid ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
                            <p className={cn("text-xs font-black uppercase", isDepositPaid ? "text-emerald-400" : "text-amber-400")}>
                                {isDepositPaid ? 'PAID' : 'PENDING'}
                            </p>
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                        <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">Escrow Status</span>
                        <p className="text-xs font-black text-indigo-400 uppercase pt-0.5">
                            {isDepositPaid ? 'HELD IN ESCROW' : 'NOT STARTED'}
                        </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                        <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">Tenancy Term</span>
                        <p className="text-[11px] font-black text-foreground pt-0.5">
                            {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Core Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Tenant Profile & Contact */}
                <div className="p-6 md:p-7 rounded-[2rem] bg-card border border-border space-y-5 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-border/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-black">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Tenant Profile</h3>
                                <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">Applicant Details</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/tenants')}
                            className="text-[10px] font-black text-cyan-400 uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            All Tenants <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="space-y-3 text-xs">
                        <div className="flex justify-between py-2 border-b border-border/40">
                            <span className="text-muted-foreground/60 font-bold uppercase tracking-wider text-[10px]">Full Name</span>
                            <span className="font-black text-foreground text-sm">
                                {booking.user?.firstName} {booking.user?.lastName}
                            </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-border/40">
                            <span className="text-muted-foreground/60 font-bold uppercase tracking-wider text-[10px]">Email Address</span>
                            <span className="font-bold text-foreground font-mono">{booking.user?.email || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-border/40">
                            <span className="text-muted-foreground/60 font-bold uppercase tracking-wider text-[10px]">Phone Number</span>
                            <span className="font-bold text-foreground font-mono">{booking.user?.phone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-muted-foreground/60 font-bold uppercase tracking-wider text-[10px]">KYC Verification</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-black text-[9px] uppercase tracking-wider border border-emerald-500/20">
                                Verified
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Property Information */}
                <div className="p-6 md:p-7 rounded-[2rem] bg-card border border-border space-y-5 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-border/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-black">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Property Details</h3>
                                <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">Booked Unit</p>
                            </div>
                        </div>
                        {booking.property?._id && (
                            <button
                                onClick={() => navigate(`/properties/${booking.property._id}`)}
                                className="text-[10px] font-black text-blue-400 uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                View Unit <ExternalLink className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    <div className="space-y-3 text-xs">
                        <div className="flex justify-between py-2 border-b border-border/40">
                            <span className="text-muted-foreground/60 font-bold uppercase tracking-wider text-[10px]">Property Name</span>
                            <span className="font-black text-foreground text-sm">{booking.property?.name}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-border/40">
                            <span className="text-muted-foreground/60 font-bold uppercase tracking-wider text-[10px]">Location</span>
                            <span className="font-medium text-muted-foreground truncate max-w-[200px]">
                                {booking.property?.address}, {booking.property?.city}
                            </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-border/40">
                            <span className="text-muted-foreground/60 font-bold uppercase tracking-wider text-[10px]">Monthly Rent</span>
                            <span className="font-black text-foreground">
                                ₹{(booking.property?.rentAmount || 0).toLocaleString('en-IN')}
                            </span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-muted-foreground/60 font-bold uppercase tracking-wider text-[10px]">Security Deposit</span>
                            <span className="font-black text-cyan-400">
                                ₹{depositAmount.toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Financial & Escrow Verification */}
                <div className="p-6 md:p-7 rounded-[2rem] bg-card border border-border space-y-5 shadow-sm">
                    <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Payment &amp; Escrow Verification</h3>
                            <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">Security Deposit Record</p>
                        </div>
                    </div>

                    <div className="space-y-3 text-xs">
                        <div className="flex justify-between py-2 border-b border-border/40">
                            <span className="text-muted-foreground/60 font-bold uppercase tracking-wider text-[10px]">Deposit Amount</span>
                            <span className="font-black text-foreground">₹{depositAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-border/40">
                            <span className="text-muted-foreground/60 font-bold uppercase tracking-wider text-[10px]">Payment Method</span>
                            <span className="font-bold text-foreground">Razorpay Online Gateway</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-border/40">
                            <span className="text-muted-foreground/60 font-bold uppercase tracking-wider text-[10px]">Transaction ID</span>
                            <span className="font-mono text-muted-foreground font-bold">
                                {booking.razorpayPaymentId || booking.paymentReference || 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-muted-foreground/60 font-bold uppercase tracking-wider text-[10px]">Escrow Protection</span>
                            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-black text-[9px] uppercase tracking-wider border border-cyan-500/20">
                                Protected &amp; Held
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Lease Agreement & E-Signature Status */}
                <div className="p-6 md:p-7 rounded-[2rem] bg-card border border-border space-y-5 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-border/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 font-black">
                                <FileSignature className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Lease &amp; Signature Workflow</h3>
                                <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">Digital Contract Execution</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/leases')}
                            className="text-[10px] font-black text-purple-400 uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            Lease Hub <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="space-y-4 text-xs">
                        {/* Tenant Signature Status */}
                        <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-foreground text-xs">Tenant Signature</p>
                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                    {isTenantSigned
                                        ? `Signed by ${linkedLease?.signedBy || booking.user?.firstName} on ${new Date(linkedLease?.signedAt || Date.now()).toLocaleDateString()}`
                                        : 'Awaiting tenant e-signature review'}
                                </p>
                            </div>
                            <span className={cn(
                                "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                                isTenantSigned
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            )}>
                                {isTenantSigned ? 'Signed ✓' : 'Pending'}
                            </span>
                        </div>

                        {/* Manager Counter-Signature Status */}
                        <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-foreground text-xs">Manager Counter-Signature</p>
                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                    {isManagerSigned
                                        ? `Counter-signed on ${new Date(linkedLease?.managerSignedAt || Date.now()).toLocaleDateString()}`
                                        : (isTenantSigned ? 'Ready for manager counter-signature' : 'Waiting for tenant signature')}
                                </p>
                            </div>
                            <span className={cn(
                                "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                                isManagerSigned
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : (isTenantSigned ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-muted text-muted-foreground/40 border-border")
                            )}>
                                {isManagerSigned ? 'Signed ✓' : (isTenantSigned ? 'Available' : 'Locked')}
                            </span>
                        </div>

                        {/* Counter-Sign Action Button if Tenant Signed */}
                        {isTenantSigned && !isManagerSigned && (
                            <button
                                onClick={() => setShowCounterSignModal(true)}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                            >
                                <FileSignature className="w-4 h-4" /> COUNTER-SIGN LEASE AGREEMENT
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="px-5 py-2.5 rounded-xl border border-border hover:bg-muted text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                    Back to Dashboard
                </button>
                <div className="flex items-center gap-3">
                    {isDepositPaid && (
                        <button
                            onClick={handleDownloadReceipt}
                            disabled={downloadingReceipt}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border hover:bg-muted text-foreground text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                        >
                            <Download className="w-3.5 h-3.5 text-cyan-400" />
                            {downloadingReceipt ? 'Downloading...' : 'Receipt PDF'}
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/leases')}
                        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-primary/20"
                    >
                        View All Leases
                    </button>
                </div>
            </div>

            {/* Manager Counter-Sign Modal */}
            <AnimatePresence>
                {showCounterSignModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-lg rounded-3xl border border-cyan-500/20 bg-card p-6 md:p-8 shadow-2xl space-y-6"
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                                        <FileSignature className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-foreground uppercase tracking-wider">Manager Counter-Signature</h3>
                                        <p className="text-xs text-muted-foreground/60">Complete official execution of the lease agreement.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowCounterSignModal(false)}
                                    className="p-2 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {signingError && (
                                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                                    {signingError}
                                </div>
                            )}

                            {/* Signature Method Tabs */}
                            <div className="flex bg-muted p-1 rounded-2xl gap-1">
                                {[
                                    { id: 'draw', label: 'Draw', icon: PenTool },
                                    { id: 'type', label: 'Type', icon: Type },
                                    { id: 'upload', label: 'Upload', icon: Upload },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => {
                                            setSigTab(tab.id);
                                            setSignatureData('');
                                            setSigningError('');
                                        }}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                                            sigTab === tab.id
                                                ? "bg-card text-cyan-400 shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Method Content */}
                            <div className="min-h-[160px] flex flex-col justify-center border border-border/80 bg-muted/10 rounded-2xl p-3">
                                {sigTab === 'draw' && (
                                    <div className="space-y-2">
                                        <div className="relative border border-dashed border-border rounded-xl overflow-hidden bg-card">
                                            <canvas
                                                ref={canvasRef}
                                                width={600}
                                                height={150}
                                                className="w-full h-32 bg-transparent cursor-crosshair touch-none"
                                                onMouseDown={handleStartDraw}
                                                onMouseMove={handleDraw}
                                                onMouseUp={handleStopDraw}
                                                onMouseLeave={handleStopDraw}
                                                onTouchStart={handleStartDraw}
                                                onTouchMove={handleDraw}
                                                onTouchEnd={handleStopDraw}
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={handleClearDraw}
                                                className="text-[10px] font-bold text-muted-foreground/60 hover:text-foreground uppercase tracking-wider cursor-pointer"
                                            >
                                                Clear Canvas
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {sigTab === 'type' && (
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={typewrittenText}
                                            onChange={(e) => setTypewrittenText(e.target.value)}
                                            placeholder="Type your full legal name..."
                                            className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold focus:outline-none focus:border-cyan-500"
                                        />
                                        <div className="h-20 bg-card rounded-xl border border-dashed border-border flex items-center justify-center p-2">
                                            <span className={cn(
                                                "text-2xl text-cyan-400",
                                                typedFont === 'caveat' && "font-serif italic font-bold",
                                                typedFont === 'pacifico' && "font-mono italic font-bold"
                                            )}>
                                                {typewrittenText || 'Signature Preview'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {sigTab === 'upload' && (
                                    <div className="space-y-3 text-center">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20 cursor-pointer"
                                        />
                                        {signatureData && (
                                            <div className="h-20 bg-card rounded-xl border border-border p-2 flex items-center justify-center">
                                                <img src={signatureData} alt="Uploaded signature" className="max-h-full object-contain" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Printed Name & Agreement */}
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider block mb-1">
                                        Manager Legal Name
                                    </label>
                                    <input
                                        type="text"
                                        value={printedName}
                                        onChange={(e) => setPrintedName(e.target.value)}
                                        placeholder="Full legal name"
                                        className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-muted-foreground/80 leading-relaxed select-none">
                                    <input
                                        type="checkbox"
                                        checked={agreeToTerms}
                                        onChange={(e) => setAgreeToTerms(e.target.checked)}
                                        className="mt-0.5 rounded border-border text-cyan-600 focus:ring-cyan-500"
                                    />
                                    <span>I confirm that the security deposit is received in escrow and I counter-sign this lease agreement on behalf of property management.</span>
                                </label>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCounterSignModal(false)}
                                    className="flex-1 py-3 rounded-xl border border-border hover:bg-muted text-xs font-black uppercase tracking-wider text-muted-foreground transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCounterSignLease}
                                    disabled={signingLoading}
                                    className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-600/30 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {signingLoading ? 'Counter-Signing...' : 'Confirm & Execute'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

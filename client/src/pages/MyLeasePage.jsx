import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { leaseService, paymentService } from '../services/api';
import {
    Home, Calendar, CreditCard, FileText, CheckCircle2, Clock,
    AlertTriangle, Building2, Wifi, Car, Droplets, Zap, Wind,
    Wallet, ArrowRight, RefreshCw, Info, Shield, Hash, Phone,
    Mail, MapPin, Bed, Bath, ChevronDown, ChevronUp,
    PenTool, Type, Upload, Fingerprint, FileSignature, FileCheck,
    ChevronLeft, ChevronRight, User, IdCard, CreditCard as CreditCardIcon,
    CheckSquare, XCircle, ExternalLink, Loader2
} from 'lucide-react';
import { cn } from '../utils/cn';
import {
    LeaseTimeline,
    LeaseDocuments,
    SecurityDepositCard,
    LeaseRenewalCard,
    LeasePropertyMediaGallery,
} from '../components/lease';

const AMENITY_ICON = {
    wifi: Wifi, parking: Car, water: Droplets,
    electricity: Zap, ac: Wind, default: Home,
};

const STATUS_CONFIG = {
    active: { label: 'Active', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25', dot: 'bg-emerald-500 animate-pulse dark:bg-emerald-400' },
    pending: { label: 'Pending Signature', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25', dot: 'bg-amber-500 animate-pulse dark:bg-amber-400' },
    expired: { label: 'Expired', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/25', dot: 'bg-rose-500 dark:bg-rose-400' },
    terminated: { label: 'Terminated', color: 'text-muted-foreground/40', bg: 'bg-muted border-border', dot: 'bg-muted-foreground/20' },
};

const PAY_STATUS = {
    paid: { label: 'Paid', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    pending: { label: 'Due', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    overdue: { label: 'Overdue', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    partially_paid: { label: 'Partial', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
};

function LeaseProgressBar({ startDate, endDate }) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const pct = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
    const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                <span>{new Date(startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="text-emerald-600 dark:text-emerald-400">{pct}% complete · {daysLeft} days left</span>
                <span>{new Date(endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 relative"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.4, duration: 1.4, ease: 'easeOut' }}
                >
                    <div className="absolute right-0 top-0 h-full w-4 bg-white/20 rounded-full blur-sm" />
                </motion.div>
            </div>
        </div>
    );
}

export default function MyLeasePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [lease, setLease] = useState(null);
    const [activeLeases, setActiveLeases] = useState([]);
    const [pastLeases, setPastLeases] = useState([]);
    const [selectedLeaseIndex, setSelectedLeaseIndex] = useState(0);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAllPayments, setShowAllPayments] = useState(false);

    const scrollRef = useRef(null);

    // Pre-lease Checklist State
    const [checklist, setChecklist] = useState(null);
    const [checklistLoading, setChecklistLoading] = useState(false);

    const scrollActiveLeases = (direction) => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' 
                ? scrollLeft - clientWidth 
                : scrollLeft + clientWidth;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    const handleScroll = (e) => {
        const { scrollLeft, clientWidth } = e.target;
        if (clientWidth > 0) {
            const index = Math.round(scrollLeft / clientWidth);
            if (index !== selectedLeaseIndex && index >= 0 && index < activeLeases.length) {
                setSelectedLeaseIndex(index);
            }
        }
    };

    // E-Signature States
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [printedName, setPrintedName] = useState('');
    const [sigTab, setSigTab] = useState('draw'); // 'draw' | 'type' | 'upload'
    const [typedFont, setTypedFont] = useState('caveat'); // 'caveat' | 'pacifico' | 'delafield'
    const [typewrittenText, setTypewrittenText] = useState('');
    const [signatureData, setSignatureData] = useState(''); // base64 Data URL
    const [signingError, setSigningError] = useState('');
    const [signingLoading, setSigningLoading] = useState(false);

    // Canvas Draw Refs & State
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const fetchLeaseData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [leaseRes, payRes] = await Promise.allSettled([
                leaseService.getMyLease(),
                paymentService.getMyPayments(),
            ]);
            if (leaseRes.status === 'fulfilled') {
                const resVal = leaseRes.value || {};
                const activeLeasesData = resVal.activeLeases || (resVal.data ? [resVal.data] : []);
                setLease(resVal.data || null);
                setActiveLeases(activeLeasesData);
                setPastLeases(resVal.pastLeases || []);

                const targetLeaseId = location.state?.leaseId || new URLSearchParams(location.search).get('leaseId');
                const targetPropId = location.state?.propertyId || new URLSearchParams(location.search).get('propertyId');
                if (targetLeaseId || targetPropId) {
                    const idx = activeLeasesData.findIndex(l => 
                        (targetLeaseId && String(l._id) === String(targetLeaseId)) ||
                        (targetPropId && (String(l.property?._id) === String(targetPropId) || String(l.property) === String(targetPropId)))
                    );
                    if (idx !== -1) {
                        setSelectedLeaseIndex(idx);
                    }
                }
            }
            if (payRes.status === 'fulfilled') {
                const payVal = payRes.value || {};
                setPayments(payVal.data || (Array.isArray(payVal) ? payVal : []));
            }
        } catch (e) { console.error('Error fetching lease data:', e); }
        if (!isSilent) setLoading(false);
    };

    // Fetch checklist dynamically for the currently selected lease
    useEffect(() => {
        const currentLease = activeLeases[selectedLeaseIndex];
        if (currentLease && currentLease.status === 'pending' && !currentLease.signature) {
            fetchChecklist(currentLease._id);
        } else {
            setChecklist(null);
        }
    }, [selectedLeaseIndex, activeLeases]);

    const fetchChecklist = async (leaseId) => {
        if (!leaseId) return;
        setChecklistLoading(true);
        try {
            // apiClient interceptor already unwraps axios response to response.data
            // so `res` here is the server's JSON body: { success, data: { allComplete, items, meta } }
            const res = await leaseService.getLeaseChecklist(leaseId);
            // Store the nested `data` object directly so widget can access items/meta/allComplete flatly
            setChecklist(res?.data || null);
        } catch (e) {
            console.error('Error fetching checklist:', e);
            setChecklist(null);
        } finally {
            setChecklistLoading(false);
        }
    };

    useEffect(() => {
        console.log('[MyLeasePage] Destination page loaded');
        fetchLeaseData();

        // Re-fetch whenever the user returns to this page/tab (e.g. after uploading KYC)
        // Throttled to at most once every 30 seconds to avoid hammering the server on every alt-tab
        let lastFetchTime = Date.now();

        const maybeRefresh = () => {
            const now = Date.now();
            if (now - lastFetchTime > 1_500) {
                lastFetchTime = now;
                fetchLeaseData(true); // Silent background refresh!
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') maybeRefresh();
        };
        const handleFocus = () => maybeRefresh();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    // Canvas Drawing Helpers
    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
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
        e.preventDefault(); // Prevent scrolling on touch screens
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const { x, y } = getCoordinates(e);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#10b981'; // Emerald-500
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

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureData('');
    };

    // Typed Signature Helper
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
        ctx.fillStyle = '#059669'; // Emerald-600
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        return canvas.toDataURL();
    };

    // Upload Signature Helper
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

    // Submit Signature
    const handleSignLease = async (e) => {
        e.preventDefault();
        setSigningError('');
        if (!agreeToTerms) {
            setSigningError('You must agree to the terms & conditions.');
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

        setSigningLoading(true);
        try {
            const res = await leaseService.signLease(currentLease._id, {
                signature: finalSig,
                signatureType: sigTab,
                signedBy: printedName,
            });
            if (res.data?.success || res.success) {
                // Refresh local states
                fetchLeaseData();
            }
        } catch (err) {
            setSigningError(err.response?.data?.message || err.message || 'Failed to sign lease');
        } finally {
            setSigningLoading(false);
        }
    };

    const currentLease = activeLeases[selectedLeaseIndex] || lease || null;
    const isUnsigned = Boolean(currentLease && (!currentLease.signature || !currentLease.signedBy || !currentLease.signedAt));
    const statusCfg = isUnsigned ? STATUS_CONFIG.pending : (STATUS_CONFIG[currentLease?.status] || STATUS_CONFIG.pending);
    const currentLeasePayments = currentLease ? payments.filter(p => {
        const pLeaseId = String(p.lease?._id || p.lease || '');
        const cLeaseId = String(currentLease._id || '');
        const pPropId = String(p.property?._id || p.property || '');
        const cPropId = String(currentLease.property?._id || currentLease.property || '');
        return (pLeaseId && pLeaseId === cLeaseId) || (pPropId && pPropId === cPropId);
    }) : [];
    const paidPayments = currentLeasePayments.filter(p => p.status === 'paid');
    const pendingPay = currentLeasePayments.find(p => ['pending', 'overdue'].includes(p.status));
    const totalPaid = paidPayments.reduce((s, p) => s + (p.amountPaid || p.amount || 0), 0);
    const visiblePay = showAllPayments ? currentLeasePayments : currentLeasePayments.slice(0, 6);

    return (
        <div className="space-y-5 pb-10">
            <style dangerouslySetInnerHTML={{__html: `
                .scrollbar-none::-webkit-scrollbar {
                    display: none;
                }
            `}} />
            {/* Page Header */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-6 rounded-full bg-emerald-500" />
                        <p className="text-[10px] font-black uppercase tracking-[.25em] text-emerald-600 dark:text-emerald-400">My Tenancy</p>
                    </div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">Lease &amp; Rent 🏠</h1>
                    <p className="text-muted-foreground/40 text-sm mt-0.5">All your tenancy details in one place</p>
                </div>
                {pendingPay && (
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => navigate('/pay-now')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20">
                        <Wallet className="w-4 h-4" /> Pay Rent Now
                    </motion.button>
                )}
            </motion.div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center h-52">
                    <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                </div>
            )}

            {/* No Lease */}
            {!loading && activeLeases.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center gap-6 py-24 rounded-[2rem] border-2 border-dashed border-border bg-card/50">
                    <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center">
                        <Home className="w-10 h-10 text-muted-foreground/20" />
                    </div>
                    <div className="text-center">
                        <p className="font-black text-foreground text-xl">No Active Lease Found</p>
                        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">Your property manager hasn't set up your lease yet or your email doesn't match.</p>
                    </div>
                    <button onClick={() => navigate('/messages')}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-black hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                        <Mail className="w-4 h-4" /> Message Manager
                    </button>
                </motion.div>
            )}

            {!loading && activeLeases.length > 0 && (
                <>
                    {/* ── Pending Signature Warning Banner ── */}
                    {isUnsigned && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="p-4.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-start gap-3.5 shadow-sm">
                            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-wider">Lease Pending Signature</h4>
                                <p className="text-xs opacity-80 mt-1 leading-relaxed">
                                    Please review all the terms and conditions of this lease. Once you are satisfied, draw, type, or upload your signature at the bottom of the page to activate your tenancy.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {currentLease.status === 'pending' && currentLease.signature && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="p-4.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-start gap-3.5 shadow-sm">
                            <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-wider">Lease Signed – Upcoming Tenancy</h4>
                                <p className="text-xs opacity-80 mt-1 leading-relaxed">
                                    This lease agreement has been successfully signed and verified. It is scheduled to automatically activate on {new Date(currentLease.startDate).toLocaleDateString('en-IN')}.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Pre-Lease Requirements Checklist ── */}
                    {isUnsigned && (
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                                        <CheckSquare className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-foreground">Pre-Lease Requirements</h3>
                                        <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-0.5">
                                            {checklist ? (
                                                checklist.allComplete
                                                    ? 'All requirements met — you may now sign'
                                                    : `${Object.values(checklist.items || {}).filter(Boolean).length}/4 completed`
                                            ) : 'Complete all steps before signing'}
                                        </p>
                                    </div>
                                </div>
                                {checklistLoading ? (
                                    <Loader2 className="w-4 h-4 text-muted-foreground/40 animate-spin" />
                                ) : (
                                    <button
                                        onClick={() => fetchChecklist(currentLease._id)}
                                        className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-colors flex items-center gap-1"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Refresh
                                    </button>
                                )}
                            </div>

                            {/* Checklist Items */}
                            <div className="divide-y divide-border/40">
                                {[
                                    {
                                        key: 'profileComplete',
                                        icon: User,
                                        label: 'Complete Profile',
                                        desc: 'First name, last name, and phone number',
                                        action: { label: 'Go to Profile', link: '/profile' },
                                    },
                                    {
                                        key: 'kycComplete',
                                        icon: IdCard,
                                        label: 'Upload Identity Document',
                                        desc: 'Government-issued ID or proof of identity (KYC)',
                                        action: { label: 'Upload Now', link: '/profile' },
                                    },
                                    {
                                        key: 'depositPaid',
                                        icon: CreditCardIcon,
                                        label: 'Pay Security Deposit',
                                        desc: checklist?.meta?.depositAmount
                                            ? `₹${Number(checklist.meta.depositAmount).toLocaleString('en-IN')} security deposit`
                                            : 'Security deposit payment',
                                        action: checklist?.meta?.bookingId
                                            ? { label: 'Pay Now', link: `/bookings/${checklist.meta.bookingId}` }
                                            : { label: 'View Bookings', link: '/dashboard' },
                                    },
                                    {
                                        key: 'leaseSigned',
                                        icon: FileSignature,
                                        label: 'Sign Lease Agreement',
                                        desc: 'E-sign the lease agreement below',
                                        action: null, // handled inline on this page
                                    },
                                ].map((item, i) => {
                                    const done = checklist?.items?.[item.key] ?? false;
                                    const Icon = item.icon;
                                    return (
                                        <div key={item.key} className={cn(
                                            'flex items-center gap-4 px-5 py-3.5 transition-colors',
                                            done ? 'bg-emerald-500/5' : 'hover:bg-muted/40'
                                        )}>
                                            {/* Step Number / Check */}
                                            <div className={cn(
                                                'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black transition-all',
                                                done
                                                    ? 'bg-emerald-500/15 text-emerald-500'
                                                    : 'bg-muted border border-border text-muted-foreground/40'
                                            )}>
                                                {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                            </div>

                                            {/* Label */}
                                            <div className="flex-1 min-w-0">
                                                <p className={cn(
                                                    'text-xs font-black leading-none mb-0.5',
                                                    done ? 'text-emerald-600 dark:text-emerald-400 line-through opacity-70' : 'text-foreground'
                                                )}>{item.label}</p>
                                                <p className="text-[9px] text-muted-foreground/50 truncate">{item.desc}</p>
                                            </div>

                                            {/* Status / Action */}
                                            <div className="flex-shrink-0">
                                                {done ? (
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                                                        ✓ Done
                                                    </span>
                                                ) : item.action ? (
                                                    <button
                                                        onClick={() => navigate(item.action.link)}
                                                        className="text-[8px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-lg hover:bg-indigo-500/20 transition-colors flex items-center gap-1"
                                                    >
                                                        {item.action.label} <ExternalLink className="w-2.5 h-2.5" />
                                                    </button>
                                                ) : (
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                                                        Below ↓
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer progress bar */}
                            {checklist && (
                                <div className="px-5 py-3 bg-muted/20 border-t border-border/40">
                                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1.5">
                                        <span>Progress</span>
                                        <span>{Object.values(checklist.items || {}).filter(Boolean).length} / 4</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(Object.values(checklist.items || {}).filter(Boolean).length / 4) * 100}%` }}
                                            transition={{ duration: 0.6, ease: 'easeOut' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── Active Leases Horizontal Carousel Row ── */}
                    <div className="relative group/scroll w-full">
                        {/* Left Arrow Button */}
                        {activeLeases.length > 1 && (
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => scrollActiveLeases('left')}
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/80 hover:bg-background border border-border shadow-lg flex items-center justify-center text-foreground backdrop-blur-sm opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300"
                            >
                                <ChevronLeft className="w-6 h-6 text-muted-foreground" />
                            </motion.button>
                        )}

                        {/* Right Arrow Button */}
                        {activeLeases.length > 1 && (
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => scrollActiveLeases('right')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/80 hover:bg-background border border-border shadow-lg flex items-center justify-center text-foreground backdrop-blur-sm opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300"
                            >
                                <ChevronRight className="w-6 h-6 text-muted-foreground" />
                            </motion.button>
                        )}

                        {/* Horizontal Scroll Container */}
                        <div
                            ref={scrollRef}
                            onScroll={handleScroll}
                            className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {activeLeases.map((actLease, idx) => {
                                const actStatusCfg = (actLease.status === 'pending' && actLease.signature) ? {
                                    label: 'Upcoming',
                                    color: 'text-indigo-200 border-indigo-500/30',
                                    bg: 'bg-indigo-500/20',
                                    dot: 'bg-indigo-400'
                                } : (STATUS_CONFIG[actLease.status] || STATUS_CONFIG.pending);
                                return (
                                    <motion.div
                                        key={actLease._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn(
                                            "snap-start shrink-0 w-full relative overflow-hidden rounded-[2.5rem] border p-6 md:p-10 shadow-2xl transition-all duration-300",
                                            selectedLeaseIndex === idx ? "border-emerald-500/40" : "border-emerald-500/10 opacity-70"
                                        )}
                                        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}
                                    >
                                        {/* Orbs */}
                                        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
                                        <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

                                        <div className="relative z-10">
                                            {/* Top row */}
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <span className={cn('flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest backdrop-blur-md', actStatusCfg.bg, actStatusCfg.color)}>
                                                            <span className={cn('w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]', actStatusCfg.dot)} />
                                                            {actStatusCfg.label}
                                                        </span>
                                                        {actLease.leaseNumber && (
                                                            <span className="flex items-center gap-1 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] bg-white/5 px-3 py-1.5 rounded-full">
                                                                <Hash className="w-3 h-3" />{actLease.leaseNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h2 className="text-4xl font-black text-white tracking-tight leading-tight">{actLease.property?.name || 'Your Property'}</h2>
                                                    <p className="flex items-center gap-2 text-emerald-100/60 text-sm mt-3 font-medium">
                                                        <span className="p-1.5 rounded-lg bg-white/10"><MapPin className="w-3.5 h-3.5" /></span> {actLease.property?.address || '—'}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0 flex flex-col items-end">
                                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Monthly Rent</p>
                                                    <p className="text-6xl font-black text-white drop-shadow-2xl">₹{(actLease.rentAmount || 0).toLocaleString('en-IN')}</p>
                                                    {actLease.depositAmount > 0 && (
                                                        <div className="mt-3 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                                                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Deposit: ₹{actLease.depositAmount.toLocaleString('en-IN')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Progress */}
                                            <div className="mb-6">
                                                <LeaseProgressBar startDate={actLease.startDate} endDate={actLease.endDate} />
                                            </div>

                                            {(() => {
                                                const end = new Date(actLease.endDate).getTime();
                                                const now = new Date().getTime();
                                                const diff = end - now;
                                                const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
                                                if (daysRemaining <= 30) {
                                                    return (
                                                        <div className="mb-6 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                            <div>
                                                                <p className="text-sm font-black text-amber-500">Attention: Lease Expiry Approaching</p>
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    Your lease expires in {daysRemaining} days. Please select your renewal preference before expiration.
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => navigate('/lease-decision')}
                                                                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl transition-all w-full md:w-auto"
                                                            >
                                                                Renew or Move Out
                                                            </button>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {/* Key dates grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {[
                                                    { label: 'Start Date', value: new Date(actLease.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), icon: Calendar },
                                                    { label: 'End Date', value: new Date(actLease.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), icon: Calendar },
                                                    { label: 'Frequency', value: 'Monthly', icon: RefreshCw },
                                                    { label: 'Protection', value: 'Lease Guard', icon: Shield },
                                                ].map((item) => {
                                                    return (
                                                        <div key={item.label} className="p-4 rounded-2xl bg-muted border border-border hover:bg-muted/80 transition-all group">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transform group-hover:scale-110 transition-transform">
                                                                    <item.icon className="w-3.5 h-3.5" />
                                                                </div>
                                                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">{item.label}</p>
                                                            </div>
                                                            <p className="text-sm font-black text-foreground">{item.value}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Property Media Gallery ── */}
                    {currentLease?.property && (
                        <LeasePropertyMediaGallery
                            property={currentLease.property}
                            leaseId={currentLease._id}
                        />
                    )}

                    {/* ── Property Details + Utilities ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Unit details */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm font-black text-foreground uppercase tracking-wider">Unit Details</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: 'Property Type', value: currentLease.property?.type || '—' },
                                    { label: 'Bedrooms', value: currentLease.property?.bedrooms != null ? `${currentLease.property.bedrooms} Bed` : '—' },
                                    { label: 'Bathrooms', value: currentLease.property?.bathrooms != null ? `${currentLease.property.bathrooms} Bath` : '—' },
                                    { label: 'Floor Level', value: currentLease.property?.floor ? `${currentLease.property.floor} Floor` : 'Main Level' },
                                ].map(r => (
                                    <div key={r.label} className="flex items-center justify-between py-3.5 border-b border-border/50 last:border-0">
                                        <span className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">{r.label}</span>
                                        <span className="text-sm font-black text-foreground capitalize">{r.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Amenities */}
                            {currentLease.property?.amenities?.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-border">
                                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4 text-center">Included Amenities</p>
                                    <div className="flex flex-wrap gap-2.5">
                                        {currentLease.property.amenities.map(a => {
                                            const Icon = AMENITY_ICON[a.toLowerCase()] || AMENITY_ICON.default;
                                            return (
                                                <span key={a} className="flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-xs font-black text-emerald-700 dark:text-emerald-400 capitalize hover:bg-emerald-500/10 transition-colors">
                                                    <Icon className="w-3.5 h-3.5" /> {a}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* Utilities included */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                            className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-black text-foreground uppercase tracking-wider">Utilities &amp; Terms</p>
                            </div>

                            {/* Utilities object */}
                            {currentLease.utilities && Object.keys(currentLease.utilities).length > 0 ? (
                                <div className="space-y-3.5 mb-6">
                                    {Object.entries(currentLease.utilities).map(([key, val]) => (
                                        <div key={key} className="flex items-center justify-between">
                                            <span className="text-[10px] text-muted-foreground/40 font-black capitalize uppercase tracking-widest">{key}</span>
                                            <span className={cn('text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm',
                                                val ? 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/10' : 'text-muted-foreground/30 bg-muted border border-border')}>
                                                {val ? 'Included' : 'Not included'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground/40 mb-6 font-medium italic">No utility details recorded</p>
                            )}

                            {/* Terms */}
                            {currentLease.terms && (
                                <div className="pt-6 border-t border-border">
                                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-3">Lease Terms</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">{currentLease.terms}</p>
                                </div>
                            )}

                            {/* Payment summary */}
                            <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center hover:bg-emerald-500/10 transition-all group">
                                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">{paidPayments.length}</p>
                                    <p className="text-[9px] font-black text-emerald-600/50 dark:text-emerald-400/50 uppercase tracking-[0.2em] mt-2">Payments Made</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-center hover:bg-blue-500/10 transition-all group">
                                    <p className="text-3xl font-black text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">₹{Math.round(totalPaid / 1000)}K</p>
                                    <p className="text-[9px] font-black text-blue-600/50 dark:text-blue-400/50 uppercase tracking-[0.2em] mt-2">Total Paid</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* ── Tenant Details ── */}
                    {currentLease.tenant && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                            className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2.5 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-black text-foreground uppercase tracking-wider">Tenant on Record</p>
                            </div>
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-black flex-shrink-0 shadow-lg shadow-emerald-500/20">
                                    {currentLease.tenant.firstName?.[0]}{currentLease.tenant.lastName?.[0]}
                                </div>
                                <div className="flex-1">
                                    <p className="text-lg font-black text-foreground">{currentLease.tenant.firstName} {currentLease.tenant.lastName}</p>
                                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                                        {currentLease.tenant.email && (
                                            <span className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                                <span className="p-1 rounded bg-muted"><Mail className="w-3.5 h-3.5" /></span> {currentLease.tenant.email}
                                            </span>
                                        )}
                                        {currentLease.tenant.phone && (
                                            <span className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                                <span className="p-1 rounded bg-muted"><Phone className="w-3.5 h-3.5" /></span> {currentLease.tenant.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Payment History ── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                        className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-2">
                                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-black text-foreground uppercase tracking-wider">Payment Schedule</p>
                            </div>
                            <button onClick={() => navigate('/payments')}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary-600 dark:text-primary-400 text-xs font-black uppercase tracking-widest hover:bg-primary/20 transition-all">
                                View Full <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {currentLeasePayments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground/40">
                                <CreditCard className="w-10 h-10" />
                                <p className="text-sm font-bold">No payment records yet</p>
                            </div>
                        ) : (
                            <>
                                {/* Table header */}
                                <div className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b border-border bg-muted/50 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                                    <div className="col-span-4">Billing Period</div>
                                    <div className="col-span-2">Amount</div>
                                    <div className="col-span-3">Due Date</div>
                                    <div className="col-span-2">Status</div>
                                    <div className="col-span-1"></div>
                                </div>

                                <div className="divide-y divide-border/50">
                                    <AnimatePresence initial={false}>
                                        {visiblePay.map((p, i) => {
                                            const sc = PAY_STATUS[p.status] || PAY_STATUS.pending;
                                            const Icon = p.status === 'paid' ? CheckCircle2 : p.status === 'overdue' ? AlertTriangle : Clock;
                                            const owed = (p.amount || 0) - (p.amountPaid || 0);
                                            return (
                                                <motion.div key={p._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.04 }}
                                                    className="grid grid-cols-12 gap-4 items-center px-6 py-4.5 hover:bg-muted/30 transition-colors group">
                                                    <div className="col-span-4">
                                                        <p className="text-sm font-black text-foreground">
                                                            {p.type === 'security_deposit' 
                                                                ? 'Security Deposit & Escrow' 
                                                                : (p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Rent Payment')}
                                                        </p>
                                                        {p.paymentDate && (
                                                            <p className="text-[10px] font-black text-emerald-600/50 dark:text-emerald-400/50 uppercase tracking-widest mt-0.5">Paid {new Date(p.paymentDate).toLocaleDateString()}</p>
                                                        )}
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="text-sm font-black text-foreground">₹{(p.amount || 0).toLocaleString('en-IN')}</p>
                                                        {p.amountPaid > 0 && p.status !== 'paid' && (
                                                            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5">Paid: ₹{p.amountPaid.toLocaleString('en-IN')}</p>
                                                        )}
                                                    </div>
                                                    <div className="col-span-3">
                                                        <p className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-widest">
                                                            {p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—')}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-black', sc.bg, sc.color)}>
                                                            <Icon className="w-2.5 h-2.5" /> {sc.label}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-1 text-right">
                                                        {owed > 0 && p.status !== 'paid' && (
                                                            <button onClick={() => navigate('/payments')}
                                                                className="opacity-0 group-hover:opacity-100 text-[9px] font-black px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all">
                                                                Pay
                                                            </button>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>

                                {currentLeasePayments.length > 6 && (
                                    <div className="px-6 py-4 border-t border-border bg-muted/20">
                                        <button onClick={() => setShowAllPayments(v => !v)}
                                            className="w-full flex items-center justify-center gap-2 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 hover:text-foreground transition-colors">
                                            {showAllPayments ? <><ChevronUp className="w-4 h-4" /> Show less</> : <><ChevronDown className="w-4 h-4" /> Show all {currentLeasePayments.length} payments</>}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>

                    {/* ── Enterprise V3.0.1 Feature Expansion Modules ── */}
                    <LeaseTimeline lease={currentLease} />
                    <LeaseDocuments lease={currentLease} />
                    <SecurityDepositCard lease={currentLease} />
                    {/* Lease Renewal Center Card */}
                    <LeaseRenewalCard lease={currentLease} onRenew={() => navigate('/lease-renewal')} />

                    {/* ── Lease E-Signature & Agreement Panel ── */}
                    {isUnsigned && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                            className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-xl space-y-6">
                            
                            <div className="flex items-center gap-3 pb-4 border-b border-border">
                                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                                    <FileSignature className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-foreground uppercase tracking-wider">Lease E-Signature &amp; Legal Consent</h3>
                                    <p className="text-xs text-muted-foreground/60">Digitally sign and activate your lease contract securely.</p>
                                </div>
                            </div>

                            {signingError && (
                                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-semibold">
                                    {signingError}
                                </div>
                            )}

                            {/* Tab Headers */}
                            <div className="flex bg-muted p-1 rounded-2xl gap-1">
                                {[
                                    { id: 'draw', label: 'Draw Signature', icon: PenTool },
                                    { id: 'type', label: 'Type Signature', icon: Type },
                                    { id: 'upload', label: 'Upload Image', icon: Upload },
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
                                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                                            sigTab === tab.id
                                                ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Contents */}
                            <div className="min-h-[180px] flex flex-col justify-center border border-border/80 bg-muted/10 rounded-2xl p-4">
                                {sigTab === 'draw' && (
                                    <div className="space-y-3">
                                        <div className="relative border border-dashed border-border rounded-xl overflow-hidden bg-card transition-colors">
                                            <canvas
                                                ref={canvasRef}
                                                width={600}
                                                height={150}
                                                className="w-full h-36 bg-transparent cursor-crosshair touch-none"
                                                onMouseDown={handleStartDraw}
                                                onMouseMove={handleDraw}
                                                onMouseUp={handleStopDraw}
                                                onMouseLeave={handleStopDraw}
                                                onTouchStart={handleStartDraw}
                                                onTouchMove={handleDraw}
                                                onTouchEnd={handleStopDraw}
                                            />
                                            {!signatureData && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/30 text-xs font-semibold uppercase tracking-wider">
                                                    Draw your signature here
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={clearCanvas}
                                                className="px-4 py-2 rounded-xl border border-border text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                            >
                                                Clear Board
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {sigTab === 'type' && (
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Type your signature</label>
                                            <input
                                                type="text"
                                                placeholder="Enter full name"
                                                value={typewrittenText}
                                                onChange={e => setTypewrittenText(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm placeholder-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-all font-bold"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            {[
                                                { id: 'caveat', name: 'Caveat Font', style: "font-['Caveat']" },
                                                { id: 'pacifico', name: 'Pacifico Font', style: "font-['Pacifico']" },
                                                { id: 'delafield', name: 'Mrs Saint Delafield', style: "font-['Mrs_Saint_Delafield']" },
                                            ].map(font => (
                                                <button
                                                    key={font.id}
                                                    type="button"
                                                    onClick={() => setTypedFont(font.id)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all",
                                                        typedFont === font.id
                                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                                            : "bg-card border-border text-muted-foreground hover:border-muted-foreground/30"
                                                    )}
                                                >
                                                    {font.name}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="h-28 rounded-xl bg-card border border-border flex items-center justify-center overflow-hidden shadow-inner p-4">
                                            {typewrittenText ? (
                                                <p
                                                    className={cn(
                                                        "text-4xl text-emerald-600 dark:text-emerald-400 select-none tracking-normal truncate px-4",
                                                        typedFont === 'caveat' && "font-['Caveat'] font-bold",
                                                        typedFont === 'pacifico' && "font-['Pacifico']",
                                                        typedFont === 'delafield' && "font-['Mrs_Saint_Delafield'] text-5xl"
                                                    )}
                                                    style={{
                                                        fontFamily: typedFont === 'caveat' ? "'Caveat', cursive" :
                                                                    typedFont === 'pacifico' ? "'Pacifico', cursive" :
                                                                    "'Mrs Saint Delafield', cursive"
                                                    }}
                                                >
                                                    {typewrittenText}
                                                </p>
                                            ) : (
                                                <p className="text-muted-foreground/30 text-xs font-semibold uppercase tracking-wider">Signature Preview</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {sigTab === 'upload' && (
                                    <div className="space-y-4">
                                        <div className="relative h-32 rounded-xl border border-dashed border-border bg-card flex flex-col items-center justify-center p-4 hover:border-muted-foreground/30 transition-colors">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            {signatureData ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <img src={signatureData} alt="Uploaded signature" className="max-h-20 object-contain" />
                                                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Image Loaded Successfully</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-center">
                                                    <Upload className="w-6 h-6 text-muted-foreground/40" />
                                                    <div>
                                                        <p className="text-xs font-black text-foreground uppercase tracking-wider">Click or drag image file here</p>
                                                        <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest mt-1">Supports PNG, JPG (Max 2MB)</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {signatureData && (
                                            <div className="flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => setSignatureData('')}
                                                    className="px-4 py-2 rounded-xl border border-border text-xs font-black uppercase tracking-wider text-rose-500 hover:bg-rose-500/10 transition-colors"
                                                >
                                                    Remove Image
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Consent Checkbox */}
                            <label className="flex gap-3 items-start select-none cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={agreeToTerms}
                                    onChange={e => setAgreeToTerms(e.target.checked)}
                                    className="mt-1 w-4.5 h-4.5 rounded text-emerald-600 focus:ring-emerald-500 border-border bg-card transition-all"
                                />
                                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed font-semibold">
                                    I agree that this digital signature is a legally binding representation of my physical signature and I consent to all terms, rules, and conditions outlined in this lease agreement.
                                </span>
                            </label>

                            {/* Printed legal name & button */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end pt-4 border-t border-border">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Printed Legal Name *</label>
                                    <input
                                        type="text"
                                        placeholder="Enter legal name"
                                        value={printedName}
                                        onChange={e => setPrintedName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-all font-bold"
                                    />
                                </div>
                                {/* Deposit-not-paid guard message */}
                                {checklist && !checklist?.items?.depositPaid && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                        <p className="text-xs font-bold">
                                            Security deposit payment required before signing.{' '}
                                            {checklist?.meta?.bookingId && (
                                                <button
                                                    onClick={() => navigate(`/bookings/${checklist.meta.bookingId}`)}
                                                    className="underline font-black hover:no-underline"
                                                >
                                                    Pay now →
                                                </button>
                                            )}
                                        </p>
                                    </div>
                                )}
                                <button
                                    onClick={handleSignLease}
                                    disabled={signingLoading || (checklist && !checklist?.items?.depositPaid)}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm shadow-lg shadow-emerald-500/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Fingerprint className="w-4 h-4" />
                                    {signingLoading ? 'Processing signature...' : 'Sign & Activate Lease'}
                                </button>
                            </div>

                        </motion.div>
                    )}

                    {/* ── Digital Signature Stamp Section ── */}
                    {((currentLease.status === 'active') || (currentLease.status === 'pending' && currentLease.signature)) && currentLease.signature && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                            className="rounded-3xl border border-emerald-500/20 bg-card p-6 md:p-8 shadow-lg relative overflow-hidden">
                            {/* Watermark background icon */}
                            <div className="absolute right-6 top-6 opacity-[0.03] pointer-events-none text-emerald-500">
                                <Shield className="w-48 h-48" />
                            </div>

                            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
                                {/* Left Side audit card */}
                                <div className="flex-1 space-y-4 w-full">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                            <FileCheck className="w-5 h-5" />
                                        </div>
                                        <h4 className="text-sm font-black text-foreground uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Verified Lease Sign-off</h4>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between py-1.5 border-b border-border/40">
                                            <span className="text-muted-foreground/50 font-bold uppercase tracking-wider text-[10px]">Signed By</span>
                                            <span className="font-black text-foreground">{currentLease.signedBy}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-border/40">
                                            <span className="text-muted-foreground/50 font-bold uppercase tracking-wider text-[10px]">Signed On</span>
                                            <span className="font-black text-foreground">{new Date(currentLease.signedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-border/40">
                                            <span className="text-muted-foreground/50 font-bold uppercase tracking-wider text-[10px]">Signing IP Address</span>
                                            <span className="font-black text-foreground font-mono">{currentLease.tenantSignatureIp}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-border/40">
                                            <span className="text-muted-foreground/50 font-bold uppercase tracking-wider text-[10px]">Signature Type</span>
                                            <span className="font-black text-foreground capitalize">{currentLease.signatureType || 'Digital Drawing'}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-border/40">
                                            <span className="text-muted-foreground/50 font-bold uppercase tracking-wider text-[10px]">Verification Fingerprint</span>
                                            <span className="font-bold text-muted-foreground font-mono text-[9px] truncate max-w-[150px]">{currentLease._id}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side Signature Image Rendering */}
                                <div className="flex flex-col items-center justify-center p-4 bg-muted/20 border border-border rounded-2xl w-full md:w-64 select-none relative group overflow-hidden">
                                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                                        <Shield className="w-2.5 h-2.5" /> SECURE
                                    </div>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/30 mb-2">TENANT SIGNATURE</p>
                                    <div className="w-full h-24 bg-card rounded-xl border border-border/60 p-2 flex items-center justify-center relative shadow-inner overflow-hidden">
                                        <img src={currentLease.signature} alt="Verified digital signature" className="max-h-full max-w-full object-contain pointer-events-none filter dark:brightness-110" />
                                    </div>
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-600/40 dark:text-emerald-400/40 mt-2 text-center">VERIFIED ELECTRONIC RECORD</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Quick Actions ── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                            { label: 'Pay Rent', sub: pendingPay ? `₹${(pendingPay.amount || 0).toLocaleString('en-IN')} due` : 'All clear ✓', icon: Wallet, color: 'from-emerald-600 to-teal-600', path: '/pay-now' },
                            { label: 'Report Issue', sub: 'Submit maintenance', icon: Home, color: 'from-amber-600 to-orange-600', path: '/maintenance' },
                            { label: 'Message Manager', sub: 'Ask a question', icon: Mail, color: 'from-indigo-600 to-violet-600', path: '/messages' },
                        ].map(a => {
                            const Icon = a.icon;
                            return (
                                <motion.button key={a.label} whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate(a.path)}
                                    className={cn('flex items-center gap-4 p-5 rounded-[2rem] bg-gradient-to-r text-white shadow-xl text-left transition-all', a.color)}>
                                    <div className="p-3.5 rounded-2xl bg-white/10 flex-shrink-0 backdrop-blur-md border border-white/10">
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-black text-sm uppercase tracking-wider">{a.label}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">{a.sub}</p>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </motion.div>
                </>
            )}
        </div>
    );
}

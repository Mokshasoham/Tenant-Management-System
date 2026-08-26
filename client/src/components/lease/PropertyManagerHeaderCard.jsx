import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Building2, MapPin, Phone, Mail, MessageSquare,
    ExternalLink, ArrowRight, ShieldCheck, User,
    Navigation, ChevronLeft, ChevronRight, MousePointer
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { resolveMediaUrl, DEFAULT_PLACEHOLDER_SVG } from '../../utils/propertyHelper';
import { propertyService } from '../../services/api';

export default function PropertyManagerHeaderCard({
    lease,
    leases = [],
    currentIndex = 0,
    onSelectLeaseIndex
}) {
    const navigate = useNavigate();
    const [navData, setNavData] = useState(null);
    const cardRef = useRef(null);
    const scrollCooldownRef = useRef(false);
    const wheelAccumulatorRef = useRef(0);
    const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

    const isMultiLease = Array.isArray(leases) && leases.length > 1;

    const property = lease?.property || {};
    const propId = property?._id || property?.id;
    const propName = property?.name || 'Property Details';
    const propAddress = property?.address || '';
    const propCityState = [property?.city, property?.state].filter(Boolean).join(', ') || 'India';
    const propFullAddress = [property?.address, property?.city, property?.state, property?.zipCode].filter(Boolean).join(', ');
    const propType = property?.type ? (property.type.charAt(0).toUpperCase() + property.type.slice(1)) : 'Apartment';

    // Property cover image
    const rawCover = property?.coverImage || property?.images?.[0] || property?.media?.find(m => m.mediaType === 'image')?.url;
    const coverUrl = resolveMediaUrl(rawCover) || DEFAULT_PLACEHOLDER_SVG;

    // Manager / Owner resolution
    const manager = property?.manager || property?.owner || null;
    const managerName = manager
        ? (manager.name || (manager.firstName ? `${manager.firstName} ${manager.lastName || ''}`.trim() : (manager.email ? manager.email.split('@')[0] : 'Property Manager')))
        : null;
    const managerPhone = manager?.phone || manager?.phoneNumber || null;
    const managerEmail = manager?.email || null;
    const managerAvatar = manager?.avatar ? resolveMediaUrl(manager.avatar) : null;
    const managerInitials = managerName
        ? managerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : 'TM';

    // Fetch secure navigation info dynamically whenever propId changes
    useEffect(() => {
        let isMounted = true;
        if (propId) {
            (async () => {
                try {
                    const res = await propertyService.getPropertyNavigation(propId);
                    if (isMounted) {
                        setNavData(res?.data || res);
                    }
                } catch (err) {
                    if (isMounted) {
                        setNavData(null);
                    }
                }
            })();
        } else {
            setNavData(null);
        }
        return () => { isMounted = false; };
    }, [propId]);

    const stateRef = useRef({
        currentIndex,
        leases,
        isMultiLease,
        onSelectLeaseIndex
    });

    useEffect(() => {
        stateRef.current = {
            currentIndex,
            leases,
            isMultiLease,
            onSelectLeaseIndex
        };
    }, [currentIndex, leases, isMultiLease, onSelectLeaseIndex]);

    // ── Mouse Wheel / Trackpad Scroll Listener (Horizontal Lease Navigation Only) ──
    useEffect(() => {
        const cardElement = cardRef.current;
        if (!cardElement) return;

        const handleWheel = (e) => {
            const { isMultiLease: multi, leases: leaseList, currentIndex: idx, onSelectLeaseIndex: selectFn } = stateRef.current;
            if (!multi || !leaseList || leaseList.length <= 1 || typeof selectFn !== 'function') {
                return;
            }

            const absX = Math.abs(e.deltaX);
            const absY = Math.abs(e.deltaY);

            // Strictly respond ONLY when horizontal movement is dominant
            if (absX > absY && absX > 5) {
                // Prevent horizontal browser history back/forward gestures
                e.preventDefault();
                e.stopPropagation();

                if (scrollCooldownRef.current) return;

                wheelAccumulatorRef.current += e.deltaX;

                const HORIZONTAL_THRESHOLD = 15;

                if (wheelAccumulatorRef.current >= HORIZONTAL_THRESHOLD) {
                    // Horizontal scroll right -> Next property
                    const nextIndex = (idx + 1) % leaseList.length;
                    selectFn(nextIndex);
                    scrollCooldownRef.current = true;
                    wheelAccumulatorRef.current = 0;
                    setTimeout(() => {
                        scrollCooldownRef.current = false;
                    }, 300);
                } else if (wheelAccumulatorRef.current <= -HORIZONTAL_THRESHOLD) {
                    // Horizontal scroll left -> Previous property
                    const prevIndex = (idx - 1 + leaseList.length) % leaseList.length;
                    selectFn(prevIndex);
                    scrollCooldownRef.current = true;
                    wheelAccumulatorRef.current = 0;
                    setTimeout(() => {
                        scrollCooldownRef.current = false;
                    }, 300);
                }
            } else {
                // Vertical movement (deltaY dominant): DO NOT preventDefault, DO NOT switch lease, let normal page scrolling proceed
                wheelAccumulatorRef.current = 0;
            }
        };

        // Attach non-passive event listener so e.preventDefault() works for horizontal gestures
        cardElement.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            cardElement.removeEventListener('wheel', handleWheel);
        };
    }, []);

    // ── Touch Swipe Handling for Mobile / Tablet (Horizontal Gestures Only) ──
    const handleTouchStart = (e) => {
        if (!isMultiLease) return;
        if (e.touches && e.touches.length > 0) {
            touchStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
                time: Date.now()
            };
        }
    };

    const handleTouchEnd = (e) => {
        const { isMultiLease: multi, leases: leaseList, currentIndex: idx, onSelectLeaseIndex: selectFn } = stateRef.current;
        if (!multi || !leaseList || leaseList.length <= 1 || typeof selectFn !== 'function') return;
        if (!e.changedTouches || e.changedTouches.length === 0) return;

        const currentX = e.changedTouches[0].clientX;
        const currentY = e.changedTouches[0].clientY;
        const deltaX = currentX - touchStartRef.current.x;
        const deltaY = currentY - touchStartRef.current.y;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Only trigger a property change when Math.abs(deltaX) > Math.abs(deltaY)
        const SWIPE_THRESHOLD = 35;
        if (absX > absY && absX >= SWIPE_THRESHOLD) {
            if (deltaX < 0) {
                // Swiped left (finger moved right to left) -> Next property
                selectFn((idx + 1) % leaseList.length);
            } else {
                // Swiped right (finger moved left to right) -> Previous property
                selectFn((idx - 1 + leaseList.length) % leaseList.length);
            }
        }
        // Vertical swipe (absY >= absX) -> does nothing and allows normal page scrolling!
    };

    // ── Keyboard Arrow Navigation when Focused ──
    const handleKeyDown = (e) => {
        const { isMultiLease: multi, leases: leaseList, currentIndex: idx, onSelectLeaseIndex: selectFn } = stateRef.current;
        if (!multi || !leaseList || leaseList.length <= 1 || typeof selectFn !== 'function') return;

        // Only respond to horizontal arrow keys (ArrowRight / ArrowLeft), let ArrowUp / ArrowDown scroll the page normally
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            selectFn((idx + 1) % leaseList.length);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            selectFn((idx - 1 + leaseList.length) % leaseList.length);
        }
    };

    const handleViewProperty = () => {
        if (propId) {
            navigate(`/properties/${propId}`);
        }
    };

    const handleGetDirections = () => {
        if (navData?.data?.destinationUrl) {
            window.open(navData.data.destinationUrl, '_blank', 'noopener,noreferrer');
            return;
        }
        if (property?.location?.lat && property?.location?.lng) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${property.location.lat},${property.location.lng}`, '_blank', 'noopener,noreferrer');
            return;
        }
        if (propFullAddress) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(propFullAddress)}`, '_blank', 'noopener,noreferrer');
        }
    };

    const handleMessageManager = () => {
        if (!manager) return;
        navigate('/messages', {
            state: {
                recipientId: manager._id || manager.id,
                recipientName: managerName,
                subject: `Regarding Lease #${lease?.leaseNumber || ''} - ${propName}`
            }
        });
    };

    return (
        <div
            ref={cardRef}
            tabIndex={isMultiLease ? 0 : undefined}
            onKeyDown={handleKeyDown}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={cn(
                "relative rounded-[2.25rem] bg-card border border-border shadow-xl overflow-hidden focus:outline-none transition-shadow",
                isMultiLease && "focus:ring-2 focus:ring-emerald-500/40 hover:border-border/90"
            )}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={lease?._id || propId || 'lease-header-unit'}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border"
                >
                    {/* ═══════════════════════════════════════════════════════════
                        COLUMN 1: PROPERTY IDENTITY & DETAILS (7 COLS ON DESKTOP)
                       ═══════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-7 p-6 sm:p-7 flex flex-col justify-between gap-5 bg-gradient-to-br from-card via-card to-muted/20">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
                            {/* Property Thumbnail */}
                            <div
                                onClick={handleViewProperty}
                                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-border/80 bg-muted shrink-0 group cursor-pointer shadow-md"
                            >
                                <img
                                    src={coverUrl}
                                    alt={propName}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => { e.currentTarget.src = DEFAULT_PLACEHOLDER_SVG; }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-1.5">
                                    <span className="text-[9px] font-black text-white uppercase tracking-wider">View Property</span>
                                </div>
                                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-black/70 backdrop-blur-md text-emerald-400 border border-white/10 shadow-sm">
                                    {propType}
                                </span>
                            </div>

                            {/* Property Metadata */}
                            <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            Your Leased Home
                                        </span>
                                        <span className="text-[10px] font-bold text-muted-foreground/60">
                                            Lease #{lease?.leaseNumber || 'ACTIVE'}
                                        </span>
                                    </div>

                                    {/* Subtle Multi-Lease Counter & Switcher Controls */}
                                    {isMultiLease && (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/60 border border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground select-none">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectLeaseIndex((currentIndex - 1 + leases.length) % leases.length);
                                                }}
                                                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                                title="Previous property (or scroll up)"
                                                aria-label="Previous property"
                                            >
                                                <ChevronLeft className="w-3 h-3" />
                                            </button>
                                            <span className="text-foreground font-bold px-1">
                                                {currentIndex + 1} <span className="opacity-40">/</span> {leases.length}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectLeaseIndex((currentIndex + 1) % leases.length);
                                                }}
                                                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                                title="Next property (or scroll down)"
                                                aria-label="Next property"
                                            >
                                                <ChevronRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <h2
                                    onClick={handleViewProperty}
                                    className="text-xl sm:text-2xl font-black text-foreground tracking-tight hover:text-emerald-500 transition-colors cursor-pointer truncate"
                                    title={propName}
                                >
                                    {propName}
                                </h2>

                                <div className="flex items-start gap-1.5 text-xs text-muted-foreground font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                    <span className="line-clamp-1">{propAddress ? `${propAddress}, ${propCityState}` : propCityState}</span>
                                </div>

                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <p className="text-[11px] text-muted-foreground/70 font-medium">
                                        Managed by <span className="text-foreground font-semibold">{managerName || 'Direct Operations'}</span> · <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active Tenancy</span>
                                    </p>

                                    {isMultiLease && (
                                        <span className="text-[9px] font-bold text-muted-foreground/40 hidden sm:inline-flex items-center gap-1">
                                            <MousePointer className="w-2.5 h-2.5" /> Swipe horizontally to switch
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quick Property Actions */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-border/60">
                            <button
                                type="button"
                                onClick={handleViewProperty}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                            >
                                <Building2 className="w-3.5 h-3.5" />
                                <span>View Property</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>

                            <button
                                type="button"
                                onClick={handleGetDirections}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-muted/80 hover:bg-muted text-foreground border border-border hover:border-emerald-500/30 text-xs font-black uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                                title="Get turn-by-turn navigation to property"
                            >
                                <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Get Directions</span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground" />
                            </button>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════
                        COLUMN 2: PROPERTY MANAGER / OWNER (5 COLS ON DESKTOP)
                       ═══════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-5 p-6 sm:p-7 flex flex-col justify-between gap-5 bg-card">
                        {manager ? (
                            <>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-1.5">
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Assigned Property Manager
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Manager
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3.5">
                                        {/* Manager Avatar */}
                                        <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-sm shrink-0 shadow-inner">
                                            {managerAvatar ? (
                                                <img
                                                    src={managerAvatar}
                                                    alt={managerName}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                            ) : (
                                                <span>{managerInitials}</span>
                                            )}
                                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-card" />
                                        </div>

                                        {/* Manager Identity */}
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-base font-black text-foreground truncate" title={managerName}>
                                                {managerName}
                                            </h4>
                                            <p className="text-xs text-muted-foreground/80 font-medium capitalize">
                                                {manager.role || 'Property Manager'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Contact Details */}
                                    <div className="space-y-1.5 pt-1">
                                        {managerPhone ? (
                                            <a
                                                href={`tel:${managerPhone}`}
                                                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-emerald-500 transition-colors group"
                                            >
                                                <Phone className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-emerald-500 transition-colors" />
                                                <span>{managerPhone}</span>
                                            </a>
                                        ) : (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
                                                <Phone className="w-3.5 h-3.5 opacity-40" />
                                                <span>Phone available via chat</span>
                                            </div>
                                        )}

                                        {managerEmail && (
                                            <a
                                                href={`mailto:${managerEmail}`}
                                                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-emerald-500 transition-colors group truncate"
                                                title={managerEmail}
                                            >
                                                <Mail className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-emerald-500 transition-colors shrink-0" />
                                                <span className="truncate">{managerEmail}</span>
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Manager Actions */}
                                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                                    {managerPhone && (
                                        <a
                                            href={`tel:${managerPhone}`}
                                            className="flex-1 py-2.5 px-3 rounded-xl bg-muted/80 hover:bg-muted border border-border text-foreground text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>Call</span>
                                        </a>
                                    )}

                                    {managerEmail && (
                                        <a
                                            href={`mailto:${managerEmail}`}
                                            className="flex-1 py-2.5 px-3 rounded-xl bg-muted/80 hover:bg-muted border border-border text-foreground text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            <Mail className="w-3.5 h-3.5 text-teal-500" />
                                            <span>Email</span>
                                        </a>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleMessageManager}
                                        className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        <span>Message</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center p-5 space-y-3 my-auto">
                                <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground/60">
                                    <User className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-black text-foreground">Direct Property Operations</h4>
                                    <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                                        No dedicated property manager assigned. All maintenance and queries are handled directly by TMS operations.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/messages')}
                                    className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 border border-border text-xs font-black uppercase tracking-wider text-foreground transition-all"
                                >
                                    Contact Operations
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

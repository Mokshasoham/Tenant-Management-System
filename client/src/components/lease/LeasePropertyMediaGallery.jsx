import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Image as ImageIcon, Video, ChevronLeft, ChevronRight,
    Maximize2, X, AlertTriangle, RefreshCw, Loader2, Compass, ExternalLink, MapPin
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { resolveMediaUrl, DEFAULT_PLACEHOLDER_SVG } from '../../utils/propertyHelper';
import { propertyService } from '../../services/api';

export default function LeasePropertyMediaGallery({ property: initialProperty, leaseId }) {
    const [property, setProperty] = useState(initialProperty || null);
    const [loading, setLoading] = useState(!initialProperty);
    const [fetchError, setFetchError] = useState(false);

    const [activeImage, setActiveImage] = useState(0);
    const [galleryDirection, setGalleryDirection] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [mediaLoadErrors, setMediaLoadErrors] = useState({});

    const galleryHeroRef = useRef(null);
    const lightboxHeroRef = useRef(null);
    const thumbnailItemRefs = useRef({});
    const fsThumbnailRefs = useRef({});
    const touchStartX = useRef(null);
    const touchStartY = useRef(null);
    const wheelDeltaAccumulator = useRef(0);
    const isWheelCoolingDown = useRef(false);
    const wheelTimeoutRef = useRef(null);

    // Sync or enrich property if incoming property prop changes or needs full fetch
    useEffect(() => {
        let isMounted = true;

        const syncAndEnrichProperty = async () => {
            if (initialProperty) {
                setProperty(initialProperty);
                // If initialProperty already has images/media populated, no extra fetch needed
                if ((initialProperty.images && initialProperty.images.length > 0) ||
                    (initialProperty.media && initialProperty.media.length > 0)) {
                    setLoading(false);
                    return;
                }
            }

            const propertyId = initialProperty?._id || (typeof initialProperty === 'string' ? initialProperty : null);
            if (!propertyId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setFetchError(false);
            try {
                const res = await propertyService.getPropertyById(propertyId);
                if (isMounted) {
                    setProperty(res?.data || initialProperty);
                }
            } catch (err) {
                console.error('[LeasePropertyMediaGallery] Failed to fetch property media details:', err);
                if (isMounted) {
                    setFetchError(true);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        syncAndEnrichProperty();

        return () => {
            isMounted = false;
        };
    }, [initialProperty]);

    // Reset active media when property changes
    useEffect(() => {
        setActiveImage(0);
        setGalleryDirection(0);
    }, [property?._id]);

    // Media list extraction & URL resolution
    const allMedia = property?.media || [];
    const rawVideos = property?.videos?.length
        ? property.videos
        : allMedia.filter(m => m.mediaType === 'video').map(m => m.url);
    const rawImages = property?.images?.length
        ? property.images
        : allMedia.filter(m => m.mediaType === 'image' || !m.mediaType).map(m => m.url);

    const videos = rawVideos.map(resolveMediaUrl).filter(Boolean);
    const images = rawImages.map(resolveMediaUrl).filter(Boolean);

    const mediaList = [
        ...images.map((url, i) => ({ type: 'image', url, id: `img-${i}`, index: i })),
        ...videos.map((url, i) => ({ type: 'video', url, id: `vid-${i}`, index: images.length + i }))
    ];

    const totalMediaCount = mediaList.length;
    const activeMediaItem = mediaList[activeImage] || mediaList[0];

    const photoCount = images.length;
    const videoCount = videos.length;
    const hasVirtualTour = Boolean(property?.virtualTourUrl);

    // Slide transition animation
    const gallerySlideVariants = {
        enter: (dir) => ({
            x: dir > 0 ? '100%' : dir < 0 ? '-100%' : '0%',
            opacity: 0,
            scale: 0.98,
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
            transition: {
                x: { type: 'spring', stiffness: 350, damping: 35 },
                opacity: { duration: 0.25 },
                scale: { duration: 0.25 }
            }
        },
        exit: (dir) => ({
            x: dir > 0 ? '-100%' : dir < 0 ? '100%' : '0%',
            opacity: 0,
            scale: 0.98,
            transition: {
                x: { type: 'spring', stiffness: 350, damping: 35 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 }
            }
        })
    };

    const handleNextMedia = (e) => {
        if (e) e.stopPropagation();
        if (totalMediaCount <= 1) return;
        if (activeImage < totalMediaCount - 1) {
            setGalleryDirection(1);
            setActiveImage(prev => prev + 1);
        }
    };

    const handlePrevMedia = (e) => {
        if (e) e.stopPropagation();
        if (totalMediaCount <= 1) return;
        if (activeImage > 0) {
            setGalleryDirection(-1);
            setActiveImage(prev => prev - 1);
        }
    };

    // Touch swipe handling
    const handleTouchStart = (e) => {
        if (!e.touches || e.touches.length === 0) return;
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
        if (touchStartX.current === null || touchStartY.current === null || !e.changedTouches || e.changedTouches.length === 0) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
            if (deltaX < 0) {
                handleNextMedia();
            } else {
                handlePrevMedia();
            }
        }
        touchStartX.current = null;
        touchStartY.current = null;
    };

    // Auto-scroll active thumbnail into view
    useEffect(() => {
        const el = thumbnailItemRefs.current[activeImage];
        if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
        const fsEl = fsThumbnailRefs.current[activeImage];
        if (fsEl && typeof fsEl.scrollIntoView === 'function') {
            fsEl.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [activeImage]);

    // Trackpad horizontal swipe on main hero gallery
    useEffect(() => {
        const heroEl = galleryHeroRef.current;
        if (!heroEl) return;

        const handleWheel = (e) => {
            // Allow vertical scrolling to continue smoothly
            if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
                return;
            }

            // Dominant horizontal trackpad gesture
            if (e.cancelable) {
                e.preventDefault();
            }

            if (isWheelCoolingDown.current) return;

            wheelDeltaAccumulator.current += e.deltaX;

            if (wheelTimeoutRef.current) {
                clearTimeout(wheelTimeoutRef.current);
            }
            wheelTimeoutRef.current = setTimeout(() => {
                wheelDeltaAccumulator.current = 0;
            }, 150);

            const SWIPE_THRESHOLD = 50;

            if (wheelDeltaAccumulator.current >= SWIPE_THRESHOLD) {
                wheelDeltaAccumulator.current = 0;
                isWheelCoolingDown.current = true;
                handleNextMedia();
                setTimeout(() => {
                    isWheelCoolingDown.current = false;
                }, 400);
            } else if (wheelDeltaAccumulator.current <= -SWIPE_THRESHOLD) {
                wheelDeltaAccumulator.current = 0;
                isWheelCoolingDown.current = true;
                handlePrevMedia();
                setTimeout(() => {
                    isWheelCoolingDown.current = false;
                }, 400);
            }
        };

        heroEl.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            heroEl.removeEventListener('wheel', handleWheel);
            if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
        };
    }, [activeImage, totalMediaCount]);

    // Trackpad horizontal swipe on fullscreen lightbox
    useEffect(() => {
        if (!isFullscreen) return;
        const fsEl = lightboxHeroRef.current;
        if (!fsEl) return;

        const handleWheel = (e) => {
            if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
                return;
            }

            if (e.cancelable) {
                e.preventDefault();
            }

            if (isWheelCoolingDown.current) return;

            wheelDeltaAccumulator.current += e.deltaX;

            if (wheelTimeoutRef.current) {
                clearTimeout(wheelTimeoutRef.current);
            }
            wheelTimeoutRef.current = setTimeout(() => {
                wheelDeltaAccumulator.current = 0;
            }, 150);

            const SWIPE_THRESHOLD = 50;

            if (wheelDeltaAccumulator.current >= SWIPE_THRESHOLD) {
                wheelDeltaAccumulator.current = 0;
                isWheelCoolingDown.current = true;
                handleNextMedia();
                setTimeout(() => {
                    isWheelCoolingDown.current = false;
                }, 400);
            } else if (wheelDeltaAccumulator.current <= -SWIPE_THRESHOLD) {
                wheelDeltaAccumulator.current = 0;
                isWheelCoolingDown.current = true;
                handlePrevMedia();
                setTimeout(() => {
                    isWheelCoolingDown.current = false;
                }, 400);
            }
        };

        fsEl.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            fsEl.removeEventListener('wheel', handleWheel);
        };
    }, [isFullscreen, activeImage, totalMediaCount]);

    // Keyboard Arrow navigation & Escape listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
            if (e.key === 'ArrowLeft') {
                handlePrevMedia();
            } else if (e.key === 'ArrowRight') {
                handleNextMedia();
            } else if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeImage, totalMediaCount, isFullscreen]);

    // Loading State
    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-6"
            >
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-4 w-32 bg-muted animate-pulse rounded-lg" />
                        <div className="h-3 w-48 bg-muted/60 animate-pulse rounded-lg" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
                    </div>
                </div>
                <div className="aspect-video w-full rounded-3xl bg-muted/50 animate-pulse flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-muted-foreground/30 animate-spin" />
                </div>
                <div className="flex gap-3 overflow-hidden">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-20 h-20 rounded-2xl bg-muted animate-pulse flex-shrink-0" />
                    ))}
                </div>
            </motion.div>
        );
    }

    // Error State
    if (fetchError) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-4 text-center"
            >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="text-sm font-black text-foreground">Unable to load property media</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                        We could not retrieve the photo gallery for this property right now.
                    </p>
                </div>
                <button
                    onClick={() => {
                        const propertyId = property?._id || (typeof property === 'string' ? property : null);
                        if (propertyId) {
                            setLoading(true);
                            setFetchError(false);
                            propertyService.getPropertyById(propertyId)
                                .then(res => setProperty(res?.data || property))
                                .catch(() => setFetchError(true))
                                .finally(() => setLoading(false));
                        }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-black uppercase tracking-wider transition-all"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
            </motion.div>
        );
    }

    // Empty State (No media uploaded for this property)
    if (totalMediaCount === 0 && !hasVirtualTour) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-6"
            >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <ImageIcon className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                                Property Media
                            </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                            Photos, videos & virtual tour of your leased property
                        </p>
                    </div>
                    {property?.name && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground self-start sm:self-auto">
                            <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="truncate max-w-[180px]">{property.name}</span>
                        </div>
                    )}
                </div>

                {/* Empty State Box */}
                <div className="py-12 px-6 rounded-2xl bg-muted/20 border border-dashed border-border/70 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto text-muted-foreground/50">
                        <Building2 className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-foreground">No property media available yet</p>
                        <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm mx-auto leading-relaxed">
                            Your manager hasn't uploaded photos or videos for this property yet.
                        </p>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-6 transition-colors"
            >
                {/* ── Section Header ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <ImageIcon className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                                Property Media
                            </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-medium flex items-center gap-2 flex-wrap">
                            <span>Photos, videos & virtual tour of your leased property</span>
                            {property?.name && (
                                <>
                                    <span className="text-muted-foreground/30">•</span>
                                    <span className="font-bold text-foreground inline-flex items-center gap-1">
                                        <Building2 className="w-3 h-3 text-emerald-500" />
                                        {property.name}
                                    </span>
                                </>
                            )}
                            {property?.address && (
                                <>
                                    <span className="text-muted-foreground/30">•</span>
                                    <span className="text-muted-foreground/70 inline-flex items-center gap-1 truncate max-w-[220px]">
                                        <MapPin className="w-3 h-3 text-muted-foreground/40" />
                                        {property.address}
                                    </span>
                                </>
                            )}
                        </p>
                    </div>

                    {/* Media Count Pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {photoCount > 0 && (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <ImageIcon className="w-3 h-3" /> {photoCount} {photoCount === 1 ? 'Photo' : 'Photos'}
                            </span>
                        )}
                        {videoCount > 0 && (
                            <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <Video className="w-3 h-3" /> {videoCount} {videoCount === 1 ? 'Video' : 'Videos'}
                            </span>
                        )}
                        {hasVirtualTour && (
                            <a
                                href={property.virtualTourUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                                <Compass className="w-3 h-3" /> 360° Tour <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                        )}
                    </div>
                </div>

                {/* ── Main Media Hero Container ── */}
                <div className="space-y-4">
                    <div
                        ref={galleryHeroRef}
                        className="aspect-video w-full rounded-2xl md:rounded-[2rem] bg-slate-950 border border-border overflow-hidden relative shadow-xl shadow-black/10 select-none touch-pan-y group"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Animated Slide Stage */}
                        <div className="w-full h-full relative overflow-hidden">
                            <AnimatePresence initial={false} custom={galleryDirection} mode="popLayout">
                                {activeMediaItem ? (
                                    <motion.div
                                        key={activeMediaItem.id}
                                        custom={galleryDirection}
                                        variants={gallerySlideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        className="w-full h-full absolute inset-0 cursor-pointer flex items-center justify-center bg-black"
                                        onClick={() => {
                                            if (activeMediaItem.type !== 'video') {
                                                setIsFullscreen(true);
                                            }
                                        }}
                                    >
                                        {activeMediaItem.type === 'video' ? (
                                            <div className="w-full h-full bg-black flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                                <video controls className="w-full h-full object-contain bg-black">
                                                    <source src={activeMediaItem.url} />
                                                    Your browser does not support HTML5 video player.
                                                </video>
                                            </div>
                                        ) : (
                                            <img
                                                src={activeMediaItem.url}
                                                className="w-full h-full object-cover"
                                                alt={property.name || 'Leased Property'}
                                                loading="lazy"
                                                onError={(e) => {
                                                    setMediaLoadErrors(p => ({ ...p, [activeMediaItem.url]: true }));
                                                    e.target.onerror = null;
                                                    e.target.src = DEFAULT_PLACEHOLDER_SVG;
                                                }}
                                            />
                                        )}
                                    </motion.div>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-3 p-6">
                                        <Building2 className="w-16 h-16 text-slate-600" />
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Media Content Unavailable</span>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Ambient Gradient Overlays */}
                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/50 via-transparent to-black/30" />

                        {/* Navigation Arrows */}
                        {totalMediaCount > 1 && (
                            <>
                                <button
                                    type="button"
                                    aria-label="Previous image"
                                    onClick={handlePrevMedia}
                                    disabled={activeImage === 0}
                                    className={cn(
                                        "absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md shadow-2xl",
                                        "bg-black/50 hover:bg-black/80 text-white border border-white/20 hover:border-white/40 hover:scale-105 active:scale-95",
                                        activeImage === 0 ? "opacity-30 cursor-not-allowed pointer-events-none" : "opacity-90 hover:opacity-100 cursor-pointer"
                                    )}
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>

                                <button
                                    type="button"
                                    aria-label="Next image"
                                    onClick={handleNextMedia}
                                    disabled={activeImage === totalMediaCount - 1}
                                    className={cn(
                                        "absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md shadow-2xl",
                                        "bg-black/50 hover:bg-black/80 text-white border border-white/20 hover:border-white/40 hover:scale-105 active:scale-95",
                                        activeImage === totalMediaCount - 1 ? "opacity-30 cursor-not-allowed pointer-events-none" : "opacity-90 hover:opacity-100 cursor-pointer"
                                    )}
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </>
                        )}

                        {/* Top-Right Fullscreen Trigger */}
                        {activeMediaItem && activeMediaItem.type !== 'video' && (
                            <button
                                type="button"
                                aria-label="View Fullscreen"
                                onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
                                className="absolute top-4 right-4 z-20 p-2.5 rounded-2xl bg-black/50 hover:bg-black/80 text-white border border-white/20 hover:border-white/40 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        )}

                        {/* Bottom-Right Glass Counter Pill */}
                        {totalMediaCount > 0 && (
                            <div className="absolute bottom-4 right-4 z-20 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white text-[11px] font-black tracking-widest shadow-2xl flex items-center gap-1.5 pointer-events-none">
                                <span>{String(activeImage + 1).padStart(2, '0')}</span>
                                <span className="opacity-40">/</span>
                                <span className="opacity-70">{String(totalMediaCount).padStart(2, '0')}</span>
                            </div>
                        )}
                    </div>

                    {/* ── Thumbnails Strip & Action Row ── */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                        {/* Horizontal Thumbnail Strip */}
                        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scroll-smooth select-none scrollbar-none flex-1">
                            {mediaList.map((item, i) => (
                                <button
                                    key={item.id}
                                    ref={el => { thumbnailItemRefs.current[i] = el; }}
                                    type="button"
                                    aria-label={`Select media ${i + 1}`}
                                    onClick={() => {
                                        setGalleryDirection(i > activeImage ? 1 : -1);
                                        setActiveImage(i);
                                    }}
                                    className={cn(
                                        "w-20 h-20 rounded-2xl flex-shrink-0 border-2 transition-all duration-200 p-0.5 overflow-hidden cursor-pointer relative",
                                        activeImage === i
                                            ? "border-emerald-500 ring-2 ring-emerald-500/40 scale-[1.04] shadow-lg shadow-emerald-500/20 opacity-100 z-10"
                                            : "border-border/60 shadow-sm opacity-70 hover:opacity-100 hover:scale-[1.02]"
                                    )}
                                >
                                    {item.type === 'video' ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-indigo-400 rounded-xl">
                                            <Video className="w-5 h-5 animate-pulse" />
                                            <span className="text-[7px] font-black uppercase tracking-widest text-white mt-0.5">Video</span>
                                        </div>
                                    ) : (
                                        <img
                                            src={item.url}
                                            loading="lazy"
                                            className="w-full h-full object-cover rounded-xl"
                                            alt=""
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = DEFAULT_PLACEHOLDER_SVG;
                                            }}
                                        />
                                    )}
                                </button>
                            ))}

                            {/* 3D Virtual Tour Thumbnail Pill */}
                            {hasVirtualTour && (
                                <a
                                    href={property.virtualTourUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-20 h-20 rounded-2xl flex-shrink-0 border-2 border-cyan-500/30 border-dashed flex flex-col items-center justify-center p-2 text-cyan-500 bg-cyan-500/5 hover:bg-cyan-500/10 transition-all gap-1 shadow-sm hover:scale-[1.02]"
                                >
                                    <Compass className="w-5 h-5" />
                                    <span className="text-[8px] font-black uppercase text-center leading-tight">3D Tour</span>
                                </a>
                            )}
                        </div>

                        {/* Quick Action Buttons */}
                        {hasVirtualTour && (
                            <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                                <a
                                    href={property.virtualTourUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Compass className="w-4 h-4" />
                                    <span>Explore 3D Tour →</span>
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* ── Fullscreen Lightbox Modal ── */}
            <AnimatePresence>
                {isFullscreen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-8 select-none"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Lightbox Top Header */}
                        <div className="flex items-center justify-between text-white z-20">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-white/90 truncate max-w-[200px] sm:max-w-md">
                                    {property?.name || 'Property Gallery'}
                                </span>
                                {totalMediaCount > 0 && (
                                    <span className="px-3 py-1 rounded-full bg-white/10 text-[11px] font-black tracking-widest border border-white/15">
                                        {String(activeImage + 1).padStart(2, '0')} / {String(totalMediaCount).padStart(2, '0')}
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                aria-label="Close fullscreen"
                                onClick={() => setIsFullscreen(false)}
                                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all hover:scale-105 active:scale-95 shadow-2xl flex items-center gap-2 cursor-pointer"
                            >
                                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline text-white/70">ESC</span>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Lightbox Center Media Stage */}
                        <div ref={lightboxHeroRef} className="flex-1 relative flex items-center justify-center my-4 overflow-hidden touch-pan-y">
                            <AnimatePresence initial={false} custom={galleryDirection} mode="popLayout">
                                {activeMediaItem && (
                                    <motion.div
                                        key={`fs-${activeMediaItem.id}`}
                                        custom={galleryDirection}
                                        variants={gallerySlideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        className="max-w-5xl max-h-[70vh] w-full h-full flex items-center justify-center relative"
                                    >
                                        {activeMediaItem.type === 'video' ? (
                                            <video controls className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl bg-black">
                                                <source src={activeMediaItem.url} />
                                                Your browser does not support HTML5 video player.
                                            </video>
                                        ) : (
                                            <img
                                                src={activeMediaItem.url}
                                                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
                                                alt={property?.name || 'Leased Property'}
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = DEFAULT_PLACEHOLDER_SVG;
                                                }}
                                            />
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Lightbox Navigation Arrows */}
                            {totalMediaCount > 1 && (
                                <>
                                    <button
                                        type="button"
                                        aria-label="Previous image"
                                        onClick={handlePrevMedia}
                                        disabled={activeImage === 0}
                                        className={cn(
                                            "absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md shadow-2xl",
                                            "bg-white/10 hover:bg-white/25 text-white border border-white/20 hover:border-white/40 hover:scale-105 active:scale-95",
                                            activeImage === 0 ? "opacity-30 cursor-not-allowed pointer-events-none" : "opacity-90 hover:opacity-100 cursor-pointer"
                                        )}
                                    >
                                        <ChevronLeft className="w-7 h-7" />
                                    </button>

                                    <button
                                        type="button"
                                        aria-label="Next image"
                                        onClick={handleNextMedia}
                                        disabled={activeImage === totalMediaCount - 1}
                                        className={cn(
                                            "absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md shadow-2xl",
                                            "bg-white/10 hover:bg-white/25 text-white border border-white/20 hover:border-white/40 hover:scale-105 active:scale-95",
                                            activeImage === totalMediaCount - 1 ? "opacity-30 cursor-not-allowed pointer-events-none" : "opacity-90 hover:opacity-100 cursor-pointer"
                                        )}
                                    >
                                        <ChevronRight className="w-7 h-7" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Lightbox Bottom Thumbnail Strip */}
                        {totalMediaCount > 1 && (
                            <div className="flex gap-2 justify-center overflow-x-auto py-2 z-20 max-w-2xl mx-auto scrollbar-none">
                                {mediaList.map((item, i) => (
                                    <button
                                        key={`fs-thumb-${item.id}`}
                                        ref={el => { fsThumbnailRefs.current[i] = el; }}
                                        type="button"
                                        aria-label={`Select media ${i + 1}`}
                                        onClick={() => {
                                            setGalleryDirection(i > activeImage ? 1 : -1);
                                            setActiveImage(i);
                                        }}
                                        className={cn(
                                            "w-14 h-14 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer",
                                            activeImage === i
                                                ? "border-emerald-400 scale-110 shadow-lg shadow-emerald-500/30"
                                                : "border-white/20 opacity-50 hover:opacity-100"
                                        )}
                                    >
                                        {item.type === 'video' ? (
                                            <div className="w-full h-full bg-slate-900 flex items-center justify-center text-indigo-400">
                                                <Video className="w-4 h-4" />
                                            </div>
                                        ) : (
                                            <img
                                                src={item.url}
                                                className="w-full h-full object-cover"
                                                alt=""
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = DEFAULT_PLACEHOLDER_SVG;
                                                }}
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

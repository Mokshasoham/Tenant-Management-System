import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Bed, Bath, Square, Building2, Users, Home, Store, KeyRound,
    Star, ArrowRight, Heart, Scale, Zap, ShieldCheck
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../context/ThemeContext';
import { getDisplayStatus, resolveMediaUrl, DEFAULT_PLACEHOLDER_SVG } from '../../utils/propertyHelper';

export const TYPE_COLORS = {
    apartment: '#6366f1',
    house: '#10b981',
    commercial: '#f59e0b',
    land: '#8b5cf6',
    villa: '#14b8a6',
    studio: '#6366f1',
    hostel: '#a855f7',
    pg: '#f43f5e',
    shop: '#f59e0b',
};

// ── Curated high-fidelity harmonic ambient palettes for property media cycling ──
export const AMBIENT_PALETTES = [
    { r: 245, g: 158, b: 11 },   // Warm Sunset Gold / Amber
    { r: 16, g: 185, b: 129 },   // Fresh Emerald / Forest Green
    { r: 99, g: 102, b: 241 },   // Sapphire Indigo / Modern Blue
    { r: 249, g: 115, b: 22 },   // Terracotta / Warm Orange
    { r: 59, g: 130, b: 246 },   // Ocean Azure / Sky Blue
    { r: 236, g: 72, b: 153 },   // Coral Rose / Pink
    { r: 139, g: 92, b: 246 },   // Amethyst Violet / Purple
    { r: 20, g: 184, b: 166 },   // Crisp Mint / Teal
];

export function getMediaAmbientRgb(cardIndex, imgIndex) {
    const paletteIndex = ((cardIndex || 0) * 3 + (imgIndex || 0)) % AMBIENT_PALETTES.length;
    return AMBIENT_PALETTES[paletteIndex];
}

const VIEW_DETAILS_LETTERS = ['V', 'i', 'e', 'w', '\u00A0', 'd', 'e', 't', 'a', 'i', 'l', 's'];

// ── Skeleton Card ──
export function SkeletonCard({ compact = false }) {
    if (compact) {
        return (
            <div className="flex gap-3 p-3 rounded-2xl bg-card border border-border">
                <div className="w-24 h-20 rounded-xl flex-shrink-0 shimmer" />
                <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3.5 w-[70%] rounded-md shimmer" />
                    <div className="h-3 w-[50%] rounded-md shimmer" />
                    <div className="h-4.5 w-[40%] rounded-md shimmer" />
                </div>
            </div>
        );
    }
    return (
        <div className="rounded-[1.75rem] overflow-hidden bg-card border border-border">
            <div className="h-48 shimmer" />
            <div className="p-5 space-y-2.5">
                <div className="h-4.5 w-[70%] rounded-md shimmer" />
                <div className="h-3.5 w-[50%] rounded-md shimmer" />
                <div className="h-9 w-full rounded-xl shimmer mt-1" />
            </div>
        </div>
    );
}

// ── Compact card for map side-panel ──
export function CompactCard({ p, isSaved, inCompare, onSave, onCompare, onClick }) {
    const { theme } = useTheme();
    const color = TYPE_COLORS[p.type] || '#6366f1';
    const displayStatus = getDisplayStatus(p);
    const coverUrl = resolveMediaUrl(p.images?.[0] || p.media?.find(m => m.mediaType === 'image')?.url);
    return (
        <motion.div whileHover={{ y: -1 }} onClick={onClick}
            className="flex gap-3 p-3 rounded-2xl cursor-pointer bg-card border border-border hover:border-primary/50 transition-all shadow-sm">
            <div className="w-24 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted relative">
                {coverUrl
                    ? <img 
                        src={coverUrl} 
                        alt={p.name} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = DEFAULT_PLACEHOLDER_SVG;
                        }}
                    />
                    : <div className="w-full h-full flex items-center justify-center"><Building2 className="w-6 h-6 opacity-20 text-foreground" /></div>}
                <span className="absolute top-1 left-1 bg-opacity-90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase tracking-tighter" style={{ background: color }}>{p.type}</span>
                {displayStatus && (
                    <span className={cn(
                        "absolute bottom-1 right-1 text-[7px] font-black px-1 rounded shadow-sm border uppercase tracking-tighter",
                        displayStatus === 'Available' ? "bg-emerald-500/90 border-emerald-400/20 text-white" :
                        displayStatus.startsWith('Available from') ? "bg-indigo-500/90 border-indigo-400/20 text-white" :
                        displayStatus === 'Under Maintenance' ? "bg-amber-500/90 border-amber-400/20 text-white" :
                        "bg-rose-500/90 border-rose-400/20 text-white"
                    )}>
                        {displayStatus === 'Available' ? 'AVBL' : displayStatus === 'Under Maintenance' ? 'MAINT' : displayStatus === 'Sold Out' ? 'SOLD' : 'SOON'}
                    </span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-foreground truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground/60 truncate my-0.5">📍 {p.city}</p>
                <p className="text-base font-black text-foreground" style={{ color: theme === 'light' ? color : 'inherit' }}>₹{p.rentAmount?.toLocaleString('en-IN')}<span className="text-[9px] font-bold text-muted-foreground/40">/mo</span></p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground/60">🛏 {p.bedrooms || 0}</span>
                    <span className="text-[10px] text-muted-foreground/60">🚿 {p.bathrooms || 0}</span>
                    <button onClick={e => { e.stopPropagation(); onSave?.(); }} className={cn("ml-auto p-1 rounded-lg transition-colors", isSaved ? "text-rose-500 bg-rose-500/10" : "text-muted-foreground/30 hover:bg-muted")}>
                        <Heart className={cn("w-3.5 h-3.5", isSaved && "fill-current")} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); onCompare?.(); }} className={cn("p-1 rounded-lg transition-colors", inCompare ? "text-primary bg-primary/10" : "text-muted-foreground/30 hover:bg-muted")}>
                        <Scale className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ── Full Standard Property Grid Card (Shared by Browse Properties & Similar Properties) ──
export function PropertyCard({
    p,
    index = 0,
    isSaved = false,
    inCompare = false,
    onSave,
    onCompare,
    onClick,
    matchTag = null,
    matchReasons = []
}) {
    const { theme } = useTheme();
    const color = TYPE_COLORS[p.type] || '#6366f1';
    const displayStatus = getDisplayStatus(p);

    // Extract real images
    const allMedia = p.media || [];
    const rawImages = p.images?.length
        ? p.images
        : allMedia.filter(m => m.mediaType === 'image').map(m => m.url);
    const imageUrls = rawImages.map(resolveMediaUrl).filter(Boolean);

    const [currentImgIndex, setCurrentImgIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [btnHovered, setBtnHovered] = useState(false);
    const intervalRef = useRef(null);

    const ambientRgb = getMediaAmbientRgb(index, currentImgIndex);

    // Slideshow interval active only on hovered card
    useEffect(() => {
        if (isHovered && imageUrls.length > 1) {
            intervalRef.current = setInterval(() => {
                setCurrentImgIndex(prev => (prev + 1) % imageUrls.length);
            }, 3200);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setCurrentImgIndex(0);
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isHovered, imageUrls.length]);

    // Resolve manager name gracefully
    const mgr = p.manager || p.owner;
    const mgrName = mgr?.name || (mgr?.firstName ? `${mgr.firstName} ${mgr?.lastName || ''}`.trim() : (mgr?.email || p.ownerName || 'Manager not assigned'));
    const mgrInitial = mgr?.firstName?.[0] || mgr?.name?.[0] || mgrName?.[0] || 'M';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.05, 0.5) }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                boxShadow: isHovered
                    ? theme === 'light'
                        ? `0 12px 28px -6px rgba(0, 0, 0, 0.07), 0 20px 48px -10px rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, 0.14)`
                        : `0 14px 32px -6px rgba(0, 0, 0, 0.50), 0 20px 52px -10px rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, 0.18)`
                    : theme === 'light'
                        ? '0 4px 20px -2px rgba(0, 0, 0, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02)'
                        : '0 4px 20px -2px rgba(0, 0, 0, 0.30), 0 2px 6px -1px rgba(0, 0, 0, 0.15)',
                transform: isHovered ? 'translateY(-3px)' : 'translateY(0px)',
                borderColor: isHovered
                    ? theme === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.14)'
                    : theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
                transition: 'transform 280ms cubic-bezier(.2,.8,.2,1), box-shadow 500ms ease, border-color 300ms ease'
            }}
            className={cn(
                "relative rounded-[2.25rem] cursor-pointer bg-card border select-none group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            )}
        >
            {/* Dynamic Ambient Media Shadow Layer radiating OUTSIDE behind the entire card */}
            <div
                className="absolute -inset-2.5 sm:-inset-3.5 rounded-[2.75rem] pointer-events-none -z-10"
                style={{
                    background: isHovered
                        ? `radial-gradient(ellipse at 50% 30%, rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${theme === 'light' ? 0.22 : 0.30}) 0%, rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${theme === 'light' ? 0.07 : 0.12}) 50%, transparent 80%)`
                        : 'transparent',
                    filter: 'blur(30px)',
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered ? 'scale(1.04) translateY(-2px)' : 'scale(0.95) translateY(0)',
                    transition: 'opacity 700ms ease, background 900ms ease, transform 300ms ease'
                }}
            />

            {/* Media Area */}
            <div className="relative h-56 sm:h-60 overflow-hidden bg-muted transition-colors rounded-t-[2.25rem]">
                {imageUrls.length > 0 ? (
                    <div className="w-full h-full relative overflow-hidden">
                        <AnimatePresence initial={false} mode="wait">
                            <motion.img
                                key={`prop-img-${currentImgIndex}-${imageUrls[currentImgIndex]}`}
                                src={imageUrls[currentImgIndex]}
                                alt={p.name}
                                loading="lazy"
                                initial={{ opacity: 0.85, scale: 1.00 }}
                                animate={{ opacity: 1, scale: isHovered ? 1.025 : 1.00 }}
                                exit={{ opacity: 0.85, scale: 1.00 }}
                                transition={{
                                    opacity: { duration: 0.8, ease: 'easeInOut' },
                                    scale: { duration: 0.8, ease: 'easeOut' }
                                }}
                                className="w-full h-full object-cover select-none pointer-events-none"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = DEFAULT_PLACEHOLDER_SVG;
                                }}
                            />
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-transparent">
                        <Building2 className="w-12 h-12 opacity-20 text-foreground" />
                    </div>
                )}

                {/* Ambient Dark Gradient Overlays for readable text and badges */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/15 pointer-events-none" />

                {/* Media Progress Dot Indicators */}
                {imageUrls.length > 1 && (
                    <div className="absolute bottom-3.5 right-4 flex items-center gap-1.5 z-10 pointer-events-none">
                        {imageUrls.map((_, i) => (
                            <span
                                key={i}
                                className={cn(
                                    "rounded-full transition-all duration-500",
                                    i === currentImgIndex
                                        ? "w-4 h-1.5 bg-white shadow-sm"
                                        : "w-1.5 h-1.5 bg-white/40"
                                )}
                            />
                        ))}
                    </div>
                )}

                {/* Top-left badges */}
                <div className="absolute top-4 left-4 flex flex-col items-start gap-2 z-20 pointer-events-none">
                    <div className="flex gap-1.5 flex-wrap">
                        <span className="px-3 py-1 bg-opacity-90 text-white text-[10px] font-black rounded-full shadow-lg backdrop-blur-sm uppercase tracking-wider" style={{ background: color }}>
                            {p.type}
                        </span>
                        {displayStatus && (
                            <span className={cn(
                                "px-3 py-1 text-[9px] font-black rounded-full shadow-lg backdrop-blur-sm border uppercase tracking-wider",
                                displayStatus === 'Available' ? "bg-emerald-500/90 border-emerald-400/20 text-white" :
                                displayStatus.startsWith('Available from') ? "bg-indigo-500/90 border-indigo-400/20 text-white" :
                                displayStatus === 'Under Maintenance' ? "bg-amber-500/90 border-amber-400/20 text-white" :
                                "bg-rose-500/90 border-rose-400/20 text-white"
                            )}>
                                {displayStatus}
                            </span>
                        )}
                        {matchTag && (
                            <span className="px-2.5 py-1 bg-emerald-600/90 text-white text-[9px] font-black rounded-full shadow-lg backdrop-blur-sm border border-emerald-400/30 flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5 text-white" /> {matchTag}
                            </span>
                        )}
                        {((p.videos?.length || p.media?.filter(m => m.mediaType === 'video').length || 0) > 0) && (
                            <span className="px-2.5 py-1 bg-black/60 text-emerald-400 text-[9px] font-black rounded-full shadow-lg backdrop-blur-sm border border-white/10">
                                ▶ Video
                            </span>
                        )}
                        {p.virtualTourUrl && (
                            <span className="px-2.5 py-1 bg-emerald-500/90 text-white text-[9px] font-black rounded-full shadow-lg backdrop-blur-sm border border-white/20">
                                360° Tour
                            </span>
                        )}
                    </div>
                    {p.bookingType === 'free' && <span className="px-3 py-1 bg-primary/90 text-white text-[9px] font-black rounded-full shadow-lg backdrop-blur-sm border border-white/20">🛡️ Demo Available</span>}
                    {p.rentAmount < 20000 && <span className="px-3 py-1 bg-emerald-500/90 text-white text-[9px] font-black rounded-full shadow-lg backdrop-blur-sm border border-white/20">⚡ Best Value</span>}
                </div>

                {/* Top-right actions (Save & Compare) */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
                    <button
                        type="button"
                        aria-label="Save property"
                        onClick={e => {
                            e.stopPropagation();
                            e.preventDefault();
                            onSave?.();
                        }}
                        className={cn(
                            "w-9 h-9 rounded-xl border-none cursor-pointer flex items-center justify-center backdrop-blur-md text-white transition-all shadow-lg hover:scale-105 active:scale-95",
                            isSaved ? "bg-rose-500/80" : "bg-black/40 hover:bg-black/60"
                        )}
                    >
                        <Heart className={cn("w-4.5 h-4.5", isSaved && "fill-current")} />
                    </button>
                    <button
                        type="button"
                        aria-label="Compare property"
                        onClick={e => {
                            e.stopPropagation();
                            e.preventDefault();
                            onCompare?.();
                        }}
                        className={cn(
                            "w-9 h-9 rounded-xl border-none cursor-pointer flex items-center justify-center backdrop-blur-md text-white transition-all shadow-lg hover:scale-105 active:scale-95",
                            inCompare ? "bg-primary/80" : "bg-black/40 hover:bg-black/60"
                        )}
                    >
                        <Scale className="w-4.5 h-4.5" />
                    </button>
                </div>

                {/* Price & Rating */}
                <div className="absolute bottom-3.5 left-4 text-white z-10 pointer-events-none">
                    <p className="text-2xl font-black mb-0 tracking-tight">₹{p.rentAmount?.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] font-black opacity-70 uppercase tracking-widest leading-none mt-0.5">per month</p>
                </div>
                {p.rating > 0 && (
                    <div className="absolute bottom-3.5 right-4 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md flex items-center gap-1.5 shadow-lg z-10 pointer-events-none">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-white text-xs font-black">{p.rating}</span>
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-black text-foreground truncate group-hover:text-foreground/95 transition-colors duration-200">
                        {p.name}
                    </h3>
                    <p className="text-xs text-muted-foreground/75 font-semibold flex items-center gap-1.5 mt-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        <span className="truncate">{p.city}{p.address ? `, ${p.address}` : ''}</span>
                    </p>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 text-xs font-bold pt-1 pb-3.5 border-b border-border/60 text-muted-foreground flex-wrap">
                    {p.type === 'commercial' || p.type === 'shop' ? (
                        <>
                            <span className="flex items-center gap-1.5"><Square className="w-4 h-4 text-amber-500" />{p.commercialArea || p.squareFeet || 0} sqft</span>
                            <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-blue-500" />{p.frontage || (p.floor !== undefined ? `Floor ${p.floor}` : 'Commercial')}</span>
                        </>
                    ) : p.type === 'hostel' ? (
                        <>
                            <span className="flex items-center gap-1.5"><Bed className="w-4 h-4 text-purple-500" />{p.totalBeds ? `${p.totalBeds} Beds` : `${p.bedrooms || 0} Rooms`}</span>
                            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-indigo-500" />{p.roomType || 'Hostel'}</span>
                        </>
                    ) : p.type === 'pg' ? (
                        <>
                            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-rose-500" />{p.sharingCapacity ? `${p.sharingCapacity} Sharing` : (p.roomType || 'PG')}</span>
                            <span className="flex items-center gap-1.5"><Bath className="w-4 h-4 text-emerald-500" />{p.bathroomType || `${p.bathrooms || 0} Bath`}</span>
                        </>
                    ) : (
                        <>
                            <span className="flex items-center gap-1.5"><Bed className="w-4 h-4" style={{ color }} />{p.bhk || `${p.bedrooms || 0} Bed`}</span>
                            <span className="flex items-center gap-1.5"><Bath className="w-4 h-4 text-emerald-500" />{p.bathrooms || 0} Bath</span>
                            {Boolean(p.squareFeet || p.builtUpArea) && (
                                <span className="flex items-center gap-1.5"><Square className="w-4 h-4 text-amber-500" />{p.squareFeet || p.builtUpArea} sqft</span>
                            )}
                        </>
                    )}
                </div>

                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {mgr?.avatar ? (
                            <img src={mgr.avatar} alt="Manager" className="w-8 h-8 rounded-xl object-cover border border-border shadow-sm flex-shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white shadow-md flex-shrink-0" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}>
                                {mgrInitial}
                            </div>
                        )}
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-extrabold text-muted-foreground/50 uppercase tracking-wider leading-none">Manager</span>
                            <span className="text-xs font-bold text-foreground truncate max-w-[110px] sm:max-w-[130px]">
                                {mgrName}
                            </span>
                        </div>
                    </div>

                    {/* Right-anchored Circular Arrow -> Expanding View Details Action */}
                    <div className="flex justify-end flex-shrink-0">
                        <button
                            type="button"
                            aria-label={`View details for ${p.name}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onClick?.();
                            }}
                            onMouseEnter={() => setBtnHovered(true)}
                            onMouseLeave={() => setBtnHovered(false)}
                            onFocus={() => setBtnHovered(true)}
                            onBlur={() => setBtnHovered(false)}
                            className="relative h-9 rounded-full flex items-center justify-end overflow-hidden cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                            style={{
                                width: btnHovered ? '126px' : '36px',
                                backgroundColor: btnHovered
                                    ? theme === 'light' ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.12)'
                                    : theme === 'light' ? 'rgba(0, 0, 0, 0.045)' : 'rgba(255, 255, 255, 0.06)',
                                borderColor: btnHovered
                                    ? theme === 'light' ? 'rgba(0, 0, 0, 0.16)' : 'rgba(255, 255, 255, 0.18)'
                                    : theme === 'light' ? 'rgba(0, 0, 0, 0.10)' : 'rgba(255, 255, 255, 0.10)',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                boxShadow: btnHovered
                                    ? theme === 'light' ? '0 4px 14px rgba(0, 0, 0, 0.08)' : '0 6px 18px rgba(0, 0, 0, 0.22)'
                                    : 'none',
                                transform: btnHovered ? 'translateY(-1px)' : 'translateY(0px)',
                                transition: 'width 380ms cubic-bezier(0.22, 1, 0.36, 1), background-color 300ms ease, border-color 300ms ease, box-shadow 300ms ease, transform 300ms ease'
                            }}
                        >
                            {/* Sliding Queue Revealed Letters */}
                            <div
                                className="overflow-hidden flex items-center whitespace-nowrap pointer-events-none"
                                style={{
                                    width: btnHovered ? '82px' : '0px',
                                    paddingLeft: btnHovered ? '12px' : '0px',
                                    opacity: btnHovered ? 1 : 0,
                                    transition: 'width 380ms cubic-bezier(0.22, 1, 0.36, 1), padding-left 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease'
                                }}
                            >
                                <span
                                    className="text-xs font-black tracking-tight flex items-center select-none"
                                    style={{
                                        color: theme === 'light' ? '#0f172a' : '#F5F7FA'
                                    }}
                                >
                                    {VIEW_DETAILS_LETTERS.map((char, i) => (
                                        <span
                                            key={i}
                                            className="inline-block select-none"
                                            style={{
                                                transform: btnHovered ? 'translateX(0px)' : 'translateX(-8px)',
                                                opacity: btnHovered ? 1 : 0,
                                                transition: 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease',
                                                transitionDelay: btnHovered ? `${i * 16}ms` : `${(VIEW_DETAILS_LETTERS.length - 1 - i) * 8}ms`
                                            }}
                                        >
                                            {char}
                                        </span>
                                    ))}
                                </span>
                            </div>

                            {/* Circular Arrow Anchor */}
                            <div className="w-[34px] h-[34px] flex items-center justify-center flex-shrink-0">
                                <ArrowRight
                                    className="w-3.5 h-3.5 transition-transform duration-300 pointer-events-none text-foreground"
                                    style={{
                                        transform: btnHovered ? 'translateX(1px)' : 'translateX(0px)',
                                    }}
                                />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export const GridCard = PropertyCard;
export default PropertyCard;

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    MapPin, Bed, Bath, Square, Navigation, Building2,
    ArrowRight, Map, LayoutGrid, Heart, Scale, RefreshCw,
    ShieldCheck, AlertTriangle, Compass, CheckCircle2, ChevronRight
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { propertyService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';
import { resolveMediaUrl, DEFAULT_PLACEHOLDER_SVG } from '../../utils/propertyHelper';

// Custom Leaflet Icons styled in Emerald / Teal TMS theme
const createMarkerIcon = (isCurrent = false) => {
    const bg = isCurrent ? '#10b981' : '#059669';
    const border = isCurrent ? '#047857' : '#065f46';
    const pulse = isCurrent ? '<span class="absolute -inset-1 rounded-full bg-emerald-400/40 animate-ping"></span>' : '';
    
    return L.divIcon({
        className: 'custom-nearby-marker',
        html: `
            <div class="relative flex items-center justify-center cursor-pointer">
                ${pulse}
                <div class="relative w-8 h-8 rounded-full shadow-xl flex items-center justify-center text-white font-black text-[10px] border-2" style="background: ${bg}; border-color: ${border};">
                    ${isCurrent ? '★' : '🏠'}
                </div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18]
    });
};

function MiniNearbyMap({ target, properties, onSelectProperty }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    const targetCoords = useMemo(() => {
        if (target?.location?.lat && target?.location?.lng) {
            return [Number(target.location.lat), Number(target.location.lng)];
        }
        return null;
    }, [target]);

    useEffect(() => {
        if (!mapRef.current || !targetCoords) return;

        if (mapInstanceRef.current) {
            try {
                mapInstanceRef.current.remove();
            } catch (e) {
                // Ignore cleanup errors
            }
            mapInstanceRef.current = null;
        }

        if (mapRef.current._leaflet_id) {
            delete mapRef.current._leaflet_id;
        }

        try {
            const map = L.map(mapRef.current, {
                scrollWheelZoom: false,
                zoomControl: true
            }).setView(targetCoords, 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);

            // Target Property Marker
            const targetMarker = L.marker(targetCoords, {
                icon: createMarkerIcon(true)
            }).addTo(map);

            targetMarker.bindPopup(`
                <div class="p-1 font-sans">
                    <span class="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">Current Property</span>
                    <strong class="text-xs font-black text-slate-900 block mt-0.5">${target.name}</strong>
                    <span class="text-[10px] text-slate-500 block">${target.city || ''}</span>
                </div>
            `);

            // Nearby Property Markers
            const bounds = [targetCoords];

            properties.forEach(p => {
                const lat = Number(p.location?.lat);
                const lng = Number(p.location?.lng);
                if (!isNaN(lat) && !isNaN(lng)) {
                    bounds.push([lat, lng]);
                    const marker = L.marker([lat, lng], {
                        icon: createMarkerIcon(false)
                    }).addTo(map);

                    const coverImg = resolveMediaUrl(p.images?.[0] || p.media?.find(m => m.mediaType === 'image')?.url) || DEFAULT_PLACEHOLDER_SVG;
                    const priceFormatted = p.rentAmount ? `₹${Number(p.rentAmount).toLocaleString('en-IN')}` : '';
                    const distBadge = p.distanceText ? `<span style="background: rgba(16, 185, 129, 0.15); color: #059669; padding: 2px 6px; border-radius: 6px; font-weight: 800; font-size: 9px;">${p.distanceText}</span>` : '';

                    marker.bindPopup(`
                        <div style="font-family: system-ui, -apple-system, sans-serif; width: 170px; padding: 2px;">
                            <div style="height: 80px; border-radius: 8px; overflow: hidden; margin-bottom: 6px; background: #f1f5f9;">
                                <img src="${coverImg}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${DEFAULT_PLACEHOLDER_SVG}'" />
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                ${distBadge}
                                <span style="font-weight: 900; font-size: 11px; color: #0f172a;">${priceFormatted}<small style="font-weight: 500; font-size: 9px; color: #64748b;">/mo</small></span>
                            </div>
                            <strong style="font-size: 11px; font-weight: 800; color: #0f172a; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</strong>
                            <span style="font-size: 10px; color: #64748b; display: block; margin-top: 1px;">${p.city || ''}</span>
                        </div>
                    `);

                    marker.on('click', () => {
                        if (onSelectProperty) onSelectProperty(p);
                    });
                }
            });

            if (bounds.length > 1) {
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
            }

            mapInstanceRef.current = map;
        } catch (err) {
            console.warn('[MiniNearbyMap] Initialization warning:', err);
        }

        return () => {
            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.remove();
                } catch (e) {
                    // Ignore cleanup errors
                }
                mapInstanceRef.current = null;
            }
        };
    }, [targetCoords, properties, target?.name, target?.city, onSelectProperty]);

    if (!targetCoords) {
        return (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-6 bg-muted/40 rounded-3xl border border-dashed border-border text-center">
                <MapPin className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-bold text-muted-foreground">Map coordinates unavailable for this location</p>
            </div>
        );
    }

    return (
        <div className="h-full min-h-[320px] rounded-3xl overflow-hidden border border-border shadow-inner relative z-0">
            <div ref={mapRef} className="w-full h-full min-h-[320px]" />
        </div>
    );
}

function NearbyCardSkeleton() {
    return (
        <div className="rounded-3xl bg-card border border-border overflow-hidden p-3.5 space-y-3 animate-pulse">
            <div className="h-44 rounded-2xl bg-muted" />
            <div className="space-y-2 px-1">
                <div className="h-4 w-3/4 bg-muted rounded-md" />
                <div className="h-3 w-1/2 bg-muted rounded-md" />
                <div className="h-3 w-full bg-muted rounded-md mt-2" />
                <div className="flex justify-between items-center pt-2">
                    <div className="h-5 w-24 bg-muted rounded-md" />
                    <div className="h-7 w-20 bg-muted rounded-xl" />
                </div>
            </div>
        </div>
    );
}

export default function NearbyPropertiesSection({
    property,
    onSaveProperty,
    savedPropertyIds = new Set(),
    onToggleCompare,
    comparePropertyIds = new Set()
}) {
    const navigate = useNavigate();
    const { theme } = useTheme();

    const [nearbyList, setNearbyList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [scopeLabel, setScopeLabel] = useState('');
    const [activeSelectedId, setActiveSelectedId] = useState(null);

    const fetchNearby = async () => {
        if (!property?._id) return;
        setLoading(true);
        setError(null);
        try {
            const res = await propertyService.getNearbyProperties(property._id, { limit: 6 });
            const data = res?.data?.data || res?.data || [];
            const list = Array.isArray(data) ? data : [];
            setNearbyList(list);
            setScopeLabel(res?.data?.scopeLabel || `Nearby in ${property.city || 'this area'}`);
        } catch (err) {
            console.error('[NearbyPropertiesSection] Error fetching nearby properties:', err);
            setError('Unable to load nearby properties. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNearby();
    }, [property?._id]);

    const handleViewProperty = (propId) => {
        if (!propId) return;
        navigate(`/properties/${propId}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleExploreWiderCity = () => {
        navigate('/browse');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <section className="space-y-6 pt-10 border-t border-border/60">
            {/* Header with Title, Scope Badge and View Mode Controls */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1">
                            <Compass className="w-3 h-3 text-emerald-500" /> Location Discovery
                        </span>
                        {scopeLabel && (
                            <span className="text-[11px] font-bold text-muted-foreground/75">
                                • {scopeLabel}
                            </span>
                        )}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                        What's Around This Property?
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium max-w-xl">
                        Explore verified homes near this location in {property?.city || 'the area'}.
                    </p>
                </div>

                {/* Controls: Mode Toggle & Explore Link */}
                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                    {nearbyList.length > 0 && (
                        <div className="p-1 rounded-2xl bg-muted border border-border flex items-center gap-1 shadow-sm">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                                    viewMode === 'grid'
                                        ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-sm border border-border"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" /> Cards
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('map')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                                    viewMode === 'map'
                                        ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-sm border border-border"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Map className="w-3.5 h-3.5" /> Map View
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleExploreWiderCity}
                        className="px-4 py-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-500/20 shadow-sm"
                    >
                        <span>Explore {property?.city || 'Area'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && !loading && (
                <div className="p-5 rounded-3xl bg-destructive/5 border border-destructive/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                        <div>
                            <p className="text-xs font-black text-destructive uppercase tracking-wider">Unable to load nearby properties</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={fetchNearby}
                        className="px-4 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Try again
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <NearbyCardSkeleton />
                    <NearbyCardSkeleton />
                    <NearbyCardSkeleton />
                </div>
            )}

            {/* Compact Refined Empty State — No duplicate button */}
            {!loading && !error && nearbyList.length === 0 && (
                <div className="py-6 px-6 sm:px-8 rounded-3xl bg-card/70 border border-border/80 flex items-center gap-4 shadow-sm">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center text-lg shrink-0 shadow-inner">
                        📍
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-sm font-black text-foreground">No verified homes nearby</h3>
                        <p className="text-xs text-muted-foreground font-medium">
                            There aren't other verified properties close to this location yet.
                        </p>
                    </div>
                </div>
            )}

            {/* Content: Grid or Map View */}
            {!loading && !error && nearbyList.length > 0 && (
                <div>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {nearbyList.map((p) => {
                                const coverImg = resolveMediaUrl(p.images?.[0] || p.media?.find(m => m.mediaType === 'image')?.url) || DEFAULT_PLACEHOLDER_SVG;
                                const isSaved = savedPropertyIds?.has(String(p._id || p.id));
                                const isCompared = comparePropertyIds?.has(String(p._id || p.id));

                                return (
                                    <motion.div
                                        key={p._id}
                                        whileHover={{ y: -4 }}
                                        onClick={() => handleViewProperty(p._id)}
                                        className="group cursor-pointer rounded-3xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-xl hover:border-emerald-500/40 transition-all flex flex-col justify-between"
                                    >
                                        <div className="p-3.5 space-y-3">
                                            {/* Property Cover Image Stage */}
                                            <div className="aspect-[16/10] rounded-2xl overflow-hidden relative bg-muted">
                                                <img
                                                    src={coverImg}
                                                    alt={p.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = DEFAULT_PLACEHOLDER_SVG;
                                                    }}
                                                />

                                                {/* Distance / Proximity Pill */}
                                                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                                                    {p.distanceText && (
                                                        <span className="px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md text-emerald-400 font-black text-[10px] tracking-wide shadow-lg border border-emerald-500/30 flex items-center gap-1">
                                                            <Navigation className="w-3 h-3 text-emerald-400" />
                                                            {p.distanceText} away
                                                        </span>
                                                    )}
                                                    {(p.verificationStatus === 'verified' || p.verifiedBadge) && (
                                                        <span className="px-2 py-1 rounded-xl bg-emerald-600/90 backdrop-blur-md text-white font-black text-[10px] tracking-wide shadow-lg flex items-center gap-1">
                                                            <ShieldCheck className="w-3 h-3" />
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Price Badge */}
                                                <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/10 text-white font-black text-xs shadow-lg">
                                                    ₹{p.rentAmount?.toLocaleString('en-IN') || '0'}
                                                    <span className="text-[9px] font-bold text-slate-400">/mo</span>
                                                </div>

                                                {/* Quick Action Overlay (Save & Compare) */}
                                                <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                                    {onSaveProperty && (
                                                        <button
                                                            type="button"
                                                            aria-label="Save property"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                onSaveProperty(String(p._id || p.id));
                                                            }}
                                                            className={cn(
                                                                "p-2 rounded-xl backdrop-blur-md transition-all shadow-md cursor-pointer",
                                                                isSaved
                                                                    ? "bg-rose-500 text-white"
                                                                    : "bg-slate-950/70 hover:bg-slate-900 text-white hover:scale-105"
                                                            )}
                                                        >
                                                            <Heart className={cn("w-3.5 h-3.5", isSaved && "fill-current")} />
                                                        </button>
                                                    )}
                                                    {onToggleCompare && (
                                                        <button
                                                            type="button"
                                                            aria-label="Compare property"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                onToggleCompare(p);
                                                            }}
                                                            className={cn(
                                                                "p-2 rounded-xl backdrop-blur-md transition-all shadow-md cursor-pointer",
                                                                isCompared
                                                                    ? "bg-emerald-600 text-white"
                                                                    : "bg-slate-950/70 hover:bg-slate-900 text-white hover:scale-105"
                                                            )}
                                                        >
                                                            <Scale className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Property Details Info */}
                                            <div className="space-y-1.5 px-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="font-black text-sm text-foreground truncate group-hover:text-emerald-500 transition-colors">
                                                        {p.name}
                                                    </h3>
                                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/60 shrink-0">
                                                        {p.type}
                                                    </span>
                                                </div>

                                                <p className="text-xs text-muted-foreground/80 font-medium flex items-center gap-1 truncate">
                                                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                    <span className="truncate">{p.city}{p.address ? `, ${p.address}` : ''}</span>
                                                </p>

                                                {/* Specs */}
                                                <div className="flex items-center gap-3 pt-2 text-[11px] font-bold text-muted-foreground border-t border-border/50">
                                                    <span className="flex items-center gap-1">
                                                        <Bed className="w-3.5 h-3.5 text-emerald-500" /> {p.bedrooms || 0} Bed
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Bath className="w-3.5 h-3.5 text-teal-500" /> {p.bathrooms || 0} Bath
                                                    </span>
                                                    {p.squareFeet && (
                                                        <span className="flex items-center gap-1">
                                                            <Square className="w-3.5 h-3.5 text-amber-500" /> {p.squareFeet} sqft
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Footer Action */}
                                        <div className="px-4 py-2.5 bg-muted/30 border-t border-border/50 flex items-center justify-between text-xs font-bold text-foreground">
                                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60">
                                                {p.proximityBadge || 'Nearby'}
                                            </span>
                                            <span className="text-emerald-500 dark:text-emerald-400 font-black flex items-center gap-1 text-[11px] uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                                                View Property <ChevronRight className="w-3.5 h-3.5" />
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Split Map & Cards Side-by-Side */
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                            <div className="lg:col-span-7 h-[380px] lg:h-[460px]">
                                <MiniNearbyMap
                                    target={property}
                                    properties={nearbyList}
                                    onSelectProperty={(p) => setActiveSelectedId(p._id)}
                                />
                            </div>

                            <div className="lg:col-span-5 flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-1">
                                <div className="sticky top-0 bg-background/90 backdrop-blur-md py-1 z-10">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                        {nearbyList.length} properties around this location
                                    </p>
                                </div>
                                {nearbyList.map(p => {
                                    const coverImg = resolveMediaUrl(p.images?.[0] || p.media?.find(m => m.mediaType === 'image')?.url) || DEFAULT_PLACEHOLDER_SVG;
                                    const isSelected = activeSelectedId === p._id;

                                    return (
                                        <div
                                            key={p._id}
                                            onClick={() => handleViewProperty(p._id)}
                                            onMouseEnter={() => setActiveSelectedId(p._id)}
                                            className={cn(
                                                "p-3 rounded-2xl border transition-all cursor-pointer flex gap-3.5 items-center bg-card shadow-sm hover:shadow-md",
                                                isSelected ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-border hover:border-emerald-500/40"
                                            )}
                                        >
                                            <div className="w-20 h-16 rounded-xl overflow-hidden bg-muted shrink-0 relative">
                                                <img
                                                    src={coverImg}
                                                    alt={p.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = DEFAULT_PLACEHOLDER_SVG;
                                                    }}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <h4 className="font-black text-xs text-foreground truncate">{p.name}</h4>
                                                    {p.distanceText && (
                                                        <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                                                            {p.distanceText}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground truncate">{p.city}</p>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-xs font-black text-foreground">
                                                        ₹{p.rentAmount?.toLocaleString('en-IN')}<small className="text-[9px] text-muted-foreground font-normal">/mo</small>
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-bold">
                                                        {p.bedrooms || 0} Bed • {p.bathrooms || 0} Bath
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

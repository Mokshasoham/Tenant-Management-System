import React, { useState, useEffect, useRef, Suspense, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Search, MapPin, Bed, Bath, Square, Building2,
    Star, ArrowRight, SlidersHorizontal, X,
    Zap, LayoutGrid, Map, Heart, Scale, ChevronDown,
    CheckCircle2, RefreshCw, AlertTriangle, Filter, Sparkles, Tag
} from 'lucide-react';
import { propertyService } from '../../services/api';
import { cn } from '../../utils/cn';
import useAuthStore from '../../context/authStore';
import { useTheme } from '../../context/ThemeContext';
import { getDisplayStatus, resolveMediaUrl, DEFAULT_PLACEHOLDER_SVG } from '../../utils/propertyHelper';
import handleViewPropertyNavigation from '../../utils/propertyNavigationHelper';

import InteractivePropertyMap from '../PropertyMap';

// ── Error boundary for Leaflet map crashes ──
class MapErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    render() {
        if (this.state.hasError) {
            return (
                <div className="h-full min-h-[480px] flex flex-col items-center justify-center gap-4 bg-destructive/5 border border-dashed border-destructive/30 rounded-[2.5rem]">
                    <AlertTriangle className="w-10 h-10 text-destructive" />
                    <p className="text-destructive font-black text-sm uppercase tracking-widest">Map failed to load</p>
                    <p className="text-muted-foreground text-xs">{this.state.error?.message}</p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-6 py-2.5 rounded-full bg-emerald-600 text-white font-black text-xs shadow-xl transition-all cursor-pointer"
                    >
                        Reload Map View
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const SORT_OPTIONS = [
    { value: 'createdAt', label: 'Newest First' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'bedrooms', label: 'Most Bedrooms' },
];

const TYPE_COLORS = {
    apartment: '#10b981',
    house: '#059669',
    commercial: '#f59e0b',
    land: '#8b5cf6',
};

// ── Skeleton Card ──
function SkeletonCard({ compact = false }) {
    if (compact) {
        return (
            <div className="flex gap-3 p-3 rounded-2xl bg-card border border-border animate-pulse">
                <div className="w-24 h-20 rounded-xl flex-shrink-0 bg-muted" />
                <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3.5 w-[70%] rounded-md bg-muted" />
                    <div className="h-3 w-[50%] rounded-md bg-muted" />
                    <div className="h-4.5 w-[40%] rounded-md bg-muted" />
                </div>
            </div>
        );
    }
    return (
        <div className="rounded-[1.75rem] overflow-hidden bg-card border border-border animate-pulse p-4 space-y-3">
            <div className="h-48 rounded-2xl bg-muted" />
            <div className="space-y-2.5 px-1">
                <div className="h-4 w-3/4 bg-muted rounded-md" />
                <div className="h-3 w-1/2 bg-muted rounded-md" />
                <div className="h-8 w-full bg-muted rounded-xl mt-2" />
            </div>
        </div>
    );
}

// ── Compact card for the map side-panel ──
function CompactCard({ p, isSaved, inCompare, onSave, onCompare, onClick }) {
    const { theme } = useTheme();
    const coverUrl = resolveMediaUrl(p.images?.[0] || p.media?.find(m => m.mediaType === 'image')?.url);
    return (
        <motion.div whileHover={{ y: -1 }} onClick={onClick}
            className="flex gap-3 p-3 rounded-2xl cursor-pointer bg-card border border-border hover:border-emerald-500/50 transition-all shadow-sm">
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
                    : <div className="w-full h-full flex items-center justify-center text-2xl">🏠</div>
                }
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between gap-1">
                        <p className="font-black text-xs text-foreground truncate">{p.name}</p>
                        <span className="text-[9px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                            {p.type || 'Home'}
                        </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        📍 {[p.city, p.state].filter(Boolean).join(', ')}
                    </p>
                </div>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-black text-foreground">
                        ₹{(p.rentAmount || 0).toLocaleString('en-IN')}<small className="text-[9px] text-muted-foreground font-normal">/mo</small>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold">
                        {p.bedrooms || 0} Bed • {p.bathrooms || 0} Bath
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

// ── Full grid card ──
function GridCard({ p, index, isSaved, inCompare, onSave, onCompare, onClick }) {
    const { theme } = useTheme();

    const allMedia = p.media || [];
    const rawImages = p.images?.length
        ? p.images
        : allMedia.filter(m => m.mediaType === 'image').map(m => m.url);
    const imageUrls = rawImages.map(resolveMediaUrl).filter(Boolean);

    const [currentImgIndex, setCurrentImgIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const intervalRef = useRef(null);

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

    const coverImg = imageUrls[currentImgIndex] || DEFAULT_PLACEHOLDER_SVG;
    const mgr = p.manager || p.owner;
    const mgrName = mgr?.name || (mgr?.firstName ? `${mgr.firstName} ${mgr?.lastName || ''}`.trim() : (p.ownerName || 'Manager not assigned'));

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.4) }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group cursor-pointer rounded-3xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-xl hover:border-emerald-500/40 transition-all flex flex-col justify-between"
        >
            <div className="p-3.5 space-y-3">
                {/* Media Stage */}
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

                    {/* Top Left: Type & Verified */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md text-emerald-400 font-black text-[10px] tracking-wide shadow-lg border border-emerald-500/30 uppercase">
                            {p.type || 'Property'}
                        </span>
                        {(p.verificationStatus === 'verified' || p.verifiedBadge) && (
                            <span className="px-2 py-1 rounded-xl bg-emerald-600/90 backdrop-blur-md text-white font-black text-[10px] tracking-wide shadow-lg flex items-center gap-1">
                                ✓ Verified
                            </span>
                        )}
                    </div>

                    {/* Price Badge */}
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/10 text-white font-black text-xs shadow-lg">
                        ₹{(p.rentAmount || 0).toLocaleString('en-IN')}
                        <span className="text-[9px] font-bold text-slate-400">/mo</span>
                    </div>

                    {/* Save & Compare Quick Overlays */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        {onSave && (
                            <button
                                type="button"
                                aria-label="Save property"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onSave();
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
                        {onCompare && (
                            <button
                                type="button"
                                aria-label="Compare property"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onCompare();
                                }}
                                className={cn(
                                    "p-2 rounded-xl backdrop-blur-md transition-all shadow-md cursor-pointer",
                                    inCompare
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-950/70 hover:bg-slate-900 text-white hover:scale-105"
                                )}
                            >
                                <Scale className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 px-1">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="font-black text-sm text-foreground truncate group-hover:text-emerald-500 transition-colors">
                            {p.name}
                        </h3>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/60 shrink-0">
                            Available
                        </span>
                    </div>

                    <p className="text-xs text-muted-foreground/80 font-medium flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{[p.address, p.city, p.state].filter(Boolean).join(', ')}</span>
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

            {/* Footer */}
            <div className="px-4 py-2.5 bg-muted/30 border-t border-border/50 flex items-center justify-between text-xs font-bold text-foreground">
                <span className="text-[11px] font-bold text-muted-foreground truncate max-w-[140px]">
                    {mgrName}
                </span>
                <span className="text-emerald-500 dark:text-emerald-400 font-black flex items-center gap-1 text-[11px] uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                    View Details →
                </span>
            </div>
        </motion.div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
//  AUTHORITATIVE TENANT BROWSE & CITY DISCOVERY COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export function TenantBrowseProperties() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Parse URL params
    const initialCity = searchParams.get('city') || '';
    const initialView = searchParams.get('view') === 'map' ? 'map' : 'grid';
    const initialSearch = searchParams.get('search') || '';
    const initialType = searchParams.get('type') || '';
    const initialMinPrice = searchParams.get('minPrice') || '';
    const initialMaxPrice = searchParams.get('maxPrice') || '';
    const initialBedrooms = searchParams.get('bedrooms') || '';
    const initialFurnishing = searchParams.get('furnishing') || '';

    const user = useAuthStore((state) => state.user);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState(initialView);
    const [search, setSearch] = useState(initialSearch);
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState('createdAt');
    const [filters, setFilters] = useState({
        city: initialCity,
        type: initialType,
        minPrice: initialMinPrice,
        maxPrice: initialMaxPrice,
        bedrooms: initialBedrooms,
        furnishing: initialFurnishing,
        country: ''
    });
    const [savedIds, setSavedIds] = useState(new Set());
    const [compareList, setCompareList] = useState([]);
    const [mapBounds, setMapBounds] = useState(null);
    const debounce = useRef(null);

    // Sync when URL query changes (e.g. browser back/forward or navigation from property details)
    useEffect(() => {
        const urlCity = searchParams.get('city') || '';
        const urlView = searchParams.get('view') === 'map' ? 'map' : 'grid';
        if (urlCity !== filters.city) {
            setFilters(prev => ({ ...prev, city: urlCity }));
        }
        if (urlView !== viewMode) {
            setViewMode(urlView);
        }
    }, [searchParams]);

    // Update URL query parameters seamlessly
    const syncUrlParams = (currentFilters, currentSearch, currentView) => {
        const params = {};
        if (currentFilters.city) params.city = currentFilters.city;
        if (currentFilters.type) params.type = currentFilters.type;
        if (currentFilters.minPrice) params.minPrice = currentFilters.minPrice;
        if (currentFilters.maxPrice) params.maxPrice = currentFilters.maxPrice;
        if (currentFilters.bedrooms) params.bedrooms = currentFilters.bedrooms;
        if (currentFilters.furnishing) params.furnishing = currentFilters.furnishing;
        if (currentSearch) params.search = currentSearch;
        if (currentView === 'map') params.view = 'map';

        setSearchParams(params, { replace: true });
    };

    // ── Fetch properties from backend using authoritative public filter ──
    const fetchProperties = useCallback(async (overrides = {}) => {
        setLoading(true);
        setError(null);
        try {
            const currentFilterState = { ...filters, ...overrides };
            const currentSearch = overrides.search !== undefined ? overrides.search : search;
            const currentSort = overrides.sortBy || sortBy;

            const params = {
                limit: 100,
                sortBy: currentSort,
                ...currentFilterState,
                search: currentSearch,
            };

            // Clean up empty params
            Object.keys(params).forEach(k => {
                if (params[k] === '' || params[k] === undefined || params[k] === null) {
                    delete params[k];
                }
            });

            const res = await propertyService.getAllProperties(params);
            const rawList = res?.data?.data || res?.data || [];
            const list = Array.isArray(rawList) ? rawList : [];
            setProperties(list);

            // Fetch saved properties for active authenticated user
            const activeUser = useAuthStore.getState().user;
            if (activeUser) {
                try {
                    const savedRes = await propertyService.getAllProperties({ savedOnly: true, limit: 100 });
                    const savedList = savedRes?.data?.data || savedRes?.data || [];
                    if (Array.isArray(savedList)) {
                        setSavedIds(new Set(savedList.map(p => String(p._id || p.id))));
                    }
                } catch (e) {
                    console.log('Failed to fetch user saved properties:', e);
                }
            }
        } catch (err) {
            console.error('[TenantBrowseProperties] Fetch error:', err);
            setError(`Unable to load properties. Please try again.`);
            setProperties([]);
        } finally {
            setLoading(false);
        }
    }, [filters, search, sortBy]);

    useEffect(() => {
        fetchProperties();
    }, [filters.city, filters.type, filters.minPrice, filters.maxPrice, filters.bedrooms, filters.furnishing, sortBy]);

    const handleSearchChange = (val) => {
        setSearch(val);
        syncUrlParams(filters, val, viewMode);
        clearTimeout(debounce.current);
        debounce.current = setTimeout(() => {
            fetchProperties({ search: val });
        }, 500);
    };

    const handleCityClear = () => {
        const nextFilters = { ...filters, city: '' };
        setFilters(nextFilters);
        syncUrlParams(nextFilters, search, viewMode);
    };

    const handleResetAllFilters = () => {
        const reset = { city: '', type: '', minPrice: '', maxPrice: '', bedrooms: '', furnishing: '', country: '' };
        setFilters(reset);
        setSearch('');
        syncUrlParams(reset, '', viewMode);
    };

    const handleViewModeToggle = (mode) => {
        setViewMode(mode);
        syncUrlParams(filters, search, mode);
    };

    const handleSave = async (propId) => {
        const strId = String(propId);
        setSavedIds(prev => {
            const next = new Set(prev);
            if (next.has(strId)) next.delete(strId);
            else next.add(strId);
            return next;
        });
        try {
            await propertyService.saveProperty(propId);
        } catch (err) {
            console.error('Failed to save property:', err);
        }
    };

    const toggleCompare = (prop) => {
        const pId = String(prop._id || prop.id);
        setCompareList(prev => {
            if (prev.some(p => String(p._id || p.id) === pId)) {
                return prev.filter(p => String(p._id || p.id) !== pId);
            }
            if (prev.length >= 4) return prev;
            return [...prev, prop];
        });
    };

    const handleMapBoundsChange = (bounds) => {
        setMapBounds(bounds);
        fetchProperties({ ...bounds });
    };

    // Active filters count
    const activeFilterCount = Object.entries(filters).filter(([k, v]) => Boolean(v) && k !== 'country').length;

    const formattedCity = filters.city
        ? filters.city.trim().charAt(0).toUpperCase() + filters.city.trim().slice(1)
        : '';

    const inputClass = "bg-muted border border-border rounded-xl px-3.5 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full transition-all placeholder:text-muted-foreground/40";

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* ══ TOP BAR & CITY DISCOVERY HEADER ══ */}
            <div className="p-5 rounded-[2rem] bg-card border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
                {/* Dynamic Title / City Discovery Header */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        {filters.city ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> City Discovery • {formattedCity}
                            </span>
                        ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> All Listings
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                        {filters.city ? `Find a Home in ${formattedCity}` : 'Find a Home'}
                    </h1>
                    <p className="text-xs text-muted-foreground font-medium">
                        {loading
                            ? `Searching verified homes${filters.city ? ` in ${formattedCity}` : ''}…`
                            : filters.city
                                ? `${properties.length} verified home${properties.length === 1 ? '' : 's'} available in ${formattedCity}`
                                : `${properties.length} verified properties available`
                        }
                    </p>
                </div>

                {/* Controls Bar */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Field */}
                    <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                        <input
                            value={search}
                            onChange={e => handleSearchChange(e.target.value)}
                            placeholder={filters.city ? `Search within ${formattedCity}…` : "Search city, locality, name…"}
                            className={cn(inputClass, "pl-10 h-11 text-xs")}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => handleSearchChange('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            className={cn(inputClass, "h-11 pr-9 appearance-none cursor-pointer w-auto font-bold text-xs")}
                        >
                            {SORT_OPTIONS.map(o => (
                                <option key={o.value} value={o.value} className="bg-card">
                                    {o.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                    </div>

                    {/* Filter Toggle */}
                    <button
                        type="button"
                        onClick={() => setShowFilters(v => !v)}
                        className={cn(
                            inputClass, "h-11 w-auto px-4 flex items-center gap-2 font-bold text-xs cursor-pointer shadow-sm",
                            showFilters || activeFilterCount > 0
                                ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Filters</span>
                        {activeFilterCount > 0 && (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {/* Grid / Map Toggle */}
                    <div className="flex bg-muted p-1 rounded-2xl border border-border shadow-inner">
                        <button
                            type="button"
                            onClick={() => handleViewModeToggle('grid')}
                            className={cn(
                                "px-3.5 py-1.5 rounded-xl border-none cursor-pointer flex items-center gap-1.5 text-xs font-black transition-all",
                                viewMode === 'grid'
                                    ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-sm border border-border"
                                    : "text-muted-foreground/60 hover:text-muted-foreground"
                            )}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" /> Grid
                        </button>
                        <button
                            type="button"
                            onClick={() => handleViewModeToggle('map')}
                            className={cn(
                                "px-3.5 py-1.5 rounded-xl border-none cursor-pointer flex items-center gap-1.5 text-xs font-black transition-all",
                                viewMode === 'map'
                                    ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-sm border border-border"
                                    : "text-muted-foreground/60 hover:text-muted-foreground"
                            )}
                        >
                            <Map className="w-3.5 h-3.5" /> Map
                        </button>
                    </div>
                </div>
            </div>

            {/* ══ ACTIVE FILTER CHIPS ══ */}
            {(filters.city || filters.type || filters.bedrooms || filters.furnishing || filters.minPrice || filters.maxPrice || search) && (
                <div className="flex flex-wrap items-center gap-2 px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/50 mr-1 flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Active:
                    </span>

                    {filters.city && (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                            <MapPin className="w-3 h-3 text-emerald-500" />
                            <span>{formattedCity}</span>
                            <button
                                type="button"
                                onClick={handleCityClear}
                                className="p-0.5 rounded-full hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 cursor-pointer ml-0.5"
                                title="Clear city filter"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {filters.type && (
                        <span className="px-3 py-1 rounded-full bg-muted text-foreground font-bold text-xs border border-border flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <span className="capitalize">{filters.type}</span>
                            <button
                                type="button"
                                onClick={() => setFilters(prev => ({ ...prev, type: '' }))}
                                className="p-0.5 rounded-full hover:bg-muted-foreground/20 cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {filters.bedrooms && (
                        <span className="px-3 py-1 rounded-full bg-muted text-foreground font-bold text-xs border border-border flex items-center gap-1.5">
                            <Bed className="w-3 h-3 text-muted-foreground" />
                            <span>{filters.bedrooms}+ Bedrooms</span>
                            <button
                                type="button"
                                onClick={() => setFilters(prev => ({ ...prev, bedrooms: '' }))}
                                className="p-0.5 rounded-full hover:bg-muted-foreground/20 cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {(filters.minPrice || filters.maxPrice) && (
                        <span className="px-3 py-1 rounded-full bg-muted text-foreground font-bold text-xs border border-border flex items-center gap-1.5">
                            <span>₹{filters.minPrice || '0'} - ₹{filters.maxPrice || 'Any'}</span>
                            <button
                                type="button"
                                onClick={() => setFilters(prev => ({ ...prev, minPrice: '', maxPrice: '' }))}
                                className="p-0.5 rounded-full hover:bg-muted-foreground/20 cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {filters.furnishing && (
                        <span className="px-3 py-1 rounded-full bg-muted text-foreground font-bold text-xs border border-border flex items-center gap-1.5">
                            <span className="capitalize">{filters.furnishing}</span>
                            <button
                                type="button"
                                onClick={() => setFilters(prev => ({ ...prev, furnishing: '' }))}
                                className="p-0.5 rounded-full hover:bg-muted-foreground/20 cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {search && (
                        <span className="px-3 py-1 rounded-full bg-muted text-foreground font-bold text-xs border border-border flex items-center gap-1.5">
                            <span>"{search}"</span>
                            <button
                                type="button"
                                onClick={() => handleSearchChange('')}
                                className="p-0.5 rounded-full hover:bg-muted-foreground/20 cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={handleResetAllFilters}
                        className="text-xs font-black text-rose-500 hover:underline px-2 py-1 cursor-pointer"
                    >
                        Clear All
                    </button>
                </div>
            )}

            {/* ══ EXPANDABLE FILTER DRAWER ══ */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-6 rounded-[2rem] bg-card border border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 shadow-sm">
                            {/* City Filter Input */}
                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">
                                    City / Locality
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={filters.city}
                                        placeholder="e.g. Phagwara, Visakhapatnam"
                                        onChange={e => setFilters(prev => ({ ...prev, city: e.target.value }))}
                                        className={cn(inputClass, "h-10 text-xs px-3")}
                                    />
                                    {filters.city && (
                                        <button
                                            type="button"
                                            onClick={handleCityClear}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Property Type */}
                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">
                                    Property Type
                                </label>
                                <select
                                    value={filters.type}
                                    onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                                    className={cn(inputClass, "h-10 text-xs px-3 appearance-none cursor-pointer")}
                                >
                                    <option value="" className="bg-card">All Types</option>
                                    {['apartment', 'house', 'commercial', 'land'].map(t => (
                                        <option key={t} value={t} className="bg-card">
                                            {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Min Rent */}
                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">
                                    Min Rent (₹)
                                </label>
                                <input
                                    type="number"
                                    value={filters.minPrice}
                                    placeholder="0"
                                    onChange={e => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                                    className={cn(inputClass, "h-10 text-xs px-3")}
                                />
                            </div>

                            {/* Max Rent */}
                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">
                                    Max Rent (₹)
                                </label>
                                <input
                                    type="number"
                                    value={filters.maxPrice}
                                    placeholder="e.g. 50,000"
                                    onChange={e => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                                    className={cn(inputClass, "h-10 text-xs px-3")}
                                />
                            </div>

                            {/* Bedrooms */}
                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">
                                    Bedrooms
                                </label>
                                <select
                                    value={filters.bedrooms}
                                    onChange={e => setFilters(prev => ({ ...prev, bedrooms: e.target.value }))}
                                    className={cn(inputClass, "h-10 text-xs px-3 appearance-none cursor-pointer")}
                                >
                                    <option value="" className="bg-card">Any BHK</option>
                                    <option value="1" className="bg-card">1+ BHK</option>
                                    <option value="2" className="bg-card">2+ BHK</option>
                                    <option value="3" className="bg-card">3+ BHK</option>
                                    <option value="4" className="bg-card">4+ BHK</option>
                                </select>
                            </div>

                            {/* Furnishing */}
                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">
                                    Furnishing
                                </label>
                                <select
                                    value={filters.furnishing}
                                    onChange={e => setFilters(prev => ({ ...prev, furnishing: e.target.value }))}
                                    className={cn(inputClass, "h-10 text-xs px-3 appearance-none cursor-pointer")}
                                >
                                    <option value="" className="bg-card">Any</option>
                                    {['furnished', 'semi-furnished', 'unfurnished'].map(t => (
                                        <option key={t} value={t} className="bg-card">
                                            {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Action Buttons */}
                            <div className="sm:col-span-2 lg:col-span-6 flex items-center justify-end gap-3 pt-3 border-t border-border/50">
                                <button
                                    type="button"
                                    onClick={handleResetAllFilters}
                                    className="h-10 px-5 rounded-xl border border-border text-foreground hover:bg-muted font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                                >
                                    Reset
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        syncUrlParams(filters, search, viewMode);
                                        fetchProperties();
                                        setShowFilters(false);
                                    }}
                                    className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══ ERROR STATE ══ */}
            {error && !loading && (
                <div className="p-6 rounded-3xl bg-destructive/5 border border-destructive/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                        <div>
                            <p className="text-xs font-black text-destructive uppercase tracking-wider">
                                {filters.city ? `Couldn't load properties in ${formattedCity}` : "Couldn't load properties"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => fetchProperties()}
                        className="px-4 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Try again
                    </button>
                </div>
            )}

            {/* ══ GRID VIEW ══ */}
            {viewMode === 'grid' && (
                <div>
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                    ) : properties.length === 0 ? (
                        /* Zero Properties Empty State */
                        <div className="py-16 px-6 flex flex-col items-center justify-center bg-card border border-dashed border-border rounded-[2.5rem] text-center space-y-4 shadow-sm">
                            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center text-3xl shadow-inner">
                                📍
                            </div>
                            <div className="space-y-1 max-w-md">
                                <h3 className="text-lg font-black text-foreground">
                                    {filters.city ? `No properties available in ${formattedCity}` : 'No properties found'}
                                </h3>
                                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                    {filters.city
                                        ? `There are currently no verified rental properties available in this city. Try exploring other locations or clearing the filter.`
                                        : `Try adjusting your search terms or filters to discover available homes.`
                                    }
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                {filters.city && (
                                    <button
                                        type="button"
                                        onClick={handleCityClear}
                                        className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                                    >
                                        Clear City Filter
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleResetAllFilters}
                                    className="px-5 py-2.5 rounded-2xl bg-muted border border-border hover:bg-muted/80 text-foreground font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                                >
                                    Browse All Listings →
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {properties.map((p, i) => (
                                <GridCard
                                    key={p._id || p.id}
                                    p={p}
                                    index={i}
                                    isSaved={savedIds.has(String(p._id || p.id))}
                                    inCompare={compareList.some(c => String(c._id || c.id) === String(p._id || p.id))}
                                    onSave={() => handleSave(p._id || p.id)}
                                    onCompare={() => toggleCompare(p)}
                                    onClick={() => handleViewPropertyNavigation({ navigate, property: p, role: user?.role })}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══ MAP VIEW ══ */}
            {viewMode === 'map' && (
                <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-220px)] min-h-[520px]">
                    {/* Leaflet Map Stage */}
                    <div className="flex-1 lg:flex-[2.5] rounded-[2.5rem] overflow-hidden border border-border shadow-inner bg-muted transition-colors relative">
                        <MapErrorBoundary>
                            <Suspense fallback={
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                    <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                                    <p className="text-emerald-500 font-black text-xs uppercase tracking-widest">Loading interactive map…</p>
                                </div>
                            }>
                                <InteractivePropertyMap
                                    height="100%"
                                    properties={properties}
                                    loading={loading}
                                    country={filters.country}
                                    onBoundsChange={handleMapBoundsChange}
                                />
                            </Suspense>
                        </MapErrorBoundary>
                    </div>

                    {/* Results Sidebar */}
                    <div className="lg:w-[360px] flex flex-col gap-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                        <div className="sticky top-0 bg-background/90 backdrop-blur-md py-2 z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground px-1">
                                {loading
                                    ? '⏳ Searching…'
                                    : `${properties.length} results${filters.city ? ` in ${formattedCity}` : ' in view'}`
                                }
                            </p>
                        </div>

                        {loading ? (
                            Array(4).fill(0).map((_, i) => <SkeletonCard key={i} compact />)
                        ) : properties.length === 0 ? (
                            <div className="p-8 flex flex-col items-center justify-center text-center bg-card/60 border border-dashed border-border rounded-[2rem] mt-2 space-y-3">
                                <div className="text-3xl opacity-30">🗺️</div>
                                <p className="font-black text-foreground text-xs">
                                    {filters.city ? `No map listings in ${formattedCity}` : 'Pan to search area'}
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                    {filters.city ? 'Try zooming out or clearing the city filter' : 'Zoom in or move map to discover listings'}
                                </p>
                                {filters.city && (
                                    <button
                                        type="button"
                                        onClick={handleCityClear}
                                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer shadow-sm"
                                    >
                                        Clear City Filter
                                    </button>
                                )}
                            </div>
                        ) : (
                            properties.map(p => (
                                <CompactCard
                                    key={p._id || p.id}
                                    p={p}
                                    isSaved={savedIds.has(String(p._id || p.id))}
                                    inCompare={compareList.some(c => String(c._id || c.id) === String(p._id || p.id))}
                                    onSave={() => handleSave(p._id || p.id)}
                                    onCompare={() => toggleCompare(p)}
                                    onClick={() => handleViewPropertyNavigation({ navigate, property: p, role: user?.role })}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ══ FLOATING COMPARE TRAY ══ */}
            <AnimatePresence>
                {compareList.length > 0 && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-6 py-3.5 rounded-[1.75rem] bg-slate-950/95 text-white shadow-2xl shadow-emerald-950/60 border border-emerald-500/40 backdrop-blur-md"
                    >
                        <Scale className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span className="text-white font-black text-xs whitespace-nowrap">
                            {compareList.length} propert{compareList.length > 1 ? 'ies' : 'y'} selected
                        </span>
                        <button
                            type="button"
                            onClick={() => navigate('/compare', { state: { compareList } })}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                        >
                            Compare Now →
                        </button>
                        <button
                            type="button"
                            onClick={() => setCompareList([])}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export { GridCard, SkeletonCard, CompactCard };
export default TenantBrowseProperties;

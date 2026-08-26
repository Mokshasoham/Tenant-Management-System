import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService } from '../../services/api';
import {
    Search, MapPin, Bed, Bath, Square, Building2,
    Star, ArrowRight, SlidersHorizontal, X,
    Zap, LayoutGrid, Map, Heart, Scale, ChevronDown,
    CheckCircle2, RefreshCw, AlertTriangle, RotateCcw
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../../utils/cn';
import useAuthStore from '../../context/authStore';
import { useTheme } from '../../context/ThemeContext';
import { getDisplayStatus, resolveMediaUrl, DEFAULT_PLACEHOLDER_SVG } from '../../utils/propertyHelper';
import handleViewPropertyNavigation from '../../utils/propertyNavigationHelper';

import InteractivePropertyMap from '../PropertyMap';
import TenantCompactCard from './TenantCompactCard';
import { GridCard, SkeletonCard } from './PropertyCard';

// ── Error boundary – catches any map rendering crash ──
class MapErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    render() {
        if (this.state.hasError) {
            return (
                <div className="h-full min-h-[480px] flex flex-col items-center justify-center gap-4 bg-destructive/5 border border-dashed border-destructive/30 rounded-[2.5rem] p-6 text-center">
                    <AlertTriangle className="w-10 h-10 text-destructive" />
                    <p className="text-destructive font-black text-sm uppercase tracking-widest">Map failed to load</p>
                    <p className="text-muted-foreground text-xs">{this.state.error?.message}</p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-black text-xs shadow-xl transition-all cursor-pointer"
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
    { value: 'newest', label: 'Newest First' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' },
];

/**
 * Property type matching helper with accurate database normalization
 */
function matchesPropertyType(propType, filterType) {
    if (!filterType) return true;
    const p = (propType || '').toLowerCase().trim();
    const f = filterType.toLowerCase().trim();

    if (f === 'apartment' || f === 'apt') {
        return p === 'apartment' || p === 'flat' || p === 'studio' || p.includes('bhk');
    }
    if (f === 'house') {
        return p === 'house' || p === 'villa' || p === 'independent_house';
    }
    if (f === 'commercial') {
        return p === 'commercial' || p === 'shop' || p === 'retail' || p === 'office' || p === 'store';
    }
    if (f === 'land') {
        return p === 'land' || p === 'plot';
    }
    return p === f;
}

/**
 * Location matching helper (State & City)
 */
function matchesLocation(property, stateFilter, cityFilter) {
    if (stateFilter) {
        const propState = (property.state || '').toLowerCase().trim();
        const sf = stateFilter.toLowerCase().trim();
        if (propState !== sf) {
            // Also allow matching if city matches the state query in legacy single-string data
            const propCity = (property.city || '').toLowerCase().trim();
            if (propCity !== sf) return false;
        }
    }
    if (cityFilter) {
        const propCity = (property.city || '').toLowerCase().trim();
        const cf = cityFilter.toLowerCase().trim();
        if (propCity !== cf) return false;
    }
    return true;
}

/**
 * Free-text search matching helper
 */
function matchesSearch(property, query) {
    if (!query || !query.trim()) return true;
    const q = query.toLowerCase().trim();
    const name = (property.name || '').toLowerCase();
    const city = (property.city || '').toLowerCase();
    const state = (property.state || '').toLowerCase();
    const address = (property.address || '').toLowerCase();
    const type = (property.type || '').toLowerCase();

    return (
        name.includes(q) ||
        city.includes(q) ||
        state.includes(q) ||
        address.includes(q) ||
        type.includes(q)
    );
}

// ══════════════════════════════════════════
//  TENANT BROWSE PROPERTIES COMPONENT
// ══════════════════════════════════════════
export function TenantBrowseProperties() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const user = useAuthStore((state) => state.user);

    // Initial state from URL parameters
    const initialType = searchParams.get('type') || '';
    const initialState = searchParams.get('state') || '';
    const initialCity = searchParams.get('city') || '';
    const initialSearch = searchParams.get('search') || '';

    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
    const [search, setSearch] = useState(initialSearch);
    const [typeFilter, setTypeFilter] = useState(initialType);
    const [stateFilter, setStateFilter] = useState(initialState);
    const [cityFilter, setCityFilter] = useState(initialCity);
    const [selectedPropertyId, setSelectedPropertyId] = useState(null);

    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState('newest');
    const [drawerFilters, setDrawerFilters] = useState({
        minPrice: '',
        maxPrice: '',
        bedrooms: '',
        furnishing: '',
        country: '',
    });

    const [savedIds, setSavedIds] = useState(new Set());
    const [compareList, setCompareList] = useState([]);

    // ── Synchronize URL Search Parameters ──
    const syncUrlParams = (newType, newState, newCity, newSearch) => {
        const params = new URLSearchParams();
        if (newType) params.set('type', newType);
        if (newState) params.set('state', newState);
        if (newCity) params.set('city', newCity);
        if (newSearch) params.set('search', newSearch);
        setSearchParams(params, { replace: true });
    };

    // ── Fetch Properties (Global tenant dataset for discovery) ──
    const fetchProperties = async () => {
        setLoading(true);
        try {
            const res = await propertyService.getAllProperties({
                limit: 150,
                sortBy: 'createdAt',
                sortOrder: 'desc',
            });
            const list = res?.data?.data || res?.data || [];
            setProperties(Array.isArray(list) ? list : []);

            // Initialize saved IDs for authenticated tenant
            const activeUser = useAuthStore.getState().user;
            if (activeUser && Array.isArray(list)) {
                const saved = new Set();
                list.forEach((p) => {
                    if (p.savedBy?.includes(activeUser._id || activeUser.id)) {
                        saved.add(p._id || p.id);
                    }
                });
                setSavedIds(saved);
            }
        } catch (err) {
            console.error('Tenant Browse fetch error:', err);
            setProperties([]);
        } finally {
            setLoading(false);
        }
    };

    // Initial load on mount
    useEffect(() => {
        fetchProperties();
    }, []);

    // ── Dynamically Extract Location Index Across All Tenant-Visible Properties ──
    const availableLocations = useMemo(() => {
        const stateMap = {}; // { 'Karnataka': { count: 0, cities: { 'Bengaluru': 1 } } }
        const allStates = new Set();
        const allCities = new Set();

        properties.forEach((p) => {
            const state = p.state?.trim();
            const city = p.city?.trim();

            if (state) {
                allStates.add(state);
                if (!stateMap[state]) {
                    stateMap[state] = { count: 0, cityCounts: {} };
                }
                stateMap[state].count += 1;

                if (city) {
                    allCities.add(city);
                    stateMap[state].cityCounts[city] = (stateMap[state].cityCounts[city] || 0) + 1;
                }
            } else if (city) {
                allCities.add(city);
            }
        });

        const hierarchy = Object.keys(stateMap)
            .sort()
            .map((st) => ({
                state: st,
                count: stateMap[st].count,
                cities: Object.keys(stateMap[st].cityCounts)
                    .sort()
                    .map((c) => ({
                        city: c,
                        count: stateMap[st].cityCounts[c],
                    })),
            }));

        return {
            states: Array.from(allStates).sort(),
            cities: Array.from(allCities).sort(),
            hierarchy,
        };
    }, [properties]);

    // ── Central Filter Pipeline (Single Source of Truth) ──
    const filteredProperties = useMemo(() => {
        return properties
            .filter((p) => {
                // 1. Search Query Filter
                if (!matchesSearch(p, search)) return false;

                // 2. Property Type Filter
                if (!matchesPropertyType(p.type, typeFilter)) return false;

                // 3. Location Filter (State & City)
                if (!matchesLocation(p, stateFilter, cityFilter)) return false;

                // 4. Drawer Filters
                if (drawerFilters.minPrice && (p.rentAmount || 0) < Number(drawerFilters.minPrice)) {
                    return false;
                }
                if (drawerFilters.maxPrice && (p.rentAmount || 0) > Number(drawerFilters.maxPrice)) {
                    return false;
                }
                if (drawerFilters.bedrooms && (p.bedrooms || 0) < Number(drawerFilters.bedrooms)) {
                    return false;
                }
                if (drawerFilters.furnishing && (p.furnishing || '').toLowerCase() !== drawerFilters.furnishing.toLowerCase()) {
                    return false;
                }
                if (drawerFilters.country && (p.country || 'India').toLowerCase() !== drawerFilters.country.toLowerCase()) {
                    return false;
                }

                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'price_asc') return (a.rentAmount || 0) - (b.rentAmount || 0);
                if (sortBy === 'price_desc') return (b.rentAmount || 0) - (a.rentAmount || 0);
                if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
                // default 'newest'
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            });
    }, [properties, search, typeFilter, stateFilter, cityFilter, drawerFilters, sortBy]);

    // ── Filter Handlers ──
    const handleTypeFilterChange = (newType) => {
        setTypeFilter(newType);
        syncUrlParams(newType, stateFilter, cityFilter, search);
    };

    const handleLocationChange = ({ state: newState, city: newCity }) => {
        setStateFilter(newState || '');
        setCityFilter(newCity || '');
        syncUrlParams(typeFilter, newState || '', newCity || '', search);
    };

    const handleSearchChange = (val) => {
        setSearch(val);
        syncUrlParams(typeFilter, stateFilter, cityFilter, val);
    };

    const handleClearAllFilters = () => {
        setTypeFilter('');
        setStateFilter('');
        setCityFilter('');
        setSearch('');
        setDrawerFilters({
            minPrice: '',
            maxPrice: '',
            bedrooms: '',
            furnishing: '',
            country: '',
        });
        syncUrlParams('', '', '', '');
    };

    const handleSave = (propId) => {
        setSavedIds((prev) => {
            const next = new Set(prev);
            if (next.has(propId)) {
                next.delete(propId);
            } else {
                next.add(propId);
            }
            return next;
        });
        propertyService.saveProperty(propId).catch(() => {});
    };

    const toggleCompare = (prop) => {
        setCompareList((prev) => {
            const pId = prop._id || prop.id;
            if (prev.some((p) => (p._id || p.id) === pId)) {
                return prev.filter((p) => (p._id || p.id) !== pId);
            }
            if (prev.length >= 3) return prev;
            return [...prev, prop];
        });
    };

    // ── Marker & Card 2-Way Selection ──
    const handleMarkerSelect = (propId) => {
        setSelectedPropertyId(propId);
        // Smoothly scroll the selected card into view in the results panel
        const cardElement = document.getElementById(`card-${propId}`);
        if (cardElement) {
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    const handleCardClick = (property) => {
        const propId = property._id || property.id;
        setSelectedPropertyId(propId);
    };

    const activeDrawerCount = Object.values(drawerFilters).filter(Boolean).length;
    const inputClass =
        "bg-muted border border-border rounded-xl px-3.5 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full transition-all placeholder:text-muted-foreground/30";

    return (
        <>
            <style>{`@keyframes shimmerAnim { 0%{background-position:-1000px 0} 100%{background-position:1000px 0} }`}</style>

            <div className="flex flex-col gap-4">
                {/* ══ TOP CONTROL BAR ══ */}
                <div className="p-4 rounded-[1.75rem] bg-card border border-border shadow-sm flex flex-wrap items-center gap-4 transition-colors">
                    {/* Title & Dynamic Count */}
                    <div className="flex-[2] min-w-[200px]">
                        <h1 className="text-2xl font-black text-foreground mb-0.5 flex items-center gap-2">
                            🏠 Find a Home
                        </h1>
                        <p className="text-xs text-muted-foreground/70 font-bold">
                            {loading
                                ? 'Searching…'
                                : `${filteredProperties.length} ${
                                      filteredProperties.length === 1 ? 'property' : 'properties'
                                  } available`}
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative flex-[1.5] min-w-[200px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                        <input
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search name, city, locality…"
                            className={cn(inputClass, "pl-11")}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => handleSearchChange('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className={cn(inputClass, "pr-10 appearance-none cursor-pointer w-auto font-bold")}
                        >
                            {SORT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value} className="bg-card">
                                    {o.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                    </div>

                    {/* Filters Drawer Toggle */}
                    <button
                        type="button"
                        onClick={() => setShowFilters((v) => !v)}
                        className={cn(
                            inputClass,
                            "w-auto px-4 flex items-center gap-2 font-bold cursor-pointer",
                            showFilters || activeDrawerCount > 0
                                ? "border-primary text-primary bg-primary/5"
                                : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span>Filters</span>
                        {activeDrawerCount > 0 && (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black">
                                {activeDrawerCount}
                            </span>
                        )}
                    </button>

                    {/* Grid / Map View Mode Toggle */}
                    <div className="flex bg-muted p-1.5 rounded-2xl border border-border shadow-inner">
                        {[
                            { mode: 'grid', icon: LayoutGrid, label: 'Grid' },
                            { mode: 'map', icon: Map, label: 'Map' },
                        ].map(({ mode, icon: Icon, label }) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setViewMode(mode)}
                                className={cn(
                                    "px-4 py-1.5 rounded-xl border-none cursor-pointer flex items-center gap-2 text-xs font-black transition-all",
                                    viewMode === mode
                                        ? "bg-card text-foreground shadow-md"
                                        : "text-muted-foreground/60 hover:text-muted-foreground"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ══ EXPANDABLE FILTER DRAWER ══ */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-5 rounded-[1.75rem] bg-card border border-border grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 transition-colors shadow-sm">
                                <div>
                                    <label className="block text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-1.5 ml-1">
                                        Country
                                    </label>
                                    <input
                                        type="text"
                                        value={drawerFilters.country}
                                        placeholder="India"
                                        onChange={(e) =>
                                            setDrawerFilters((prev) => ({ ...prev, country: e.target.value }))
                                        }
                                        className={cn(inputClass, "h-10 text-xs px-3")}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-1.5 ml-1">
                                        Min Price (₹)
                                    </label>
                                    <input
                                        type="number"
                                        value={drawerFilters.minPrice}
                                        placeholder="0"
                                        onChange={(e) =>
                                            setDrawerFilters((prev) => ({ ...prev, minPrice: e.target.value }))
                                        }
                                        className={cn(inputClass, "h-10 text-xs px-3")}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-1.5 ml-1">
                                        Max Price (₹)
                                    </label>
                                    <input
                                        type="number"
                                        value={drawerFilters.maxPrice}
                                        placeholder="50000"
                                        onChange={(e) =>
                                            setDrawerFilters((prev) => ({ ...prev, maxPrice: e.target.value }))
                                        }
                                        className={cn(inputClass, "h-10 text-xs px-3")}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-1.5 ml-1">
                                        Bedrooms
                                    </label>
                                    <input
                                        type="number"
                                        value={drawerFilters.bedrooms}
                                        placeholder="1, 2, 3..."
                                        onChange={(e) =>
                                            setDrawerFilters((prev) => ({ ...prev, bedrooms: e.target.value }))
                                        }
                                        className={cn(inputClass, "h-10 text-xs px-3")}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-1.5 ml-1">
                                        Furnishing
                                    </label>
                                    <select
                                        value={drawerFilters.furnishing}
                                        onChange={(e) =>
                                            setDrawerFilters((prev) => ({ ...prev, furnishing: e.target.value }))
                                        }
                                        className={cn(inputClass, "h-10 text-xs px-3 appearance-none cursor-pointer")}
                                    >
                                        <option value="" className="bg-card">Any</option>
                                        <option value="furnished" className="bg-card">Furnished</option>
                                        <option value="semi-furnished" className="bg-card">Semi-Furnished</option>
                                        <option value="unfurnished" className="bg-card">Unfurnished</option>
                                    </select>
                                </div>

                                <div className="flex items-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDrawerFilters({
                                                minPrice: '',
                                                maxPrice: '',
                                                bedrooms: '',
                                                furnishing: '',
                                                country: '',
                                            })
                                        }
                                        className="h-10 px-4 w-full rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                                    >
                                        Reset Drawer
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ══ GRID VIEW ══ */}
                {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {loading ? (
                            Array(6)
                                .fill(0)
                                .map((_, i) => <SkeletonCard key={i} />)
                        ) : filteredProperties.length === 0 ? (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center bg-card border border-dashed border-border rounded-[2.5rem] text-center p-6 space-y-4">
                                <div className="text-6xl mb-2 grayscale opacity-40">🏠</div>
                                <h3 className="text-xl font-black text-foreground">No properties found</h3>
                                <p className="text-muted-foreground text-xs max-w-sm">
                                    {typeFilter === 'land'
                                        ? 'There are currently no available land listings matching your selected criteria.'
                                        : 'Try adjusting your property type, location, or search filters.'}
                                </p>
                                <button
                                    type="button"
                                    onClick={handleClearAllFilters}
                                    className="px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-md cursor-pointer flex items-center gap-2"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Clear Filters</span>
                                </button>
                            </div>
                        ) : (
                            filteredProperties.map((p, i) => (
                                <GridCard
                                    key={p._id || p.id}
                                    p={p}
                                    index={i}
                                    isSaved={savedIds.has(p._id || p.id)}
                                    inCompare={compareList.some((c) => (c._id || c.id) === (p._id || p.id))}
                                    onSave={() => handleSave(p._id || p.id)}
                                    onCompare={() => toggleCompare(p)}
                                    onClick={() =>
                                        handleViewPropertyNavigation({
                                            navigate,
                                            property: p,
                                            role: user?.role,
                                        })
                                    }
                                />
                            ))
                        )}
                    </div>
                )}

                {/* ══ MAP VIEW ══ */}
                {viewMode === 'map' && (
                    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-220px)] min-h-[520px]">
                        {/* Left: Leaflet Map Container */}
                        <div className="flex-1 lg:flex-[2.5] rounded-[2.5rem] overflow-hidden border border-border shadow-inner bg-muted transition-colors relative">
                            <MapErrorBoundary>
                                <Suspense
                                    fallback={
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                            <p className="text-primary font-black text-xs uppercase tracking-widest">
                                                Loading GIS Map Engine…
                                            </p>
                                        </div>
                                    }
                                >
                                    <InteractivePropertyMap
                                        height="100%"
                                        properties={filteredProperties}
                                        loading={loading}
                                        typeFilter={typeFilter}
                                        onTypeFilterChange={handleTypeFilterChange}
                                        stateFilter={stateFilter}
                                        cityFilter={cityFilter}
                                        onLocationChange={handleLocationChange}
                                        availableLocations={availableLocations}
                                        selectedPropertyId={selectedPropertyId}
                                        onSelectProperty={handleMarkerSelect}
                                        onClearFilters={handleClearAllFilters}
                                    />
                                </Suspense>
                            </MapErrorBoundary>
                        </div>

                        {/* Right: Results Side-Panel (Synchronized Source of Truth) */}
                        <div className="lg:w-[360px] flex flex-col gap-3 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                            <div className="sticky top-0 bg-background/80 backdrop-blur-md py-2 z-10 flex items-center justify-between px-2 border-b border-border/40">
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                                    {loading
                                        ? '⏳ Searching…'
                                        : `${filteredProperties.length} ${
                                              filteredProperties.length === 1 ? 'result' : 'results'
                                          } in area`}
                                </p>
                                {(typeFilter || stateFilter || cityFilter || search) && (
                                    <button
                                        type="button"
                                        onClick={handleClearAllFilters}
                                        className="text-[10px] font-black uppercase text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Reset</span>
                                    </button>
                                )}
                            </div>

                            {loading ? (
                                Array(5)
                                    .fill(0)
                                    .map((_, i) => <SkeletonCard key={i} compact />)
                            ) : filteredProperties.length === 0 ? (
                                <div className="p-8 flex flex-col items-center justify-center text-center bg-card/60 border border-dashed border-border rounded-[2rem] mt-2 space-y-3">
                                    <div className="text-4xl opacity-30">
                                        {typeFilter === 'land' ? '🌿' : '🗺️'}
                                    </div>
                                    <p className="font-black text-foreground text-sm">
                                        {typeFilter === 'land' ? 'No land properties found' : 'No properties found'}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground/70 leading-relaxed max-w-[240px]">
                                        {typeFilter === 'land'
                                            ? 'There are currently no available land listings matching your selected filters.'
                                            : 'Try changing the property type, state, city, or search criteria.'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleClearAllFilters}
                                        className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer shadow-md"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            ) : (
                                filteredProperties.map((p) => (
                                    <TenantCompactCard
                                        key={p._id || p.id}
                                        p={p}
                                        isSelected={selectedPropertyId === (p._id || p.id)}
                                        isSaved={savedIds.has(p._id || p.id)}
                                        inCompare={compareList.some((c) => (c._id || c.id) === (p._id || p.id))}
                                        onSave={() => handleSave(p._id || p.id)}
                                        onCompare={() => toggleCompare(p)}
                                        onClick={() => {
                                            handleCardClick(p);
                                            handleViewPropertyNavigation({
                                                navigate,
                                                property: p,
                                                role: user?.role,
                                            });
                                        }}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ══ COMPARE FLOATING TRAY ══ */}
                <AnimatePresence>
                    {compareList.length > 0 && (
                        <motion.div
                            initial={{ y: 80, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 80, opacity: 0 }}
                            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-6 py-3.5 rounded-[1.75rem] bg-primary shadow-2xl shadow-primary/40 border border-white/20"
                        >
                            <Scale className="w-5 h-5 text-white flex-shrink-0" />
                            <span className="text-white font-black text-sm whitespace-nowrap">
                                {compareList.length} propert{compareList.length > 1 ? 'ies' : 'y'} selected
                            </span>
                            <button
                                type="button"
                                onClick={() => navigate('/compare', { state: { compareList } })}
                                className="px-5 py-2 rounded-xl bg-white text-primary font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all shadow-md cursor-pointer"
                            >
                                Compare Now →
                            </button>
                            <button
                                type="button"
                                onClick={() => setCompareList([])}
                                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}

export { GridCard, SkeletonCard, TenantCompactCard as CompactCard, TenantCompactCard };
export default TenantBrowseProperties;

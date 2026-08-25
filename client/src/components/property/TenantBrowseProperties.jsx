import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService } from '../../services/api';
import {
    Search, MapPin, Bed, Bath, Square, Building2,
    Star, ArrowRight, SlidersHorizontal, X,
    Zap, LayoutGrid, Map, Heart, Scale, ChevronDown,
    CheckCircle2, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import useAuthStore from '../../context/authStore';
import { useTheme } from '../../context/ThemeContext';
import { getDisplayStatus, resolveMediaUrl, DEFAULT_PLACEHOLDER_SVG } from '../../utils/propertyHelper';
import handleViewPropertyNavigation from '../../utils/propertyNavigationHelper';

import InteractivePropertyMap from '../PropertyMap';

// ── Error boundary – catches any map rendering crash ──
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
                        className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-black text-xs shadow-xl transition-all"
                    >
                        Reload Map View
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

import { PropertyCard, GridCard, SkeletonCard, CompactCard } from './PropertyCard';

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' },
];

// ══════════════════════════════════════════
//  ORIGINAL TENANT BROWSE PROPERTIES COMPONENT
// ══════════════════════════════════════════
export function TenantBrowseProperties() {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
    const [search, setSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState('createdAt');
    const [filters, setFilters] = useState({ city: '', type: '', minPrice: '', maxPrice: '', bedrooms: '', furnishing: '', country: '' });
    const [savedIds, setSavedIds] = useState(new Set());
    const [compareList, setCompareList] = useState([]);
    const [mapBounds, setMapBounds] = useState(null);
    const debounce = useRef(null);

    // ── Fetch properties ──
    const fetchProperties = async (overrides = {}) => {
        setLoading(true);
        try {
            const params = {
                limit: 80,
                sortBy,
                ...filters,
                search,
                ...overrides,
            };
            // Remove empty strings
            Object.keys(params).forEach(k => { if (params[k] === '') delete params[k]; });
            const res = await propertyService.getAllProperties(params);
            const list = res?.data?.data || res?.data || [];
            setProperties(Array.isArray(list) ? list : []);

            // Initialize saved IDs from the fetched list
            const activeUser = useAuthStore.getState().user;
            if (activeUser) {
                const saved = new Set();
                list.forEach(p => {
                    if (p.savedBy?.includes(activeUser._id || activeUser.id)) saved.add(p._id || p.id);
                });
                setSavedIds(saved);
            }
        } catch (err) {
            console.error('Browse fetch error:', err);
            setProperties([]);
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => { fetchProperties(); }, []); // eslint-disable-line

    const handleSearchChange = (val) => {
        setSearch(val);
        clearTimeout(debounce.current);
        debounce.current = setTimeout(() => fetchProperties({ search: val }), 600);
    };

    const handleSave = (propId) => {
        setSavedIds(prev => {
            const next = new Set(prev);
            next.has(propId) ? next.delete(propId) : next.add(propId);
            return next;
        });
        propertyService.saveProperty(propId).catch(() => { });
    };

    const toggleCompare = (prop) => {
        setCompareList(prev => {
            const pId = prop._id || prop.id;
            if (prev.some(p => (p._id || p.id) === pId)) return prev.filter(p => (p._id || p.id) !== pId);
            if (prev.length >= 3) return prev;
            return [...prev, prop];
        });
    };

    const handleMapBoundsChange = (bounds) => {
        setMapBounds(bounds);
        fetchProperties({ ...bounds });
    };

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    const inputClass = "bg-muted border border-border rounded-xl px-3.5 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full transition-all placeholder:text-muted-foreground/30";

    return (
        <>
            {/* Shimmer keyframe */}
            <style>{`@keyframes shimmerAnim { 0%{background-position:-1000px 0} 100%{background-position:1000px 0} }`}</style>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* ══ TOP BAR ══ */}
                <div className="p-4 rounded-[1.75rem] bg-card border border-border shadow-sm flex flex-wrap items-center gap-4 transition-colors">
                    {/* Title */}
                    <div className="flex-[2] min-w-[200px]">
                        <h1 className="text-2xl font-black text-foreground mb-0.5 flex items-center gap-2">🏠 Find a Home</h1>
                        <p className="text-xs text-muted-foreground/60 font-medium">
                            {loading ? 'Searching…' : `${properties.length} properties available`}
                        </p>
                    </div>

                    {/* Search */}
                    <div className="relative flex-[1.5] min-w-[200px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                        <input
                            value={search}
                            onChange={e => handleSearchChange(e.target.value)}
                            placeholder="Search name, city, locality…"
                            className={cn(inputClass, "pl-11")}
                        />
                    </div>

                    {/* Sort */}
                    <div className="relative">
                        <select value={sortBy} onChange={e => { setSortBy(e.target.value); fetchProperties({ sortBy: e.target.value }); }}
                            className={cn(inputClass, "pr-10 appearance-none cursor-pointer w-auto font-bold")}>
                            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-card">{o.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                    </div>

                    {/* Filter toggle */}
                    <button onClick={() => setShowFilters(v => !v)}
                        className={cn(
                            inputClass, "w-auto px-4 flex items-center gap-2 font-bold cursor-pointer",
                            showFilters ? "border-primary text-primary bg-primary/5" : "text-muted-foreground hover:bg-muted"
                        )}>
                        <SlidersHorizontal className="w-4 h-4" />
                        Filters
                        {activeFilterCount > 0 && <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black">{activeFilterCount}</span>}
                    </button>

                    {/* Map/Grid toggle */}
                    <div className="flex bg-muted p-1.5 rounded-2xl border border-border shadow-inner">
                        {[{ mode: 'grid', icon: LayoutGrid, label: 'Grid' }, { mode: 'map', icon: Map, label: 'Map' }].map(({ mode, icon: Icon, label }) => (
                            <button key={mode} onClick={() => setViewMode(mode)}
                                className={cn(
                                    "px-4 py-1.5 rounded-xl border-none cursor-pointer flex items-center gap-2 text-xs font-black transition-all",
                                    viewMode === mode ? "bg-card text-foreground shadow-md" : "text-muted-foreground/60 hover:text-muted-foreground"
                                )}>
                                <Icon className="w-3.5 h-3.5" />{label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ══ FILTER PANEL ══ */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden">
                            <div className="p-5 rounded-[1.75rem] bg-card border border-border mt-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 transition-colors">
                                {[
                                    { key: 'country', label: 'Country', type: 'text', placeholder: 'India' },
                                    { key: 'city', label: 'City', type: 'text', placeholder: 'Bangalore' },
                                    { key: 'minPrice', label: 'Min Price (₹)', type: 'number', placeholder: '0' },
                                    { key: 'maxPrice', label: 'Max Price (₹)', type: 'number', placeholder: '50000' },
                                    { key: 'bedrooms', label: 'Bedrooms', type: 'number', placeholder: '2' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label className="block text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-1.5 ml-1">{f.label}</label>
                                        <input type={f.type} value={filters[f.key]} placeholder={f.placeholder}
                                            onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                                            className={cn(inputClass, "h-10 text-xs px-3")} />
                                    </div>
                                ))}
                                <div>
                                    <label className="block text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-1.5 ml-1">Type</label>
                                    <select value={filters.type} onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                                        className={cn(inputClass, "h-10 text-xs px-3 appearance-none cursor-pointer")}>
                                        <option value="" className="bg-card">All Types</option>
                                        {['apartment', 'house', 'commercial', 'land'].map(t => <option key={t} value={t} className="bg-card">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2 lg:col-span-1">
                                    <label className="block text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-1.5 ml-1">Furnished</label>
                                    <select value={filters.furnishing} onChange={e => setFilters(prev => ({ ...prev, furnishing: e.target.value }))}
                                        className={cn(inputClass, "h-10 text-xs px-3 appearance-none cursor-pointer")}>
                                        <option value="" className="bg-card">Any</option>
                                        {['furnished', 'semi-furnished', 'unfurnished'].map(t => <option key={t} value={t} className="bg-card">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2 lg:col-span-7 mt-2 flex items-center justify-end gap-3 pt-3 border-t border-border/50">
                                    <button onClick={() => { setFilters({ city: '', type: '', minPrice: '', maxPrice: '', bedrooms: '', furnishing: '', country: '' }); fetchProperties({}); }}
                                        className="h-10 px-6 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">
                                        Reset
                                    </button>
                                    <button onClick={() => fetchProperties()}
                                        className="h-10 px-8 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ══ GRID VIEW ══ */}
                {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {loading
                            ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
                            : properties.length === 0
                                ? (
                                    <div className="col-span-full py-20 flex flex-col items-center justify-center bg-card border border-dashed border-border rounded-[2.5rem]">
                                        <div className="text-6xl mb-4 grayscale opacity-40">🏠</div>
                                        <p className="text-xl font-black text-foreground">No properties found</p>
                                        <p className="text-muted-foreground mt-2 max-w-xs text-center">Try adjusting your filters or search terms to find what you're looking for.</p>
                                    </div>
                                )
                                : properties.map((p, i) => (
                                    <GridCard key={p._id || p.id} p={p} index={i}
                                        isSaved={savedIds.has(p._id || p.id)}
                                        inCompare={compareList.some(c => (c._id || c.id) === (p._id || p.id))}
                                        onSave={() => handleSave(p._id || p.id)}
                                        onCompare={() => toggleCompare(p)}
                                        onClick={() => handleViewPropertyNavigation({ navigate, property: p, role: user?.role })}
                                    />
                                ))
                        }
                    </div>
                )}

                {/* ══ MAP VIEW ══  */}
                {viewMode === 'map' && (
                    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-220px)] min-h-[520px]">
                        {/* Map panel */}
                        <div className="flex-1 lg:flex-[2.5] rounded-[2.5rem] overflow-hidden border border-border shadow-inner bg-muted transition-colors relative">
                            <MapErrorBoundary>
                                <Suspense fallback={
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                        <p className="text-primary font-black text-xs uppercase tracking-widest">Warping to location…</p>
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

                        {/* Results list */}
                        <div className="lg:w-[360px] flex flex-col gap-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                            <div className="sticky top-0 bg-transparent py-2 z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 px-2">
                                    {loading ? '⏳ Searching…' : `${properties.length} results in area`}
                                </p>
                            </div>
                            {loading
                                ? Array(5).fill(0).map((_, i) => <SkeletonCard key={i} compact />)
                                : properties.length === 0
                                    ? <div className="p-10 flex flex-col items-center justify-center text-center bg-card/50 border border-dashed border-border rounded-[2rem] mt-4">
                                        <div className="text-4xl mb-3 opacity-20">🗺️</div>
                                        <p className="font-black text-foreground text-sm">Pan to search area</p>
                                        <p className="text-[10px] text-muted-foreground/50 mt-2 uppercase tracking-widest leading-relaxed">Zoom in or move map <br /> to find listings</p>
                                    </div>
                                    : properties.map(p => (
                                        <CompactCard key={p._id || p.id} p={p}
                                            isSaved={savedIds.has(p._id || p.id)}
                                            inCompare={compareList.some(c => (c._id || c.id) === (p._id || p.id))}
                                            onSave={() => handleSave(p._id || p.id)}
                                            onCompare={() => toggleCompare(p)}
                                            onClick={() => handleViewPropertyNavigation({ navigate, property: p, role: user?.role })}
                                        />
                                    ))
                            }
                        </div>
                    </div>
                )}

                {/* ══ COMPARE TRAY ══ */}
                <AnimatePresence>
                    {compareList.length > 0 && (
                        <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
                            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-6 py-3.5 rounded-[1.75rem] bg-primary shadow-2xl shadow-primary/40 border border-white/20">
                            <Scale className="w-5 h-5 text-white flex-shrink-0" />
                            <span className="text-white font-black text-sm whitespace-nowrap">
                                {compareList.length} propert{compareList.length > 1 ? 'ies' : 'y'} selected
                            </span>
                            <button onClick={() => navigate('/compare', { state: { compareList } })}
                                className="px-5 py-2 rounded-xl bg-white text-primary font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all shadow-md">
                                Compare Now →
                            </button>
                            <button onClick={() => setCompareList([])}
                                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}

export { GridCard, SkeletonCard, CompactCard };
export default TenantBrowseProperties;

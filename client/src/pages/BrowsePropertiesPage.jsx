import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService } from '../services/api';
import {
    Search, MapPin, Bed, Bath, Square, Building2,
    Star, ArrowRight, SlidersHorizontal, X,
    Zap, LayoutGrid, Map, Heart, Scale, ChevronDown,
    CheckCircle2, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../context/authStore';

// ── Lazy-load the map so Leaflet errors never crash the whole page ──
const InteractivePropertyMap = lazy(() => import('../components/PropertyMap'));

// ── Error boundary – catches any map rendering crash ──
class MapErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    height: '100%', minHeight: 480, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 16,
                    background: 'rgba(239,68,68,0.05)', border: '1px dashed rgba(239,68,68,0.3)',
                    borderRadius: 20
                }}>
                    <AlertTriangle style={{ width: 40, height: 40, color: '#f87171' }} />
                    <p style={{ color: '#f87171', fontWeight: 700, fontSize: 15 }}>Map failed to load</p>
                    <p style={{ color: '#94a3b8', fontSize: 12 }}>{this.state.error?.message}</p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{ padding: '8px 20px', borderRadius: 12, background: '#6366f1', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                    >
                        Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const SORT_OPTIONS = [
    { value: 'createdAt', label: 'Newest First' },
    { value: 'price_asc', label: 'Price ↑' },
    { value: 'price_desc', label: 'Price ↓' },
    { value: 'rating', label: 'Top Rated' },
];

const TYPE_COLORS = {
    apartment: '#6366f1', house: '#10b981', commercial: '#f59e0b', land: '#8b5cf6',
};

// ── Skeleton Card ──
function SkeletonCard({ compact = false }) {
    const shimmerStyle = {
        background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
        backgroundSize: '1000px 100%',
        animation: 'shimmerAnim 1.5s infinite',
        borderRadius: 8,
    };
    if (compact) {
        return (
            <div style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 16, background: 'var(--bg-card, #1a1a2e)', border: '1px solid var(--border-color, rgba(255,255,255,0.06))' }}>
                <div style={{ ...shimmerStyle, width: 96, height: 80, borderRadius: 12, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                    <div style={{ ...shimmerStyle, height: 14, width: '70%' }} />
                    <div style={{ ...shimmerStyle, height: 12, width: '50%' }} />
                    <div style={{ ...shimmerStyle, height: 18, width: '40%' }} />
                </div>
            </div>
        );
    }
    return (
        <div style={{ borderRadius: 24, overflow: 'hidden', background: 'var(--bg-card, #1a1a2e)', border: '1px solid var(--border-color, rgba(255,255,255,0.06))' }}>
            <div style={{ ...shimmerStyle, height: 192 }} />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ ...shimmerStyle, height: 18, width: '70%' }} />
                <div style={{ ...shimmerStyle, height: 14, width: '50%' }} />
                <div style={{ ...shimmerStyle, height: 36, width: '100%', marginTop: 4 }} />
            </div>
        </div>
    );
}

// ── Compact card for the map side-panel ──
function CompactCard({ p, isSaved, inCompare, onSave, onCompare, onClick }) {
    const color = TYPE_COLORS[p.type] || '#6366f1';
    return (
        <motion.div whileHover={{ y: -1 }} onClick={onClick}
            style={{
                display: 'flex', gap: 12, padding: 12, borderRadius: 16, cursor: 'pointer',
                background: 'var(--bg-card, #1a1a2e)', border: '1px solid var(--border-color, rgba(255,255,255,0.06))'
            }}>
            <div style={{ width: 96, height: 80, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.04)', position: 'relative' }}>
                {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building2 style={{ width: 24, height: 24, opacity: 0.2, color: 'white' }} /></div>}
                <span style={{ position: 'absolute', top: 4, left: 4, background: color, color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 8, textTransform: 'uppercase' }}>{p.type}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary, white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{p.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted, rgba(255,255,255,0.4))', margin: '2px 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {p.city}</p>
                <p style={{ fontSize: 16, fontWeight: 800, color, margin: 0 }}>₹{p.rentAmount?.toLocaleString('en-IN')}<span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted, rgba(255,255,255,0.4))' }}>/mo</span></p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted, rgba(255,255,255,0.4))' }}>🛏 {p.bedrooms || 0}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted, rgba(255,255,255,0.4))' }}>🚿 {p.bathrooms || 0}</span>
                    <button onClick={e => { e.stopPropagation(); onSave(); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: isSaved ? '#ec4899' : 'rgba(255,255,255,0.3)', padding: 2 }}>
                        <Heart style={{ width: 14, height: 14, fill: isSaved ? '#ec4899' : 'none' }} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); onCompare(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: inCompare ? '#6366f1' : 'rgba(255,255,255,0.3)', padding: 2 }}>
                        <Scale style={{ width: 14, height: 14 }} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ── Full grid card ──
function GridCard({ p, index, isSaved, inCompare, onSave, onCompare, onClick }) {
    const color = TYPE_COLORS[p.type] || '#6366f1';
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.05, 0.5) }}
            onClick={onClick}
            style={{
                borderRadius: 28, overflow: 'hidden', cursor: 'pointer',
                background: 'var(--bg-card, #1a1a2e)', border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                boxShadow: '0 4px 24px rgba(0,0,0,0.2)', transition: 'transform 0.2s'
            }}
            whileHover={{ y: -4 }}
        >
            {/* Image */}
            <div style={{ position: 'relative', height: 200, overflow: 'hidden', background: 'rgba(255,255,255,0.03)' }}>
                {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${color}22, ${color}11)` }}>
                        <Building2 style={{ width: 48, height: 48, opacity: 0.2, color: 'white' }} />
                    </div>}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />

                {/* Top-left badges */}
                <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ background: color, color: 'white', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase' }}>{p.type}</span>
                    {p.rentAmount < 20000 && <span style={{ background: 'rgba(16,185,129,0.9)', color: 'white', fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>⚡ Best Value</span>}
                </div>

                {/* Top-right actions */}
                <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button onClick={e => { e.stopPropagation(); onSave(); }}
                        style={{
                            width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isSaved ? 'rgba(236,72,153,0.85)' : 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: 'white'
                        }}>
                        <Heart style={{ width: 14, height: 14, fill: isSaved ? 'white' : 'none' }} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); onCompare(); }}
                        style={{
                            width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: inCompare ? 'rgba(99,102,241,0.85)' : 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: 'white'
                        }}>
                        <Scale style={{ width: 14, height: 14 }} />
                    </button>
                </div>

                {/* Price */}
                <div style={{ position: 'absolute', bottom: 12, left: 16 }}>
                    <p style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0 }}>₹{p.rentAmount?.toLocaleString('en-IN')}</p>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>per month</p>
                </div>
                {p.rating > 0 && (
                    <div style={{ position: 'absolute', bottom: 12, right: 16, background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star style={{ width: 12, height: 12, fill: '#fbbf24', color: '#fbbf24' }} />
                        <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>{p.rating}</span>
                    </div>
                )}
            </div>

            {/* Body */}
            <div style={{ padding: 20 }}>
                <h3 style={{ fontWeight: 900, fontSize: 15, margin: '0 0 4px', color: 'var(--text-primary, white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary, rgba(255,255,255,0.6))', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin style={{ width: 13, height: 13, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.city}{p.address ? `, ${p.address}` : ''}</span>
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.06))', color: 'var(--text-secondary, rgba(255,255,255,0.5))' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Bed style={{ width: 15, height: 15, color }} />{p.bedrooms || 0} Bed</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Bath style={{ width: 15, height: 15, color: '#10b981' }} />{p.bathrooms || 0} Bath</span>
                    {p.squareFeet && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Square style={{ width: 15, height: 15, color: '#f59e0b' }} />{p.squareFeet} sqft</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 900 }}>
                            {p.manager?.firstName?.[0] || 'M'}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted, rgba(255,255,255,0.4))' }}>{p.manager?.firstName || 'Manager'}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 900, color, display: 'flex', alignItems: 'center', gap: 4 }}>
                        View <ArrowRight style={{ width: 14, height: 14 }} />
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

// ══════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════
export default function BrowsePropertiesPage() {
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
    const [search, setSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState('createdAt');
    const [filters, setFilters] = useState({ city: '', type: '', minPrice: '', maxPrice: '', bedrooms: '', furnishing: '' });
    const [savedIds, setSavedIds] = useState(new Set());
    const [compareList, setCompareList] = useState([]);
    const [mapBounds, setMapBounds] = useState(null);
    const debounce = useRef(null);

    // ── Fetch properties ──
    const fetchProperties = async (overrides = {}) => {
        setLoading(true);
        try {
            const params = {
                status: 'available',
                limit: 80,
                sortBy,
                ...filters,
                search,
            };
            // Remove empty strings
            Object.keys(params).forEach(k => { if (params[k] === '') delete params[k]; });
            const res = await propertyService.getAllProperties(params);
            const list = res?.data || [];
            setProperties(Array.isArray(list) ? list : []);

            // Initialize saved IDs from the fetched list
            const user = useAuthStore.getState().user;
            if (user) {
                const saved = new Set();
                list.forEach(p => {
                    if (p.savedBy?.includes(user._id)) saved.add(p._id);
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
            if (prev.some(p => p._id === prop._id)) return prev.filter(p => p._id !== prop._id);
            if (prev.length >= 3) return prev;
            return [...prev, prop];
        });
    };

    const handleMapBoundsChange = (bounds) => {
        setMapBounds(bounds);
        fetchProperties({ ...bounds });
    };

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    // ── Styles ──
    const cardStyle = {
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: 16,
    };
    const inputStyle = {
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14,
        padding: '10px 14px',
        color: 'white',
        fontSize: 13,
        outline: 'none',
        width: '100%',
    };

    return (
        <>
            {/* Shimmer keyframe */}
            <style>{`@keyframes shimmerAnim { 0%{background-position:-1000px 0} 100%{background-position:1000px 0} }`}</style>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* ══ TOP BAR ══ */}
                <div style={{ ...cardStyle, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                    {/* Title */}
                    <div style={{ flex: '1 1 200px' }}>
                        <h1 style={{ fontWeight: 900, fontSize: 22, margin: 0, color: 'white' }}>🏡 Find a Home</h1>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
                            {loading ? 'Searching…' : `${properties.length} properties`}
                        </p>
                    </div>

                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1 1 240px' }}>
                        <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.3)' }} />
                        <input
                            value={search}
                            onChange={e => handleSearchChange(e.target.value)}
                            placeholder="Search city, name…"
                            style={{ ...inputStyle, paddingLeft: 38 }}
                        />
                    </div>

                    {/* Sort */}
                    <div style={{ position: 'relative' }}>
                        <select value={sortBy} onChange={e => { setSortBy(e.target.value); fetchProperties({ sortBy: e.target.value }); }}
                            style={{ ...inputStyle, paddingRight: 32, appearance: 'none', cursor: 'pointer', width: 'auto' }}>
                            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: '#1e293b' }}>{o.label}</option>)}
                        </select>
                        <ChevronDown style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
                    </div>

                    {/* Filter toggle */}
                    <button onClick={() => setShowFilters(v => !v)} style={{
                        ...inputStyle, width: 'auto', padding: '10px 14px', cursor: 'pointer',
                        position: 'relative', display: 'flex', alignItems: 'center', gap: 6,
                        border: showFilters ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                        color: showFilters ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                    }}>
                        <SlidersHorizontal style={{ width: 15, height: 15 }} />
                        Filters
                        {activeFilterCount > 0 && <span style={{ background: '#6366f1', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilterCount}</span>}
                    </button>

                    {/* Map/Grid toggle */}
                    <div style={{ display: 'flex', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {[{ mode: 'grid', icon: LayoutGrid, label: 'Grid' }, { mode: 'map', icon: Map, label: 'Map' }].map(({ mode, icon: Icon, label }) => (
                            <button key={mode} onClick={() => setViewMode(mode)} style={{
                                padding: '9px 16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
                                background: viewMode === mode ? '#6366f1' : 'rgba(255,255,255,0.04)',
                                color: viewMode === mode ? 'white' : 'rgba(255,255,255,0.5)',
                                transition: 'all 0.2s',
                            }}>
                                <Icon style={{ width: 14, height: 14 }} />{label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ══ FILTER PANEL ══ */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden' }}>
                            <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                                {[
                                    { key: 'city', label: 'City', type: 'text', placeholder: 'Bangalore' },
                                    { key: 'minPrice', label: 'Min Price (₹)', type: 'number', placeholder: '0' },
                                    { key: 'maxPrice', label: 'Max Price (₹)', type: 'number', placeholder: '50000' },
                                    { key: 'bedrooms', label: 'Bedrooms', type: 'number', placeholder: '2' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{f.label}</label>
                                        <input type={f.type} value={filters[f.key]} placeholder={f.placeholder}
                                            onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                                            style={{ ...inputStyle, padding: '8px 12px', fontSize: 12 }} />
                                    </div>
                                ))}
                                <div>
                                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Property Type</label>
                                    <select value={filters.type} onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                                        style={{ ...inputStyle, padding: '8px 12px', fontSize: 12, appearance: 'none', cursor: 'pointer' }}>
                                        <option value="" style={{ background: '#1e293b' }}>All Types</option>
                                        {['apartment', 'house', 'commercial', 'land'].map(t => <option key={t} value={t} style={{ background: '#1e293b' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Furnished</label>
                                    <select value={filters.furnishing} onChange={e => setFilters(prev => ({ ...prev, furnishing: e.target.value }))}
                                        style={{ ...inputStyle, padding: '8px 12px', fontSize: 12, appearance: 'none', cursor: 'pointer' }}>
                                        <option value="" style={{ background: '#1e293b' }}>Any</option>
                                        {['furnished', 'semi-furnished', 'unfurnished'].map(t => <option key={t} value={t} style={{ background: '#1e293b' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                                    <button onClick={() => { setFilters({ city: '', type: '', minPrice: '', maxPrice: '', bedrooms: '', furnishing: '' }); fetchProperties({}); }}
                                        style={{ flex: 1, padding: '9px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                                        Reset
                                    </button>
                                    <button onClick={() => fetchProperties()}
                                        style={{ flex: 1, padding: '9px', borderRadius: 12, border: 'none', background: '#6366f1', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                                        Apply
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ══ GRID VIEW ══ */}
                {viewMode === 'grid' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                        {loading
                            ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
                            : properties.length === 0
                                ? (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.3)' }}>
                                        <div style={{ fontSize: 56, marginBottom: 16 }}>🏠</div>
                                        <p style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.6)', margin: 0 }}>No properties found</p>
                                        <p style={{ fontSize: 13, marginTop: 8 }}>Try adjusting your filters or switching to Map view</p>
                                    </div>
                                )
                                : properties.map((p, i) => (
                                    <GridCard key={p._id} p={p} index={i}
                                        isSaved={savedIds.has(p._id)}
                                        inCompare={compareList.some(c => c._id === p._id)}
                                        onSave={() => handleSave(p._id)}
                                        onCompare={() => toggleCompare(p)}
                                        onClick={() => navigate(`/properties/${p._id}`)}
                                    />
                                ))
                        }
                    </div>
                )}

                {/* ══ MAP VIEW ══  */}
                {viewMode === 'map' && (
                    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 220px)', minHeight: 520 }}>
                        {/* Map panel */}
                        <div style={{ flex: '1 1 60%', minWidth: 0, borderRadius: 20, overflow: 'hidden' }}>
                            <MapErrorBoundary>
                                <Suspense fallback={
                                    <div style={{ height: '100%', minHeight: 520, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'rgba(99,102,241,0.05)', borderRadius: 20, border: '1px solid rgba(99,102,241,0.15)' }}>
                                        <RefreshCw style={{ width: 32, height: 32, color: '#6366f1', animation: 'spin 1s linear infinite' }} />
                                        <p style={{ color: '#6366f1', fontWeight: 700, margin: 0 }}>Loading map…</p>
                                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                    </div>
                                }>
                                    <InteractivePropertyMap
                                        height="100%"
                                        properties={properties}
                                        loading={loading}
                                        onBoundsChange={handleMapBoundsChange}
                                    />
                                </Suspense>
                            </MapErrorBoundary>
                        </div>

                        {/* Results list */}
                        <div style={{ flex: '0 0 320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', margin: 0, padding: '2px 4px', flexShrink: 0 }}>
                                {loading ? '⏳ Searching…' : `${properties.length} results in area`}
                            </p>
                            {loading
                                ? Array(5).fill(0).map((_, i) => <SkeletonCard key={i} compact />)
                                : properties.length === 0
                                    ? <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                                        <div style={{ fontSize: 36, marginBottom: 12 }}>🗺️</div>
                                        <p style={{ fontWeight: 700, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Pan the map to search</p>
                                        <p style={{ fontSize: 12, marginTop: 6 }}>Click "Search this area" after moving the map</p>
                                    </div>
                                    : properties.map(p => (
                                        <CompactCard key={p._id} p={p}
                                            isSaved={savedIds.has(p._id)}
                                            inCompare={compareList.some(c => c._id === p._id)}
                                            onSave={() => handleSave(p._id)}
                                            onCompare={() => toggleCompare(p)}
                                            onClick={() => navigate(`/properties/${p._id}`)}
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
                            style={{
                                position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 999,
                                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderRadius: 20,
                                background: '#6366f1', boxShadow: '0 8px 32px rgba(99,102,241,0.5)'
                            }}>
                            <Scale style={{ width: 18, height: 18, color: 'white', flexShrink: 0 }} />
                            <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>
                                {compareList.length} propert{compareList.length > 1 ? 'ies' : 'y'} selected
                            </span>
                            <button onClick={() => navigate('/compare', { state: { compareList } })}
                                style={{ padding: '6px 16px', borderRadius: 12, background: 'white', color: '#6366f1', fontWeight: 900, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                                Compare →
                            </button>
                            <button onClick={() => setCompareList([])}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 4 }}>
                                <X style={{ width: 16, height: 16 }} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}

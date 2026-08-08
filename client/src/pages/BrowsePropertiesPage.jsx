import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService } from '../services/api';
import {
  Search, MapPin, Bed, Bath, Square, Building2,
  Star, ArrowRight, SlidersHorizontal, X,
  LayoutGrid, Map, Heart, Scale, ChevronDown,
  AlertTriangle, Bell, Filter, Eye, ChevronRight, RotateCcw,
  ShieldCheck, Check, Crosshair, Maximize2, Sparkles, CheckCircle2,
  Clock, Shield, User, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';
import useAuthStore from '../context/authStore';
import { useTheme } from '../context/ThemeContext';
import { getDisplayStatus } from '../utils/propertyHelper';
import handleViewPropertyNavigation from '../utils/propertyNavigationHelper';

// ── Lazy-load Leaflet Map ──
const InteractivePropertyMap = lazy(() => import('../components/PropertyMap'));

// ── Map Error Boundary ──
class MapErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full min-h-[500px] flex flex-col items-center justify-center gap-4 bg-slate-950/80 border border-dashed border-rose-500/30 rounded-3xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-rose-500" />
          <p className="text-rose-400 font-bold text-sm uppercase tracking-widest">GIS Map Engine Unavailable</p>
          <p className="text-slate-400 text-xs max-w-md">{this.state.error?.message || 'Leaflet map failed to initialize.'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg"
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
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'trust_score', label: 'Trust Score ↓' },
];

const TYPE_COLORS = {
  apartment: '#6366f1',
  house: '#10b981',
  commercial: '#f59e0b',
  land: '#8b5cf6',
};

const SYSTEM_ALERTS = [
  { id: 'al_1', title: '3 SLA Breached Verification Requests', count: 3, type: 'critical', filterKey: 'slaBreached' },
  { id: 'al_2', title: '2 Duplicate Property Coordinates Flagged', count: 2, type: 'high', filterKey: 'duplicates' },
  { id: 'al_3', title: '5 Documents Expiring in 14 Days', count: 5, type: 'medium', filterKey: 'expiringDocs' },
  { id: 'al_4', title: '1 Annual Fire NOC Inspection Missed', count: 1, type: 'critical', filterKey: 'missedInspection' },
  { id: 'al_5', title: '4 Requests Ready for Final Approval', count: 4, type: 'success', filterKey: 'readyApproval' },
];

// Enrich property object with fallback metrics if missing
function enrichProperty(p) {
  const trustScore = p.trustScore ?? Math.floor(Math.random() * 15) + 85;
  const healthScore = p.healthScore ?? Math.floor(Math.random() * 20) + 80;
  const complianceScore = p.complianceScore ?? Math.floor(Math.random() * 10) + 90;
  const vStatus = p.status || p.verificationStatus || (p.rentAmount < 25000 ? 'PENDING_VERIFICATION' : 'VERIFIED');
  const riskLevel = p.riskLevel || (trustScore < 85 ? 'HIGH' : trustScore < 90 ? 'MEDIUM' : 'LOW');

  return {
    ...p,
    trustScore,
    healthScore,
    complianceScore,
    verificationStatus: vStatus,
    riskLevel,
  };
}

// ── Skeleton Card ──
function SkeletonCard({ compact = false }) {
  if (compact) {
    return (
      <div className="flex gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse">
        <div className="w-24 h-20 rounded-xl bg-slate-800 flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3.5 w-3/4 bg-slate-800 rounded" />
          <div className="h-3 w-1/2 bg-slate-800 rounded" />
          <div className="h-4 w-1/3 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-3xl overflow-hidden bg-slate-900/60 border border-slate-800 animate-pulse space-y-3 p-4">
      <div className="h-48 bg-slate-800 rounded-2xl" />
      <div className="h-4 w-2/3 bg-slate-800 rounded" />
      <div className="h-3 w-1/2 bg-slate-800 rounded" />
      <div className="h-8 w-full bg-slate-800 rounded-xl mt-2" />
    </div>
  );
}

// ── Minimalist Property Grid Card ──
function GridCard({ p, index, isSaved, inCompare, onSave, onCompare, onClick }) {
  const color = TYPE_COLORS[p.type] || '#6366f1';
  const displayStatus = getDisplayStatus(p);

  const getStatusBadge = () => {
    if (p.verificationStatus === 'HIGH_RISK' || p.riskLevel === 'HIGH') {
      return { label: 'High Risk', class: 'bg-rose-500/90 border-rose-400/30 text-white' };
    }
    if (p.verificationStatus === 'PENDING_VERIFICATION') {
      return { label: 'Pending', class: 'bg-amber-500/90 border-amber-400/30 text-white' };
    }
    return { label: 'Verified', class: 'bg-emerald-500/90 border-emerald-400/30 text-white' };
  };

  const statusBadge = getStatusBadge();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      onClick={onClick}
      className="group rounded-3xl overflow-hidden cursor-pointer bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col"
    >
      {/* Image & Header Overlay */}
      <div className="relative h-48 overflow-hidden bg-slate-950">
        {p.images?.[0] ? (
          <img
            src={p.images[0]}
            alt={p.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
            <Building2 className="w-12 h-12 text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap z-10">
          <span
            className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full uppercase tracking-wider text-white shadow-md backdrop-blur-sm"
            style={{ background: color }}
          >
            {p.type}
          </span>
          <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border shadow-md backdrop-blur-sm uppercase tracking-wider ${statusBadge.class}`}>
            {statusBadge.label}
          </span>
        </div>

        {/* Top Right Save & Compare */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onSave(); }}
            className={`w-8 h-8 rounded-xl border-none cursor-pointer flex items-center justify-center backdrop-blur-md text-white transition-all shadow-md ${
              isSaved ? 'bg-rose-500/90 text-white' : 'bg-slate-950/60 hover:bg-slate-900 text-slate-300'
            }`}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onCompare(); }}
            className={`w-8 h-8 rounded-xl border-none cursor-pointer flex items-center justify-center backdrop-blur-md text-white transition-all shadow-md ${
              inCompare ? 'bg-indigo-600 text-white' : 'bg-slate-950/60 hover:bg-slate-900 text-slate-300'
            }`}
          >
            <Scale className="w-4 h-4" />
          </button>
        </div>

        {/* Price Tag */}
        <div className="absolute bottom-3 left-3 text-white">
          <p className="text-xl font-black mb-0">₹{p.rentAmount?.toLocaleString('en-IN')}</p>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">per month</p>
        </div>

        {p.rating > 0 && (
          <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-slate-950/70 backdrop-blur-md flex items-center gap-1 shadow-md border border-slate-800">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-white text-xs font-bold">{p.rating}</span>
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
            {p.name}
          </h3>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            <span className="truncate">{p.city}{p.address ? `, ${p.address}` : ''}</span>
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-300 mt-2.5 pt-2.5 border-t border-slate-800/80">
            <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5 text-indigo-400" />{p.bedrooms || 0} Bed</span>
            <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5 text-emerald-400" />{p.bathrooms || 0} Bath</span>
            {p.squareFeet && <span className="flex items-center gap-1"><Square className="w-3.5 h-3.5 text-amber-400" />{p.squareFeet} sqft</span>}
          </div>
        </div>

        {/* Triple Scores Row */}
        <div className="flex items-center justify-between gap-1 p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[10px] font-semibold">
          <span className="text-emerald-400">Trust {p.trustScore}</span>
          <span className="text-slate-600">·</span>
          <span className="text-indigo-400">Health {p.healthScore}</span>
          <span className="text-slate-600">·</span>
          <span className="text-emerald-400">Compliance {p.complianceScore}%</span>
        </div>

        {/* Manager Snippet & View CTA */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-[10px] flex items-center justify-center border border-indigo-500/30">
              {p.manager?.firstName?.[0] || 'M'}
            </div>
            <span className="text-[11px] text-slate-400 font-medium truncate max-w-[100px]">
              {p.manager?.firstName || 'Apex Mgmt'}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
            className="px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white font-bold text-xs flex items-center gap-1 transition-all border border-indigo-500/30"
          >
            View Property <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Minimalist Compact Map Card ──
function CompactCard({ p, isSaved, inCompare, onSave, onCompare, onClick }) {
  const color = TYPE_COLORS[p.type] || '#6366f1';
  return (
    <div
      onClick={onClick}
      className="p-3 rounded-2xl cursor-pointer bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition-all flex gap-3 shadow-md"
    >
      <div className="w-20 h-16 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 relative">
        {p.images?.[0] ? (
          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700">🏠</div>
        )}
        <span className="absolute top-1 left-1 bg-indigo-600 text-white text-[8px] font-extrabold px-1 rounded uppercase">{p.type}</span>
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-white truncate">{p.name}</h4>
        <p className="text-[10px] text-slate-400 truncate">📍 {p.city}</p>
        <p className="text-xs font-black text-emerald-400 mt-1">₹{p.rentAmount?.toLocaleString('en-IN')}<span className="text-[9px] font-normal text-slate-500">/mo</span></p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  MAIN PAGE COMPONENT
// ══════════════════════════════════════════
export default function BrowsePropertiesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMapResultsDrawer, setShowMapResultsDrawer] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('createdAt');

  // Filter Drawer State
  const [filters, setFilters] = useState({
    city: '',
    type: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    furnishing: '',
    country: '',
    verificationStatus: '',
    riskLevel: '',
    occupancy: '',
  });

  const [savedIds, setSavedIds] = useState(new Set());
  const [compareList, setCompareList] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const debounceRef = useRef(null);

  // ── Fetch Properties ──
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

      if (selectedCategory && selectedCategory !== 'All') {
        params.type = selectedCategory.toLowerCase();
      }

      Object.keys(params).forEach((k) => {
        if (params[k] === '' || params[k] === null || params[k] === undefined) delete params[k];
      });

      const res = await propertyService.getAllProperties(params);
      const list = res?.data?.data || res?.data || [];
      const enriched = (Array.isArray(list) ? list : []).map(enrichProperty);
      setProperties(enriched);

      const activeUser = useAuthStore.getState().user;
      if (activeUser) {
        const saved = new Set();
        enriched.forEach((p) => {
          if (p.savedBy?.includes(activeUser._id)) saved.add(p._id);
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

  useEffect(() => {
    fetchProperties();
  }, [sortBy, selectedCategory]);

  // Handle Autocomplete & Search Input
  const handleSearchChange = (val) => {
    setSearch(val);
    if (val.trim().length > 1) {
      const q = val.toLowerCase();
      const suggestions = [
        `📍 ${val.charAt(0).toUpperCase() + val.slice(1)}`,
        `🛡️ ${val.charAt(0).toUpperCase() + val.slice(1)} — Verified Properties`,
        `⏳ ${val.charAt(0).toUpperCase() + val.slice(1)} — Pending Verification`,
      ];
      setAutocompleteSuggestions(suggestions);
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProperties({ search: val });
    }, 500);
  };

  const handleSelectSuggestion = (sug) => {
    const clean = sug.replace(/^[📍🛡️⏳]\s*/, '').split('—')[0].trim();
    setSearch(clean);
    setShowAutocomplete(false);
    fetchProperties({ search: clean });
  };

  const handleSave = (propId) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.has(propId) ? next.delete(propId) : next.add(propId);
      return next;
    });
    propertyService.saveProperty(propId).catch(() => {});
  };

  const toggleCompare = (prop) => {
    setCompareList((prev) => {
      if (prev.some((p) => p._id === prop._id)) return prev.filter((p) => p._id !== prop._id);
      if (prev.length >= 3) return prev;
      return [...prev, prop];
    });
  };

  const handleMapBoundsChange = (bounds) => {
    setMapBounds(bounds);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const verifiedCount = properties.filter((p) => p.verificationStatus === 'VERIFIED').length;
  const pendingCount = properties.filter((p) => p.verificationStatus === 'PENDING_VERIFICATION').length;
  const highRiskCount = properties.filter((p) => p.riskLevel === 'HIGH' || p.verificationStatus === 'HIGH_RISK').length;

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-200">
      {/* ══ MINIMALIST HEADER ══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Properties
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Manage and inspect your property portfolio
          </p>
        </div>

        {/* Small Inline Statistics & Alerts Bell */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-400 bg-slate-900/60 p-2.5 px-4 rounded-2xl border border-slate-800/80 shadow-sm">
          <span><strong className="text-white font-bold">{properties.length}</strong> Total</span>
          <span className="text-slate-700">·</span>
          <span><strong className="text-emerald-400 font-bold">{verifiedCount}</strong> Verified</span>
          <span className="text-slate-700">·</span>
          <span><strong className="text-amber-400 font-bold">{pendingCount}</strong> Pending</span>
          <span className="text-slate-700">·</span>
          <span><strong className="text-rose-400 font-bold">{highRiskCount}</strong> Attention</span>

          <div className="h-4 w-px bg-slate-800" />

          {/* System Notification Bell */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
            title="System Compliance Notifications"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-black text-[9px] rounded-full flex items-center justify-center shadow-lg">
              5
            </span>
          </button>
        </div>
      </div>

      {/* ══ COMPACT SYSTEM NOTIFICATIONS POPOVER / DRAWER ══ */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-3 z-30"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-amber-400" /> System Compliance Alerts (5)
              </h3>
              <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white text-xs">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
              {SYSTEM_ALERTS.map((al) => (
                <div
                  key={al.id}
                  onClick={() => {
                    if (al.type === 'critical') setFilters((prev) => ({ ...prev, riskLevel: 'HIGH' }));
                    else setFilters((prev) => ({ ...prev, verificationStatus: 'PENDING_VERIFICATION' }));
                    setShowNotifications(false);
                    fetchProperties();
                  }}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-indigo-500/50 cursor-pointer space-y-1 transition-all"
                >
                  <p className="text-[11px] font-bold text-slate-200">{al.title}</p>
                  <p className="text-[10px] text-indigo-400 font-semibold">Click to filter properties →</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ SINGLE ELEGANT FLOATING TOOLBAR ══ */}
      <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-wrap items-center gap-3 relative z-20">
        {/* Search Bar with Autocomplete */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => search.length > 1 && setShowAutocomplete(true)}
            placeholder="Search property name, ID, city, manager..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />

          {/* Autocomplete Suggestions */}
          {showAutocomplete && autocompleteSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1 z-50">
              {autocompleteSuggestions.map((sug, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSuggestion(sug)}
                  className="p-2 hover:bg-slate-800 rounded-lg cursor-pointer text-xs text-slate-200"
                >
                  {sug}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter Drawer Toggle */}
        <button
          onClick={() => setShowFilters(true)}
          className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
            activeFilterCount > 0
              ? 'bg-indigo-600 text-white border-indigo-500'
              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-white text-indigo-600 font-black text-[9px] flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="pl-3 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Grid / Map Mode Toggle Pills */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Grid
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'map' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Map className="w-3.5 h-3.5" /> Map
          </button>
        </div>
      </div>

      {/* ══ CATEGORY PILLS & PRESET QUICK TAGS ══ */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2">
          {['All', 'Apartment', 'House', 'Commercial', 'Land'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all border ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setFilters((prev) => ({ ...prev, riskLevel: 'HIGH' }))}
            className="px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-[11px]"
          >
            🔥 High Risk
          </button>
          <button
            onClick={() => setFilters((prev) => ({ ...prev, verificationStatus: 'PENDING_VERIFICATION' }))}
            className="px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-bold text-[11px]"
          >
            ⏳ Pending
          </button>
          <button
            onClick={() => setFilters((prev) => ({ ...prev, verificationStatus: 'VERIFIED' }))}
            className="px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold text-[11px]"
          >
            ✅ Verified
          </button>
        </div>
      </div>

      {/* ══ RIGHT SLIDE-OVER FILTER DRAWER ══ */}
      <AnimatePresence>
        {showFilters && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-400" /> Filter Directory
                  </h3>
                  <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Filter Sections */}
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">City / Location</label>
                    <input
                      type="text"
                      value={filters.city}
                      onChange={(e) => setFilters((p) => ({ ...p, city: e.target.value }))}
                      placeholder="e.g. Hyderabad, Visakhapatnam..."
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Min Rent (₹)</label>
                      <input
                        type="number"
                        value={filters.minPrice}
                        onChange={(e) => setFilters((p) => ({ ...p, minPrice: e.target.value }))}
                        placeholder="0"
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Max Rent (₹)</label>
                      <input
                        type="number"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters((p) => ({ ...p, maxPrice: e.target.value }))}
                        placeholder="100000"
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Verification Status</label>
                    <select
                      value={filters.verificationStatus}
                      onChange={(e) => setFilters((p) => ({ ...p, verificationStatus: e.target.value }))}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    >
                      <option value="">All Verification Statuses</option>
                      <option value="VERIFIED">Verified</option>
                      <option value="PENDING_VERIFICATION">Pending Verification</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Risk Level</label>
                    <select
                      value={filters.riskLevel}
                      onChange={(e) => setFilters((p) => ({ ...p, riskLevel: e.target.value }))}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    >
                      <option value="">All Risk Levels</option>
                      <option value="LOW">Low Risk</option>
                      <option value="MEDIUM">Medium Risk</option>
                      <option value="HIGH">High Risk</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-800">
                <button
                  onClick={() => {
                    setFilters({
                      city: '',
                      type: '',
                      minPrice: '',
                      maxPrice: '',
                      bedrooms: '',
                      furnishing: '',
                      country: '',
                      verificationStatus: '',
                      riskLevel: '',
                      occupancy: '',
                    });
                    fetchProperties({});
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Reset All
                </button>
                <button
                  onClick={() => {
                    setShowFilters(false);
                    fetchProperties();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ GRID VIEW ══ */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading
            ? Array(8)
                .fill(0)
                .map((_, i) => <SkeletonCard key={i} />)
            : properties.length === 0
            ? (
              <div className="col-span-full p-12 text-center rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
                <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">No Properties Found</h3>
                <p className="text-xs text-slate-400">Try adjusting your filters or search keywords.</p>
              </div>
            )
            : properties.map((p, i) => (
                <GridCard
                  key={p._id || p.id}
                  p={p}
                  index={i}
                  isSaved={savedIds.has(p._id || p.id)}
                  inCompare={compareList.some((c) => (c._id || c.id) === (p._id || p.id))}
                  onSave={() => handleSave(p._id || p.id)}
                  onCompare={() => toggleCompare(p)}
                  onClick={() => handleViewPropertyNavigation({ navigate, property: p, role: user?.role })}
                />
              ))}
        </div>
      )}

      {/* ══ MAP VIEW ══ */}
      {viewMode === 'map' && (
        <div className="relative h-[calc(100vh-220px)] min-h-[550px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex flex-col">
          <MapErrorBoundary>
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Loading Interactive GIS Map Engine...
                </div>
              }
            >
              <InteractivePropertyMap
                height="100%"
                properties={properties}
                loading={loading}
                country={filters.country}
                onBoundsChange={handleMapBoundsChange}
              />
            </Suspense>
          </MapErrorBoundary>

          {/* Floating Controls Overlay */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <button
              onClick={() => fetchProperties()}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-white font-bold text-xs shadow-lg backdrop-blur-md border border-slate-800 flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5 text-indigo-400" /> Search this area
            </button>
            <button
              onClick={() => setShowMapResultsDrawer(!showMapResultsDrawer)}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-white font-bold text-xs shadow-lg backdrop-blur-md border border-slate-800 flex items-center gap-1.5"
            >
              Results ({properties.length})
            </button>
          </div>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 right-4 z-20">
            <button
              onClick={() => setLegendOpen(!legendOpen)}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-white font-bold text-xs shadow-lg backdrop-blur-md border border-slate-800 flex items-center gap-1"
            >
              Legend {legendOpen ? '▴' : '▾'}
            </button>
            {legendOpen && (
              <div className="mt-2 p-3 rounded-2xl bg-slate-900/95 border border-slate-800 text-[11px] space-y-1.5 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Verified</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> High Risk</div>
              </div>
            )}
          </div>

          {/* Optional Map Side Panel Drawer */}
          {showMapResultsDrawer && (
            <div className="absolute top-16 left-4 bottom-4 w-72 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-3 overflow-y-auto z-20 space-y-2 backdrop-blur-md">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white">{properties.length} Listings in Bounds</span>
                <button onClick={() => setShowMapResultsDrawer(false)} className="text-slate-400 text-xs">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {properties.map((p) => (
                <CompactCard
                  key={p._id || p.id}
                  p={p}
                  isSaved={savedIds.has(p._id || p.id)}
                  inCompare={compareList.some((c) => (c._id || c.id) === (p._id || p.id))}
                  onSave={() => handleSave(p._id || p.id)}
                  onCompare={() => toggleCompare(p)}
                  onClick={() => handleViewPropertyNavigation({ navigate, property: p, role: user?.role })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compare Floating Tray */}
      <AnimatePresence>
        {compareList.length > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 right-6 z-40 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-2xl flex items-center gap-4"
          >
            <div className="text-xs">
              <p className="font-bold text-white">Compare {compareList.length} Properties</p>
              <p className="text-[10px] text-slate-400">Up to 3 properties selected</p>
            </div>
            <button
              onClick={() => navigate('/compare', { state: { compareList } })}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md"
            >
              Compare Matrix →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

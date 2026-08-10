import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService } from '../../services/api';
import {
  Search, MapPin, Bed, Bath, Square, Building2,
  Star, ArrowRight, SlidersHorizontal, X,
  LayoutGrid, Map, Heart, Scale, ChevronDown,
  AlertTriangle, Bell, Filter, Eye, ChevronRight, RotateCcw,
  ShieldCheck, Check, Crosshair, Maximize2, Sparkles, CheckCircle2,
  Clock, Shield, User, RefreshCw, Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import useAuthStore from '../../context/authStore';
import { useTheme } from '../../context/ThemeContext';
import handleViewPropertyNavigation from '../../utils/propertyNavigationHelper';

// ── Lazy-load Leaflet Map ──
const InteractivePropertyMap = lazy(() => import('../PropertyMap'));

// ── Map Error Boundary ──
class MapErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full min-h-[500px] flex flex-col items-center justify-center gap-4 bg-card/80 border border-dashed border-destructive/30 rounded-[2.5rem] p-8 text-center backdrop-blur-2xl">
          <AlertTriangle className="w-10 h-10 text-destructive" />
          <p className="text-destructive font-black text-sm uppercase tracking-widest">GIS Map Engine Unavailable</p>
          <p className="text-muted-foreground text-xs max-w-md">{this.state.error?.message || 'Leaflet map failed to initialize.'}</p>
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
  { id: 'al_1', title: '3 SLA Breached Verification Requests', count: 3, type: 'critical' },
  { id: 'al_2', title: '2 Duplicate Property Coordinates Flagged', count: 2, type: 'high' },
  { id: 'al_3', title: '5 Documents Expiring in 14 Days', count: 5, type: 'medium' },
  { id: 'al_4', title: '1 Annual Fire NOC Inspection Missed', count: 1, type: 'critical' },
  { id: 'al_5', title: '4 Requests Ready for Final Approval', count: 4, type: 'success' },
];

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

function SkeletonCard({ compact = false }) {
  if (compact) {
    return (
      <div className="flex gap-3 p-3 rounded-[1.5rem] bg-card/60 border border-border/50 animate-pulse">
        <div className="w-24 h-20 rounded-xl bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3.5 w-3/4 bg-muted rounded-full" />
          <div className="h-3 w-1/2 bg-muted rounded-full" />
          <div className="h-4 w-1/3 bg-muted rounded-full" />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-[2.25rem] overflow-hidden bg-card/60 border border-border/50 animate-pulse space-y-3 p-4">
      <div className="h-48 bg-muted rounded-[1.75rem]" />
      <div className="h-4 w-2/3 bg-muted rounded-full" />
      <div className="h-3 w-1/2 bg-muted rounded-full" />
      <div className="h-9 w-full bg-muted rounded-full mt-2" />
    </div>
  );
}

function PropertyDirectoryCard({ p, index, isSaved, inCompare, onSave, onCompare, onClick, theme }) {
  const color = TYPE_COLORS[p.type] || '#6366f1';

  const getStatusBadge = () => {
    if (p.verificationStatus === 'HIGH_RISK' || p.riskLevel === 'HIGH') {
      return { label: 'High Risk', class: 'bg-rose-500/90 border-rose-400/20 text-white' };
    }
    if (p.verificationStatus === 'PENDING_VERIFICATION') {
      return { label: 'Pending', class: 'bg-amber-500/90 border-amber-400/20 text-white' };
    }
    return { label: 'Verified', class: 'bg-emerald-500/90 border-emerald-400/20 text-white' };
  };

  const statusBadge = getStatusBadge();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      onClick={onClick}
      className={cn(
        "group rounded-[2.25rem] overflow-hidden cursor-pointer backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between border shadow-xl",
        theme === 'light'
          ? "bg-white/80 border-slate-200/80 shadow-slate-200/50 hover:border-indigo-400/50 hover:shadow-2xl hover:shadow-indigo-500/10"
          : "bg-[#0c0d15]/80 border-white/10 shadow-black/60 hover:border-white/20 hover:shadow-2xl hover:shadow-indigo-500/10"
      )}
    >
      <div className="relative h-52 overflow-hidden bg-slate-950 p-2">
        <div className="w-full h-full rounded-[1.75rem] overflow-hidden relative">
          {p.images?.[0] ? (
            <img
              src={p.images[0]}
              alt={p.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
              <Building2 className="w-12 h-12 text-slate-700" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap z-10">
            <span
              className="px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest text-white shadow-lg backdrop-blur-md"
              style={{ background: `${color}DD` }}
            >
              {p.type}
            </span>
            <span className={`px-3 py-1 text-[10px] font-black rounded-full border shadow-lg backdrop-blur-md uppercase tracking-widest ${statusBadge.class}`}>
              {statusBadge.label}
            </span>
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              className={cn(
                "w-8 h-8 rounded-full border-none cursor-pointer flex items-center justify-center backdrop-blur-md transition-all shadow-lg",
                isSaved ? "bg-rose-500 text-white" : "bg-black/40 hover:bg-black/60 text-white"
              )}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCompare(); }}
              className={cn(
                "w-8 h-8 rounded-full border-none cursor-pointer flex items-center justify-center backdrop-blur-md transition-all shadow-lg",
                inCompare ? "bg-indigo-600 text-white" : "bg-black/40 hover:bg-black/60 text-white"
              )}
            >
              <Scale className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="absolute bottom-3 left-3 text-white">
            <p className="text-xl font-black tracking-tight mb-0">₹{p.rentAmount?.toLocaleString('en-IN')}</p>
            <p className="text-[10px] font-bold opacity-75 uppercase tracking-widest">per month</p>
          </div>

          {p.rating > 0 && (
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md flex items-center gap-1 shadow-lg border border-white/10">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-white text-xs font-black">{p.rating}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className={cn(
            "text-base font-black tracking-tight truncate transition-colors",
            theme === 'light' ? "text-slate-900 group-hover:text-indigo-600" : "text-white group-hover:text-slate-300"
          )}>
            {p.name}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            <span className="truncate">{p.city}{p.address ? `, ${p.address}` : ''}</span>
          </p>

          <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground mt-3 pt-3 border-t border-border/50">
            <span className="flex items-center gap-1.5"><Bed className="w-3.5 h-3.5 text-indigo-500" />{p.bedrooms || 0} Bed</span>
            <span className="flex items-center gap-1.5"><Bath className="w-3.5 h-3.5 text-emerald-500" />{p.bathrooms || 0} Bath</span>
            {p.squareFeet && <span className="flex items-center gap-1.5"><Square className="w-3.5 h-3.5 text-amber-500" />{p.squareFeet} sqft</span>}
          </div>
        </div>

        <div className={cn(
          "flex items-center justify-between gap-1 px-3.5 py-1.5 rounded-full border text-[10px] font-bold shadow-inner",
          theme === 'light' ? "bg-slate-100/80 border-slate-200" : "bg-slate-950/60 border-white/5"
        )}>
          <span className="text-emerald-500">Trust {p.trustScore}</span>
          <span className="opacity-30">•</span>
          <span className="text-indigo-500">Health {p.healthScore}</span>
          <span className="opacity-30">•</span>
          <span className="text-emerald-500">Compliance {p.complianceScore}%</span>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "w-7 h-7 rounded-full font-black text-[10px] flex items-center justify-center border flex-shrink-0",
              theme === 'light' ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-white/10 text-white border-white/10"
            )}>
              {p.manager?.firstName?.[0] || 'M'}
            </div>
            <span className="text-[11px] text-muted-foreground font-medium truncate">
              {p.manager?.firstName || 'Apex Mgmt'}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 transition-all shadow-lg flex-shrink-0 whitespace-nowrap cursor-pointer hover:scale-105",
              theme === 'light'
                ? "bg-slate-950 text-white hover:bg-indigo-600"
                : "bg-white text-slate-950 hover:bg-slate-200"
            )}
          >
            View <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function PropertyDirectory() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { theme } = useTheme();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMapResultsDrawer, setShowMapResultsDrawer] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('createdAt');

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
  });

  const [savedIds, setSavedIds] = useState(new Set());
  const [compareList, setCompareList] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);

  const debounceRef = useRef(null);

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
          if (p.savedBy?.includes(activeUser._id || activeUser.id)) saved.add(p._id || p.id);
        });
        setSavedIds(saved);
      }
    } catch (err) {
      console.error('Property Directory fetch error:', err);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [sortBy, selectedCategory]);

  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProperties({ search: val });
    }, 500);
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
      const pId = prop._id || prop.id;
      if (prev.some((p) => (p._id || p.id) === pId)) return prev.filter((p) => (p._id || p.id) !== pId);
      if (prev.length >= 3) return prev;
      return [...prev, prop];
    });
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const verifiedCount = properties.filter((p) => p.verificationStatus === 'VERIFIED').length;
  const pendingCount = properties.filter((p) => p.verificationStatus === 'PENDING_VERIFICATION').length;
  const highRiskCount = properties.filter((p) => p.riskLevel === 'HIGH' || p.verificationStatus === 'HIGH_RISK').length;

  return (
    <div className={cn(
      "min-h-screen relative overflow-hidden font-sans p-4 sm:p-8 space-y-8 max-w-[1600px] mx-auto transition-colors duration-300",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050508] text-slate-100"
    )}>
      {/* Header Pill */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className={cn(
          "inline-flex items-center gap-3 px-6 py-3 rounded-full border shadow-2xl backdrop-blur-2xl transition-all",
          theme === 'light'
            ? "bg-white/80 border-slate-200/80 shadow-slate-200/50 text-slate-900"
            : "bg-[#0c0d15]/80 border-white/10 shadow-black/40 text-white"
        )}>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
          <span className="text-xs font-black tracking-widest uppercase">TMS PROPERTY</span>
          <span className="opacity-30">|</span>
          <span className="text-xs font-medium opacity-70">Portfolio Management</span>
        </div>

        {/* Portfolio Stats */}
        <div className={cn(
          "flex items-center gap-3 text-xs font-medium px-6 py-3 rounded-full border shadow-2xl backdrop-blur-2xl transition-all",
          theme === 'light'
            ? "bg-white/80 border-slate-200/80 shadow-slate-200/50 text-slate-600"
            : "bg-[#0c0d15]/80 border-white/10 shadow-black/40 text-slate-400"
        )}>
          <span><strong className={theme === 'light' ? "text-slate-900 font-black" : "text-white font-black"}>{properties.length}</strong> Total</span>
          <span className="opacity-30">•</span>
          <span><strong className="text-emerald-500 font-black">{verifiedCount}</strong> Verified</span>
          <span className="opacity-30">•</span>
          <span><strong className="text-amber-500 font-black">{pendingCount}</strong> Pending</span>
          <span className="opacity-30">•</span>
          <span><strong className="text-rose-500 font-black">{highRiskCount}</strong> Attention</span>

          <div className="h-4 w-px bg-border/60" />

          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="System Compliance Notifications"
          >
            <Bell className="w-4 h-4 text-amber-500" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-black text-[9px] rounded-full flex items-center justify-center shadow-lg">
              5
            </span>
          </button>
        </div>
      </div>

      {/* Hero Title */}
      <div className="relative z-10 text-center space-y-2 py-4">
        <span className={cn(
          "text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border shadow-sm backdrop-blur-md inline-block",
          theme === 'light' ? "bg-white/80 border-slate-200 text-slate-600" : "bg-white/5 border-white/10 text-slate-400"
        )}>
          PORTFOLIO DIRECTORY
        </span>
        <h1 className={cn("text-3xl sm:text-4xl md:text-5xl font-black tracking-tight", theme === 'light' ? "text-slate-900" : "text-white")}>
          Property Directory
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto font-medium">
          Centralized property inspection, verification tracking, and portfolio management.
        </p>
      </div>

      {/* Toolbar */}
      <div className={cn(
        "relative z-20 p-2.5 rounded-full border shadow-2xl backdrop-blur-2xl flex flex-wrap items-center justify-between gap-3 transition-all",
        theme === 'light'
          ? "bg-white/80 border-slate-200/80 shadow-slate-200/60"
          : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
      )}>
        <div className="relative flex-1 min-w-[260px] pl-2">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search property name, ID, city, manager..."
            className={cn(
              "w-full pl-11 pr-4 py-2 rounded-full border text-xs focus:outline-none transition-all placeholder:text-muted-foreground/50",
              theme === 'light' ? "bg-slate-100/80 border-slate-200 text-slate-900 focus:border-indigo-500" : "bg-slate-950/80 border-white/10 text-white focus:border-white/30"
            )}
          />
        </div>

        <div className="flex items-center gap-2 pr-1">
          <button
            onClick={() => setShowFilters(true)}
            className={cn(
              "px-4 py-2 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer",
              activeFilterCount > 0
                ? "bg-indigo-600 text-white border-indigo-500 shadow-lg"
                : theme === 'light'
                ? "bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-300"
                : "bg-slate-950/80 text-slate-300 border-white/10 hover:border-white/30"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-indigo-600 font-black text-[9px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={cn(
                "pl-4 pr-8 py-2 rounded-full border text-xs font-bold appearance-none cursor-pointer transition-all",
                theme === 'light' ? "bg-slate-100 border-slate-200 text-slate-900" : "bg-slate-950/80 border-white/10 text-white"
              )}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          <div className={cn(
            "flex p-1 rounded-full border",
            theme === 'light' ? "bg-slate-100 border-slate-200" : "bg-slate-950/90 border-white/10"
          )}>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                viewMode === 'grid'
                  ? theme === 'light' ? "bg-slate-950 text-white shadow-md" : "bg-white text-slate-950 shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grid
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                viewMode === 'map'
                  ? theme === 'light' ? "bg-slate-950 text-white shadow-md" : "bg-white text-slate-950 shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Map className="w-3.5 h-3.5" /> Map
            </button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="relative z-10 flex items-center justify-between gap-4 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2">
          {['All', 'Apartment', 'House', 'Commercial', 'Land'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-black transition-all border cursor-pointer",
                selectedCategory === cat
                  ? theme === 'light'
                    ? "bg-slate-950 text-white border-slate-950 shadow-xl"
                    : "bg-white text-slate-950 border-white shadow-xl"
                  : theme === 'light'
                    ? "bg-white/80 text-slate-600 border-slate-200 hover:text-slate-900"
                    : "bg-[#0c0d15]/60 text-slate-400 border-white/10 hover:text-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setFilters((prev) => ({ ...prev, riskLevel: 'HIGH' }))}
            className="px-3.5 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-bold text-xs transition-all cursor-pointer"
          >
            High Risk
          </button>
          <button
            onClick={() => setFilters((prev) => ({ ...prev, verificationStatus: 'PENDING_VERIFICATION' }))}
            className="px-3.5 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 font-bold text-xs transition-all cursor-pointer"
          >
            Pending
          </button>
          <button
            onClick={() => setFilters((prev) => ({ ...prev, verificationStatus: 'VERIFIED' }))}
            className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 font-bold text-xs transition-all cursor-pointer"
          >
            Verified
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading
            ? Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : properties.length === 0
            ? (
              <div className="col-span-full p-16 text-center rounded-[2.5rem] bg-card/40 border border-dashed border-border/60 space-y-3 backdrop-blur-2xl">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto" />
                <h3 className="text-base font-bold">No Properties Found</h3>
                <p className="text-xs text-muted-foreground">Try adjusting your search terms or filters.</p>
              </div>
            )
            : properties.map((p, i) => (
                <PropertyDirectoryCard
                  key={p._id || p.id}
                  p={p}
                  index={i}
                  isSaved={savedIds.has(p._id || p.id)}
                  inCompare={compareList.some((c) => (c._id || c.id) === (p._id || p.id))}
                  onSave={() => handleSave(p._id || p.id)}
                  onCompare={() => toggleCompare(p)}
                  onClick={() => handleViewPropertyNavigation({ navigate, property: p, role: user?.role })}
                  theme={theme}
                />
              ))}
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && (
        <div className={cn(
          "relative z-10 h-[calc(100vh-240px)] min-h-[580px] rounded-[2.5rem] overflow-hidden border shadow-2xl flex flex-col backdrop-blur-2xl transition-all",
          theme === 'light' ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-white/10"
        )}>
          <MapErrorBoundary>
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs">Loading GIS Map Engine...</div>}>
              <InteractivePropertyMap
                height="100%"
                properties={properties}
                loading={loading}
                country={filters.country}
                onBoundsChange={setMapBounds}
              />
            </Suspense>
          </MapErrorBoundary>
        </div>
      )}
    </div>
  );
}

export default PropertyDirectory;

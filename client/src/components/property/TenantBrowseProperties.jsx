import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService } from '../../services/api';
import {
  Search, MapPin, Bed, Bath, Square, Building2,
  Star, ArrowRight, SlidersHorizontal, X,
  LayoutGrid, Map, Heart, Scale, ChevronDown,
  AlertTriangle, Filter
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
];

const TYPE_COLORS = {
  apartment: '#6366f1',
  house: '#10b981',
  commercial: '#f59e0b',
  land: '#8b5cf6',
};

// ── Skeleton Card ──
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

// ── Tenant Property Card Component ──
function TenantPropertyCard({ p, index, isSaved, inCompare, onSave, onCompare, onClick, theme }) {
  const color = TYPE_COLORS[p.type] || '#6366f1';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      onClick={onClick}
      className={cn(
        "group rounded-[2.25rem] overflow-hidden cursor-pointer backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between border shadow-xl",
        theme === 'light'
          ? "bg-white/90 border-slate-200/80 shadow-slate-200/50 hover:border-indigo-400/50 hover:shadow-2xl hover:shadow-indigo-500/10"
          : "bg-[#0c0d15]/80 border-white/10 shadow-black/60 hover:border-white/20 hover:shadow-2xl hover:shadow-indigo-500/10"
      )}
    >
      {/* Image & Badges */}
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

          {/* Top Type Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap z-10">
            <span
              className="px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest text-white shadow-lg backdrop-blur-md"
              style={{ background: `${color}DD` }}
            >
              {p.type || 'Residences'}
            </span>
            <span className="px-3 py-1 text-[10px] font-black rounded-full border shadow-lg backdrop-blur-md uppercase tracking-widest bg-emerald-500/90 border-emerald-400/20 text-white">
              VERIFIED
            </span>
          </div>

          {/* Top Right Save & Compare Buttons */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              className={cn(
                "w-8 h-8 rounded-full border-none cursor-pointer flex items-center justify-center backdrop-blur-md transition-all shadow-lg active:scale-90",
                isSaved ? "bg-rose-500 text-white" : "bg-black/40 hover:bg-black/60 text-white"
              )}
              title={isSaved ? "Saved to Favorites" : "Save Property"}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCompare(); }}
              className={cn(
                "w-8 h-8 rounded-full border-none cursor-pointer flex items-center justify-center backdrop-blur-md transition-all shadow-lg active:scale-90",
                inCompare ? "bg-indigo-600 text-white" : "bg-black/40 hover:bg-black/60 text-white"
              )}
              title={inCompare ? "In Compare List" : "Add to Compare"}
            >
              <Scale className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rent Price Overlay */}
          <div className="absolute bottom-3 left-3 text-white">
            <p className="text-xl font-black tracking-tight mb-0">
              ₹{p.rentAmount?.toLocaleString('en-IN') || '0'}
            </p>
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

      {/* Body Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className={cn(
            "text-base font-black tracking-tight truncate transition-colors",
            theme === 'light' ? "text-slate-900 group-hover:text-indigo-600" : "text-white group-hover:text-indigo-400"
          )}>
            {p.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 font-medium">
            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            <span className="truncate">{p.city}{p.address ? `, ${p.address}` : ''}</span>
          </p>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
            <span className="flex items-center gap-1.5"><Bed className="w-3.5 h-3.5 text-indigo-500" />{p.bedrooms || 0} Bed</span>
            <span className="flex items-center gap-1.5"><Bath className="w-3.5 h-3.5 text-emerald-500" />{p.bathrooms || 0} Bath</span>
            {p.squareFeet && <span className="flex items-center gap-1.5"><Square className="w-3.5 h-3.5 text-amber-500" />{p.squareFeet} sqft</span>}
          </div>
        </div>

        {/* Manager Avatar & View Button */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "w-7 h-7 rounded-full font-black text-[10px] flex items-center justify-center border flex-shrink-0",
              theme === 'light' ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-white/10 text-white border-white/10"
            )}>
              {p.manager?.firstName?.[0] || 'M'}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
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

// ── Compact Map Card Component ──
function CompactMapCard({ p, onClick, theme }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-2xl cursor-pointer border transition-all flex gap-3 shadow-xl backdrop-blur-md",
        theme === 'light'
          ? "bg-white/90 border-slate-200 hover:border-slate-300 text-slate-900"
          : "bg-[#0c0d15]/90 border-white/10 hover:border-white/20 text-white"
      )}
    >
      <div className="w-20 h-16 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 relative">
        {p.images?.[0] ? (
          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700">🏠</div>
        )}
        <span className="absolute top-1 left-1 bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">
          {p.type}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold truncate">{p.name}</h4>
        <p className="text-[10px] text-slate-500 truncate">📍 {p.city}</p>
        <p className="text-xs font-black text-emerald-500 mt-1">
          ₹{p.rentAmount?.toLocaleString('en-IN')}<span className="text-[9px] font-normal text-slate-500">/mo</span>
        </p>
      </div>
    </div>
  );
}

// ── Main Tenant Browse Properties Component ──
export function TenantBrowseProperties() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { theme } = useTheme();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
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
  });

  const [savedIds, setSavedIds] = useState(new Set());
  const [compareList, setCompareList] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);

  const debounceRef = useRef(null);

  // Fetch properties from backend
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
      const validList = Array.isArray(list) ? list : [];
      setProperties(validList);

      const activeUser = useAuthStore.getState().user;
      if (activeUser) {
        const saved = new Set();
        validList.forEach((p) => {
          if (p.savedBy?.includes(activeUser._id || activeUser.id)) saved.add(p._id || p.id);
        });
        setSavedIds(saved);
      }
    } catch (err) {
      console.error('Tenant browse properties fetch error:', err);
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

  return (
    <div className={cn(
      "min-h-screen relative overflow-hidden font-sans p-4 sm:p-8 space-y-8 max-w-[1600px] mx-auto transition-colors duration-300",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050508] text-slate-100"
    )}>
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500"
        style={{
          background: theme === 'light'
            ? 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.08), transparent 70%)'
            : 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15), transparent 70%)',
        }}
      />

      {/* Top Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Browse Properties
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Explore verified residential & commercial properties available for rent
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className={cn(
          "flex p-1 rounded-full border shadow-sm w-fit",
          theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
        )}>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
              viewMode === 'grid'
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <LayoutGrid className="w-4 h-4" /> Grid View
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
              viewMode === 'map'
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <Map className="w-4 h-4" /> Map View
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className={cn(
        "relative z-20 p-3 rounded-3xl border shadow-xl backdrop-blur-2xl flex flex-wrap items-center justify-between gap-3 transition-all",
        theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        {/* Search Input */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search location, property name, city..."
            className={cn(
              "w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs focus:outline-none transition-all placeholder:text-slate-400 font-medium",
              theme === 'light'
                ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
                : "bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-400"
            )}
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(true)}
            className={cn(
              "px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer",
              activeFilterCount > 0
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                : theme === 'light'
                ? "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                : "bg-slate-950 text-slate-200 border-slate-800 hover:bg-slate-800"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-indigo-600 font-black text-[9px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort Select */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={cn(
                "pl-4 pr-8 py-2.5 rounded-2xl border text-xs font-bold appearance-none cursor-pointer transition-all",
                theme === 'light' ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-950 border-slate-800 text-slate-100"
              )}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['All', 'Apartment', 'House', 'Commercial', 'Land'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-5 py-2 rounded-2xl text-xs font-black transition-all border cursor-pointer",
              selectedCategory === cat
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                : theme === 'light'
                ? "bg-white text-slate-600 border-slate-200 hover:text-slate-900"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-100"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tenant Filter Drawer */}
      <AnimatePresence>
        {showFilters && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                "w-full max-w-md h-full border-l p-6 flex flex-col justify-between shadow-2xl overflow-y-auto",
                theme === 'light' ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white"
              )}
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Filter className="w-4 h-4 text-indigo-500" /> Filter Properties
                  </h3>
                  <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 font-semibold block mb-1">City / Region</label>
                    <input
                      type="text"
                      value={filters.city}
                      onChange={(e) => setFilters((p) => ({ ...p, city: e.target.value }))}
                      placeholder="e.g. Visakhapatnam, Hyderabad..."
                      className={cn(
                        "w-full p-3 rounded-2xl border text-xs focus:outline-none",
                        theme === 'light' ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-950 border-slate-800 text-white"
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-500 dark:text-slate-400 font-semibold block mb-1">Min Rent (₹)</label>
                      <input
                        type="number"
                        value={filters.minPrice}
                        onChange={(e) => setFilters((p) => ({ ...p, minPrice: e.target.value }))}
                        placeholder="0"
                        className={cn(
                          "w-full p-3 rounded-2xl border text-xs focus:outline-none",
                          theme === 'light' ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-950 border-slate-800 text-white"
                        )}
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 dark:text-slate-400 font-semibold block mb-1">Max Rent (₹)</label>
                      <input
                        type="number"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters((p) => ({ ...p, maxPrice: e.target.value }))}
                        placeholder="100000"
                        className={cn(
                          "w-full p-3 rounded-2xl border text-xs focus:outline-none",
                          theme === 'light' ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-950 border-slate-800 text-white"
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-500 dark:text-slate-400 font-semibold block mb-1">Bedrooms</label>
                    <select
                      value={filters.bedrooms}
                      onChange={(e) => setFilters((p) => ({ ...p, bedrooms: e.target.value }))}
                      className={cn(
                        "w-full p-3 rounded-2xl border text-xs focus:outline-none",
                        theme === 'light' ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-950 border-slate-800 text-white"
                      )}
                    >
                      <option value="">Any Bedrooms</option>
                      <option value="1">1 BHK</option>
                      <option value="2">2 BHK</option>
                      <option value="3">3 BHK</option>
                      <option value="4">4+ BHK</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => {
                    setFilters({ city: '', type: '', minPrice: '', maxPrice: '', bedrooms: '', furnishing: '', country: '' });
                    fetchProperties({});
                  }}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer hover:bg-slate-200"
                >
                  Reset All
                </button>
                <button
                  onClick={() => {
                    setShowFilters(false);
                    fetchProperties();
                  }}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md cursor-pointer"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading
            ? Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : properties.length === 0
            ? (
              <div className="col-span-full p-16 text-center rounded-[2.5rem] bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
                <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Properties Found</h3>
                <p className="text-xs text-slate-500">Try adjusting your search terms or filters to find available homes.</p>
              </div>
            )
            : properties.map((p, i) => (
                <TenantPropertyCard
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
          "h-[calc(100vh-240px)] min-h-[580px] rounded-[2.5rem] overflow-hidden border shadow-2xl flex flex-col md:flex-row backdrop-blur-2xl transition-all",
          theme === 'light' ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-800"
        )}>
          <div className="flex-1 h-full relative">
            <MapErrorBoundary>
              <Suspense fallback={<div className="h-full flex items-center justify-center text-xs">Loading GIS Map...</div>}>
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

          <div className="w-full md:w-80 h-64 md:h-full p-4 overflow-y-auto space-y-3 bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Properties in View ({properties.length})</p>
            {properties.map((p) => (
              <CompactMapCard
                key={p._id || p.id}
                p={p}
                onClick={() => handleViewPropertyNavigation({ navigate, property: p, role: user?.role })}
                theme={theme}
              />
            ))}
          </div>
        </div>
      )}

      {/* Compare Tray */}
      <AnimatePresence>
        {compareList.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3.5 rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 border border-white/20"
          >
            <Scale className="w-5 h-5 shrink-0" />
            <span className="font-bold text-xs whitespace-nowrap">
              {compareList.length} propert{compareList.length > 1 ? 'ies' : 'y'} selected
            </span>
            <button
              onClick={() => navigate('/compare', { state: { compareList } })}
              className="px-4 py-2 rounded-full bg-white text-indigo-600 font-extrabold text-xs hover:bg-slate-100 transition cursor-pointer"
            >
              Compare Now →
            </button>
            <button
              onClick={() => setCompareList([])}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TenantBrowseProperties;

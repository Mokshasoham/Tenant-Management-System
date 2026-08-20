import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Sparkles,
  Train,
  HeartPulse,
  UtensilsCrossed,
  ShoppingBag,
  GraduationCap,
  Landmark,
  Zap,
  MapPin,
  ArrowRight,
  Navigation,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Building2,
  MapPinOff,
} from 'lucide-react';
import { nearbyService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';
import NearbyRouteModal from './NearbyRouteModal';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'transit', label: 'Transit', icon: Train },
  { id: 'health', label: 'Health', icon: HeartPulse },
  { id: 'food', label: 'Food', icon: UtensilsCrossed },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'finance', label: 'Finance', icon: Landmark },
  { id: 'services', label: 'Essentials', icon: Zap },
];

const SUBCATEGORY_LABELS = {
  railway_station: 'Railway Station',
  subway_station: 'Subway Station',
  airport: 'Airport',
  bus_station: 'Bus Station',
  transit_station: 'Transit Hub',
  hospital: 'Hospital',
  clinic: 'Medical Clinic',
  pharmacy: 'Pharmacy',
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  bakery: 'Bakery',
  shopping_mall: 'Shopping Mall',
  supermarket: 'Supermarket',
  market: 'Local Market',
  school: 'School',
  college: 'College / University',
  library: 'Public Library',
  bank: 'Bank Branch',
  atm: 'ATM',
  fuel_station: 'Fuel / Petrol',
  police_station: 'Police Station',
  gym: 'Fitness & Gym',
  park: 'Park & Recreation',
  place_of_worship: 'Place of Worship',
  local_amenity: 'Neighborhood Amenity',
};

const CATEGORY_STYLES = {
  all: {
    accent: 'emerald',
    badgeDark: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    badgeLight: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBgDark: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    iconBgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  transit: {
    accent: 'cyan',
    badgeDark: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
    badgeLight: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    iconBgDark: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    iconBgLight: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  health: {
    accent: 'rose',
    badgeDark: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    badgeLight: 'bg-rose-50 text-rose-800 border-rose-200',
    iconBgDark: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    iconBgLight: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  food: {
    accent: 'amber',
    badgeDark: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    badgeLight: 'bg-amber-50 text-amber-800 border-amber-200',
    iconBgDark: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    iconBgLight: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  shopping: {
    accent: 'purple',
    badgeDark: 'bg-purple-500/10 text-purple-300 border-purple-500/25',
    badgeLight: 'bg-purple-50 text-purple-800 border-purple-200',
    iconBgDark: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    iconBgLight: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  education: {
    accent: 'indigo',
    badgeDark: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25',
    badgeLight: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    iconBgDark: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    iconBgLight: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  finance: {
    accent: 'emerald',
    badgeDark: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    badgeLight: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBgDark: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    iconBgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  services: {
    accent: 'teal',
    badgeDark: 'bg-teal-500/10 text-teal-300 border-teal-500/25',
    badgeLight: 'bg-teal-50 text-teal-800 border-teal-200',
    iconBgDark: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    iconBgLight: 'bg-teal-50 text-teal-700 border-teal-200',
  },
};

const getCategoryIcon = (category) => {
  switch (category) {
    case 'transit':
      return Train;
    case 'health':
      return HeartPulse;
    case 'food':
      return UtensilsCrossed;
    case 'shopping':
      return ShoppingBag;
    case 'education':
      return GraduationCap;
    case 'finance':
      return Landmark;
    case 'services':
      return Zap;
    default:
      return MapPin;
  }
};

export default function NearbyPlacesSection({ property }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [places, setPlaces] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const [statusReason, setStatusReason] = useState(null); // 'OK' | 'NO_RESULTS' | 'LOCATION_UNAVAILABLE' | 'PROVIDER_UNAVAILABLE'
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeRoutePlace, setActiveRoutePlace] = useState(null);

  const propertyId = property?._id || property?.id;

  // Strict property isolation: reset all state when property changes
  useEffect(() => {
    setIsExpanded(false);
    setLoading(false);
    setPlaces([]);
    setSelectedCategory('all');
    setShowAll(false);
    setStatusReason(null);
    setErrorMessage(null);
    setActiveRoutePlace(null);
  }, [propertyId]);

  // Fetch nearby places
  const fetchPlaces = useCallback(async () => {
    if (!propertyId) return;

    setLoading(true);
    setErrorMessage(null);
    setStatusReason(null);

    try {
      const res = await nearbyService.getNearbyPlaces(propertyId, {
        category: 'all',
        radius: 8000,
      });

      const data = res?.data?.data || res?.data || res;

      if (data?.reason === 'LOCATION_UNAVAILABLE') {
        setStatusReason('LOCATION_UNAVAILABLE');
        setPlaces([]);
      } else if (data?.reason === 'PROVIDER_UNAVAILABLE') {
        setStatusReason('PROVIDER_UNAVAILABLE');
        setPlaces([]);
        setErrorMessage(data?.message || 'Nearby places service is temporarily unavailable. Please retry.');
      } else if (Array.isArray(data?.places)) {
        setPlaces(data.places);
        setStatusReason(data.places.length === 0 ? 'NO_RESULTS' : 'OK');
      } else {
        setPlaces([]);
        setStatusReason('NO_RESULTS');
      }
    } catch (err) {
      console.warn('[NearbyPlacesSection] Error fetching nearby places:', err);
      const serverReason = err?.response?.data?.reason;
      if (serverReason === 'LOCATION_UNAVAILABLE') {
        setStatusReason('LOCATION_UNAVAILABLE');
      } else {
        setStatusReason('PROVIDER_UNAVAILABLE');
        setErrorMessage(
          err?.response?.data?.message ||
            'Nearby places are temporarily unavailable. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  // Expand / Toggle Click
  const handleToggleExpand = useCallback(() => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    if (nextState && places.length === 0 && !loading && statusReason !== 'LOCATION_UNAVAILABLE') {
      fetchPlaces();
    }
  }, [isExpanded, places.length, loading, statusReason, fetchPlaces]);

  // Listen for external trigger from Top Nearby Places CTA
  useEffect(() => {
    const handleOpenNearby = () => {
      setIsExpanded(true);
      if (places.length === 0 && !loading && statusReason !== 'LOCATION_UNAVAILABLE') {
        fetchPlaces();
      }
    };
    window.addEventListener('open-nearby-places', handleOpenNearby);
    return () => window.removeEventListener('open-nearby-places', handleOpenNearby);
  }, [places.length, loading, statusReason, fetchPlaces]);

  // Filter places by active category
  const filteredPlaces = useMemo(() => {
    if (selectedCategory === 'all') return places;
    return places.filter((p) => p.category === selectedCategory);
  }, [places, selectedCategory]);

  // Counts per category for badge indicators
  const categoryCounts = useMemo(() => {
    const counts = { all: places.length };
    for (const p of places) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [places]);

  // Initial visible slice (top 6 unless showAll is true)
  const visiblePlaces = showAll ? filteredPlaces : filteredPlaces.slice(0, 6);

  return (
    <div id="explore-nearby-places" className="space-y-6 pt-4 border-t border-border/60 scroll-mt-28 rounded-2xl transition-all duration-300">
      {/* ── 1. HERO EXPANDER BANNER (PREMIUM REAL ESTATE DISCOVERY LOOK) ── */}
      <div
        className={cn(
          "relative rounded-2xl border p-6 sm:p-7 overflow-hidden transition-all duration-300 shadow-sm",
          isDark
            ? "bg-[#0B132B] border-slate-800/90 text-white shadow-black/20"
            : "bg-white border-slate-200 text-slate-900 shadow-slate-100"
        )}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[10px] font-extrabold tracking-[0.2em] uppercase",
                  isDark ? "text-emerald-400" : "text-emerald-700"
                )}
              >
                ✦ EXPLORE THE NEIGHBORHOOD
              </span>
            </div>

            <h3 className={cn("text-xl sm:text-2xl font-black tracking-tight", isDark ? "text-slate-100" : "text-slate-900")}>
              Explore Nearby Places
            </h3>

            <p className={cn("text-xs sm:text-sm max-w-xl font-normal leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
              Discover transit stations, hospitals, markets, dining, and essential amenities around this property.
            </p>
          </div>

          {/* Action Trigger Button */}
          <button
            type="button"
            onClick={handleToggleExpand}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer shrink-0 group shadow-xs active:scale-[0.98]",
              isExpanded
                ? isDark
                  ? "bg-slate-800/95 hover:bg-slate-700/95 border border-slate-700 text-slate-200"
                  : "bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800"
                : isDark
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            )}
          >
            {isExpanded ? (
              <>
                <span>Hide Neighborhood</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Explore Nearby Places</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 2. EXPANDABLE NEARBY PLACES CONTENT ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="space-y-6 overflow-hidden pt-1"
          >
            {/* Category Filter Interactive Chips with Icon Bubbles */}
            <div className="overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              <div className="flex items-center gap-2 min-w-max">
                {CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  const count = categoryCounts[cat.id] || 0;
                  const style = CATEGORY_STYLES[cat.id] || CATEGORY_STYLES.services;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setShowAll(false);
                      }}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer border shadow-2xs group shrink-0 active:scale-[0.98]",
                        isSelected
                          ? isDark
                            ? "bg-slate-800/95 border-emerald-500/50 text-white shadow-xs ring-1 ring-emerald-500/30"
                            : "bg-slate-900 border-slate-900 text-white shadow-xs"
                          : isDark
                          ? "bg-[#0c1427]/80 hover:bg-slate-800/80 border-slate-800/90 text-slate-300 hover:text-white"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs"
                      )}
                    >
                      {/* Category Icon Bubble */}
                      <div
                        className={cn(
                          "w-5 h-5 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 border shrink-0",
                          isSelected
                            ? isDark
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : "bg-white/20 text-white border-white/30"
                            : isDark
                            ? style.iconBgDark
                            : style.iconBgLight
                        )}
                      >
                        <CatIcon className="w-3 h-3 stroke-[2.2]" />
                      </div>

                      <span>{cat.label}</span>

                      {/* Category Count Pill Badge */}
                      {places.length > 0 && count > 0 && (
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight transition-colors",
                            isSelected
                              ? isDark
                                ? "bg-emerald-500/25 text-emerald-200"
                                : "bg-white/25 text-white"
                              : isDark
                              ? "bg-slate-800 text-slate-400 group-hover:text-slate-200"
                              : "bg-slate-100 text-slate-600 group-hover:text-slate-900"
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Missing Property Location State */}
            {statusReason === 'LOCATION_UNAVAILABLE' && (
              <div
                className={cn(
                  "p-7 rounded-2xl border text-center space-y-2.5",
                  isDark ? "bg-slate-900/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                )}
              >
                <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <MapPinOff className="w-5 h-5" />
                </div>
                <h4 className={cn("text-sm font-semibold", isDark ? "text-slate-200" : "text-slate-900")}>
                  Nearby places aren't available for this property yet
                </h4>
                <p className="text-xs max-w-md mx-auto text-slate-400">
                  Property location coordinates are not configured or pending verification.
                </p>
              </div>
            )}

            {/* Provider Error / Unavailable Banner */}
            {statusReason === 'PROVIDER_UNAVAILABLE' && errorMessage && (
              <div
                className={cn(
                  "p-4 rounded-xl border text-xs flex flex-col sm:flex-row items-center justify-between gap-3",
                  isDark
                    ? "bg-slate-900/80 border-slate-800 text-slate-300"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={fetchPlaces}
                  disabled={loading}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 border",
                    isDark
                      ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
                      : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs"
                  )}
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Loading Skeleton Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-5 rounded-2xl border space-y-3.5 animate-pulse flex flex-col justify-between h-[230px]",
                      isDark ? "bg-[#0c1427] border-slate-800/80" : "bg-white border-slate-200"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className={cn("w-10 h-10 rounded-xl", isDark ? "bg-slate-800" : "bg-slate-200")} />
                        <div className={cn("w-16 h-5 rounded-md", isDark ? "bg-slate-800" : "bg-slate-200")} />
                      </div>
                      <div className={cn("w-3/4 h-4 rounded mt-4", isDark ? "bg-slate-800" : "bg-slate-200")} />
                      <div className={cn("w-1/2 h-3 rounded mt-2", isDark ? "bg-slate-800" : "bg-slate-200")} />
                      <div className={cn("w-28 h-6 rounded-lg mt-3", isDark ? "bg-slate-800" : "bg-slate-200")} />
                    </div>
                    <div className={cn("w-full h-10 rounded-xl pt-2", isDark ? "bg-slate-800" : "bg-slate-200")} />
                  </div>
                ))}
              </div>
            ) : statusReason !== 'LOCATION_UNAVAILABLE' && filteredPlaces.length === 0 ? (
              /* Empty State */
              <div
                className={cn(
                  "p-8 rounded-2xl border text-center space-y-2.5",
                  isDark ? "bg-slate-900/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                )}
              >
                <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center bg-slate-800/60 text-slate-400 border border-slate-700">
                  <Compass className="w-5 h-5" />
                </div>
                <h4 className={cn("text-sm font-semibold", isDark ? "text-slate-200" : "text-slate-900")}>
                  {selectedCategory === 'all'
                    ? 'No nearby places found in this area'
                    : `No ${selectedCategory} places found in this area`}
                </h4>
                <p className="text-xs max-w-md mx-auto text-slate-400">
                  {selectedCategory === 'all'
                    ? 'No registered amenities were detected within the search radius for this location.'
                    : 'Try selecting another category or viewing all places.'}
                </p>
                {selectedCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer mt-2",
                      isDark
                        ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
                        : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs"
                    )}
                  >
                    <span>View All Categories</span>
                  </button>
                )}
              </div>
            ) : statusReason !== 'LOCATION_UNAVAILABLE' ? (
              /* ── Floating Location Bubble Cards Grid (3 Columns) ── */
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visiblePlaces.map((place) => {
                    const PlaceIcon = getCategoryIcon(place.category);
                    const subLabel = SUBCATEGORY_LABELS[place.subcategory] || place.category.toUpperCase();
                    const style = CATEGORY_STYLES[place.category] || CATEGORY_STYLES.services;

                    return (
                      <motion.div
                        key={place.id}
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className={cn(
                          "relative rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 h-full group shadow-xs hover:shadow-md",
                          isDark
                            ? "bg-[#0c1427] hover:bg-[#101b33] border-slate-800/90 hover:border-slate-700 text-white"
                            : "bg-white hover:bg-slate-50/80 border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)]"
                        )}
                      >
                        {/* Upper Content Area (Flex Grow for Perfect Alignment) */}
                        <div className="flex-grow flex flex-col">
                          {/* Top Row: Floating Icon Bubble + Category Pill Badge */}
                          <div className="flex items-center justify-between">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs transition-transform duration-200 group-hover:scale-105",
                                isDark ? style.iconBgDark : style.iconBgLight
                              )}
                            >
                              <PlaceIcon className="w-4 h-4 stroke-[2.2]" />
                            </div>

                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border shadow-2xs",
                                isDark ? style.badgeDark : style.badgeLight
                              )}
                            >
                              {place.category.toUpperCase()}
                            </span>
                          </div>

                          {/* Place Name & Subtitle */}
                          <div className="mt-4 space-y-1">
                            <h4
                              title={place.name}
                              className={cn(
                                "text-base font-bold truncate tracking-tight transition-colors group-hover:text-emerald-500 dark:group-hover:text-emerald-400",
                                isDark ? "text-slate-100" : "text-slate-900"
                              )}
                            >
                              {place.name}
                            </h4>
                            <p className={cn("text-xs truncate font-normal", isDark ? "text-slate-400" : "text-slate-500")}>
                              {place.address || `${subLabel} in area`}
                            </p>
                          </div>

                          {/* Distance Pill */}
                          <div className="mt-auto pt-4 flex items-center">
                            <div
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold",
                                isDark
                                  ? "bg-slate-900/90 border-slate-800 text-slate-300"
                                  : "bg-slate-100 border-slate-200 text-slate-700"
                              )}
                            >
                              <MapPin className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                              <span className={cn("font-bold", isDark ? "text-slate-200" : "text-slate-900")}>
                                {place.distanceText}
                              </span>
                              <span className={cn("font-normal text-[11px]", isDark ? "text-slate-400" : "text-slate-500")}>
                                from property
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Divider & FULLY FILLED Navigate Action Button */}
                        <div className="pt-4 mt-3.5 border-t border-slate-200/60 dark:border-slate-800/70">
                          <button
                            type="button"
                            onClick={() => setActiveRoutePlace(place)}
                            aria-label={`Navigate to ${place.name}`}
                            className={cn(
                              "w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.98] group/btn border",
                              isDark
                                ? "bg-slate-800 hover:bg-slate-700/90 border-slate-700/80 hover:border-slate-600 text-slate-100 hover:text-white shadow-xs"
                                : "bg-slate-900 hover:bg-slate-800 border-slate-900 text-white shadow-xs hover:shadow"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Navigation className="w-3.5 h-3.5 fill-current text-emerald-400 dark:text-emerald-400 group-hover/btn:rotate-12 transition-transform" />
                              <span className="font-semibold tracking-wide">Navigate</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* View All Toggle Button (if > 6 results) */}
                {filteredPlaces.length > 6 && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAll(!showAll)}
                      className={cn(
                        "inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]",
                        isDark
                          ? "bg-slate-800 hover:bg-slate-700/90 border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white"
                          : "bg-slate-900 hover:bg-slate-800 border-slate-900 text-white shadow-xs"
                      )}
                    >
                      <span>
                        {showAll
                          ? 'Show Fewer Nearby Places'
                          : `View All ${filteredPlaces.length} Nearby Places`}
                      </span>
                      {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3. ROUTE MODAL (LEAFLET ROUTE ENGINE) ── */}
      <AnimatePresence>
        {activeRoutePlace && (
          <NearbyRouteModal
            property={property}
            place={activeRoutePlace}
            onClose={() => setActiveRoutePlace(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

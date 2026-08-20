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
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeRoutePlace, setActiveRoutePlace] = useState(null);

  const propertyId = property?._id || property?.id;
  const hasCoordinates =
    property?.location?.lat !== undefined &&
    property?.location?.lng !== undefined &&
    !isNaN(Number(property.location.lat)) &&
    !isNaN(Number(property.location.lng));

  // Reset when propertyId changes
  useEffect(() => {
    setIsExpanded(false);
    setPlaces([]);
    setSelectedCategory('all');
    setShowAll(false);
    setErrorMessage(null);
    setActiveRoutePlace(null);
  }, [propertyId]);

  // Fetch nearby places
  const fetchPlaces = useCallback(async () => {
    if (!propertyId || !hasCoordinates) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await nearbyService.getNearbyPlaces(propertyId, {
        category: 'all',
        radius: 8000,
      });

      const data = res?.data?.data || res?.data || res;
      if (Array.isArray(data?.places)) {
        setPlaces(data.places);
      } else {
        setPlaces([]);
      }
    } catch (err) {
      console.warn('[NearbyPlacesSection] Error fetching nearby places:', err);
      setErrorMessage(
        err?.response?.data?.message ||
          'Nearby places are temporarily unavailable. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [propertyId, hasCoordinates]);

  // Expand / Toggle Click
  const handleToggleExpand = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    if (nextState && places.length === 0 && !loading) {
      fetchPlaces();
    }
  };

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

  if (!hasCoordinates) {
    return null; // Gracefully omit section if property has no location coordinates
  }

  return (
    <div className="space-y-6 pt-4 border-t border-border/60">
      {/* ── 1. HERO EXPANDER BANNER ── */}
      <div
        className={cn(
          "relative rounded-[28px] border p-6 sm:p-8 overflow-hidden transition-all duration-300 shadow-xl",
          isDark
            ? "bg-gradient-to-r from-[#061F1D] via-[#041416] to-[#020B0E] border-emerald-500/30 text-white shadow-[0_15px_35px_-10px_rgba(0,0,0,0.8)]"
            : "bg-gradient-to-r from-emerald-50/95 via-teal-50/90 to-white border-emerald-200 text-slate-900 shadow-md"
        )}
      >
        <div
          className={cn(
            "absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none",
            isDark ? "bg-emerald-500/10" : "bg-emerald-400/15"
          )}
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black tracking-widest uppercase shadow-sm",
                isDark
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-emerald-100 border-emerald-300 text-emerald-800"
              )}
            >
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              <span>✦ EXPLORE THE NEIGHBORHOOD</span>
            </div>

            <h3 className={cn("text-xl sm:text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Explore Nearby Places
            </h3>

            <p className={cn("text-xs sm:text-sm max-w-xl font-medium", isDark ? "text-slate-300" : "text-slate-600")}>
              Discover transit stations, hospitals, markets, dining, and essential amenities around this property.
            </p>
          </div>

          {/* Action Trigger Button */}
          <button
            type="button"
            onClick={handleToggleExpand}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg shrink-0",
              isExpanded
                ? isDark
                  ? "bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300"
                  : "bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 shadow-sm"
                : "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            {isExpanded ? (
              <>
                <span>Hide Neighborhood</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Explore Nearby Places</span>
                <ArrowRight className="w-4 h-4" />
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
            transition={{ duration: 0.3 }}
            className="space-y-6 overflow-hidden pt-2"
          >
            {/* Category Filter Chips */}
            <div className="overflow-x-auto pb-2 -mx-2 px-2">
              <div className="flex items-center gap-2 min-w-max">
                {CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  const count = categoryCounts[cat.id] || 0;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setShowAll(false);
                      }}
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer border shadow-sm",
                        isSelected
                          ? isDark
                            ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/25"
                            : "bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/25"
                          : isDark
                          ? "bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
                      )}
                    >
                      <CatIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{cat.label}</span>
                      {places.length > 0 && count > 0 && (
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                            isSelected
                              ? isDark
                                ? "bg-slate-950/30 text-slate-950"
                                : "bg-white/30 text-white"
                              : isDark
                              ? "bg-slate-800 text-slate-400"
                              : "bg-slate-100 text-slate-600"
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

            {/* Error State Banner */}
            {errorMessage && (
              <div
                className={cn(
                  "p-4 sm:p-5 rounded-2xl border text-xs font-bold flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md",
                  isDark
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={fetchPlaces}
                  disabled={loading}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 cursor-pointer transition-all shrink-0",
                    isDark
                      ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300"
                      : "bg-amber-200 hover:bg-amber-300 text-amber-900"
                  )}
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
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
                      "p-5 rounded-2xl border space-y-3 animate-pulse",
                      isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-100/80 border-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn("w-10 h-10 rounded-xl", isDark ? "bg-slate-800" : "bg-slate-200")} />
                      <div className={cn("w-16 h-5 rounded-full", isDark ? "bg-slate-800" : "bg-slate-200")} />
                    </div>
                    <div className={cn("w-3/4 h-5 rounded", isDark ? "bg-slate-800" : "bg-slate-200")} />
                    <div className={cn("w-1/2 h-3.5 rounded", isDark ? "bg-slate-800" : "bg-slate-200")} />
                    <div className={cn("w-full h-9 rounded-xl pt-2", isDark ? "bg-slate-800" : "bg-slate-200")} />
                  </div>
                ))}
              </div>
            ) : filteredPlaces.length === 0 ? (
              /* Empty State */
              <div
                className={cn(
                  "p-8 sm:p-12 rounded-3xl border text-center space-y-3 shadow-inner",
                  isDark ? "bg-slate-950/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                )}
              >
                <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Compass className="w-6 h-6" />
                </div>
                <h4 className={cn("text-base font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  Nothing nearby in this category yet
                </h4>
                <p className="text-xs max-w-md mx-auto">
                  We couldn't find registered places for this category within the neighborhood radius.
                </p>
                {selectedCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer mt-2"
                  >
                    <span>View All Categories</span>
                  </button>
                )}
              </div>
            ) : (
              /* ── Place Cards Grid ── */
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visiblePlaces.map((place) => {
                    const PlaceIcon = getCategoryIcon(place.category);
                    const subLabel = SUBCATEGORY_LABELS[place.subcategory] || place.category.toUpperCase();

                    return (
                      <motion.div
                        key={place.id}
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "relative rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 shadow-md",
                          isDark
                            ? "bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-emerald-500/40 text-white"
                            : "bg-white hover:bg-slate-50/90 border-slate-200 hover:border-emerald-300 text-slate-900 shadow-slate-200/50"
                        )}
                      >
                        <div className="space-y-3.5">
                          {/* Header: Icon + Category Badge */}
                          <div className="flex items-center justify-between">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner",
                                isDark
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                  : "bg-emerald-100 border-emerald-300 text-emerald-700"
                              )}
                            >
                              <PlaceIcon className="w-5 h-5 stroke-[2.2]" />
                            </div>

                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                isDark
                                  ? "bg-slate-800 border-slate-700 text-slate-300"
                                  : "bg-slate-100 border-slate-200 text-slate-700"
                              )}
                            >
                              {subLabel}
                            </span>
                          </div>

                          {/* Place Name & Subtitle */}
                          <div className="space-y-1">
                            <h4 className={cn("text-base font-black truncate tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                              {place.name}
                            </h4>
                            <p className={cn("text-xs font-medium truncate", isDark ? "text-slate-400" : "text-slate-500")}>
                              {place.address || `${subLabel} in neighborhood`}
                            </p>
                          </div>

                          {/* Distance Badge */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className={cn("text-xs font-mono font-bold", isDark ? "text-emerald-400" : "text-emerald-700")}>
                              {place.distanceText}
                            </span>
                          </div>
                        </div>

                        {/* CTA Navigate Action Button */}
                        <div className="pt-5 mt-2 border-t border-border/40">
                          <button
                            type="button"
                            onClick={() => setActiveRoutePlace(place)}
                            className={cn(
                              "w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer",
                              isDark
                                ? "bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-white"
                                : "bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 shadow-sm"
                            )}
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Navigate</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-auto" />
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
                        "inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm",
                        isDark
                          ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
                      )}
                    >
                      <span>
                        {showAll
                          ? 'Show Less'
                          : `View All ${filteredPlaces.length} Nearby Places`}
                      </span>
                      {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            )}
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

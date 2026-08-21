import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  MapPin,
  Navigation,
  ArrowRight,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Compass,
  Train,
  HeartPulse,
  UtensilsCrossed,
  ShoppingBag,
  GraduationCap,
  Landmark,
  Zap,
  Sparkles,
  MapPinOff,
  Map as MapIcon,
  List as ListIcon,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { nearbyService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';

// Leaflet default marker icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const CATEGORY_META = {
  all: {
    title: 'Explore More Around the City',
    subtitle: 'Discover top places, transit, and essential amenities across the city',
    icon: Sparkles,
  },
  transit: {
    title: 'Explore More Transit',
    subtitle: 'Discover transit stations, railway hubs, and bus stands across the city',
    icon: Train,
  },
  health: {
    title: 'Explore More Health',
    subtitle: 'Discover hospitals, medical clinics, and healthcare centers across the city',
    icon: HeartPulse,
  },
  food: {
    title: 'Explore More Food',
    subtitle: 'Discover restaurants, cafes, bakeries, and dining across the city',
    icon: UtensilsCrossed,
  },
  shopping: {
    title: 'Explore More Shopping',
    subtitle: 'Discover shopping malls, supermarkets, and local markets across the city',
    icon: ShoppingBag,
  },
  education: {
    title: 'Explore More Education',
    subtitle: 'Discover schools, colleges, universities, and libraries across the city',
    icon: GraduationCap,
  },
  finance: {
    title: 'Explore More Finance',
    subtitle: 'Discover banks, ATMs, and financial branches across the city',
    icon: Landmark,
  },
  services: {
    title: 'Explore More Essentials',
    subtitle: 'Discover fuel stations, utilities, and essential services across the city',
    icon: Zap,
  },
};

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
    iconBgDark: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.12)]',
    iconBgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cardDarkBg: 'bg-gradient-to-b from-[#0a1d17]/40 via-[#0c1427] to-[#090e1b] border-emerald-500/20 hover:border-emerald-500/40',
    navBtnDark: 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/40 shadow-sm shadow-emerald-950/40',
    pinColor: '#059669',
  },
  transit: {
    accent: 'cyan',
    badgeDark: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
    badgeLight: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    iconBgDark: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.12)]',
    iconBgLight: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    cardDarkBg: 'bg-gradient-to-b from-[#0a1824]/40 via-[#0c1427] to-[#090e1b] border-cyan-500/20 hover:border-cyan-500/40',
    navBtnDark: 'bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500/40 shadow-sm shadow-cyan-950/40',
    pinColor: '#0891b2',
  },
  health: {
    accent: 'rose',
    badgeDark: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    badgeLight: 'bg-rose-50 text-rose-800 border-rose-200',
    iconBgDark: 'bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.12)]',
    iconBgLight: 'bg-rose-50 text-rose-700 border-rose-200',
    cardDarkBg: 'bg-gradient-to-b from-[#1c0d13]/40 via-[#0c1427] to-[#090e1b] border-rose-500/20 hover:border-rose-500/40',
    navBtnDark: 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/40 shadow-sm shadow-rose-950/40',
    pinColor: '#e11d48',
  },
  food: {
    accent: 'amber',
    badgeDark: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    badgeLight: 'bg-amber-50 text-amber-800 border-amber-200',
    iconBgDark: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.12)]',
    iconBgLight: 'bg-amber-50 text-amber-700 border-amber-200',
    cardDarkBg: 'bg-gradient-to-b from-[#1b150c]/40 via-[#0c1427] to-[#090e1b] border-amber-500/20 hover:border-amber-500/40',
    navBtnDark: 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-500/40 shadow-sm shadow-amber-950/40',
    pinColor: '#d97706',
  },
  shopping: {
    accent: 'purple',
    badgeDark: 'bg-purple-500/10 text-purple-300 border-purple-500/25',
    badgeLight: 'bg-purple-50 text-purple-800 border-purple-200',
    iconBgDark: 'bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.12)]',
    iconBgLight: 'bg-purple-50 text-purple-700 border-purple-200',
    cardDarkBg: 'bg-gradient-to-b from-[#190e24]/40 via-[#0c1427] to-[#090e1b] border-purple-500/20 hover:border-purple-500/40',
    navBtnDark: 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-500/40 shadow-sm shadow-purple-950/40',
    pinColor: '#9333ea',
  },
  education: {
    accent: 'indigo',
    badgeDark: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25',
    badgeLight: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    iconBgDark: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.12)]',
    iconBgLight: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    cardDarkBg: 'bg-gradient-to-b from-[#101026]/40 via-[#0c1427] to-[#090e1b] border-indigo-500/20 hover:border-indigo-500/40',
    navBtnDark: 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/40 shadow-sm shadow-indigo-950/40',
    pinColor: '#4f46e5',
  },
  finance: {
    accent: 'emerald',
    badgeDark: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    badgeLight: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBgDark: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.12)]',
    iconBgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cardDarkBg: 'bg-gradient-to-b from-[#0a1d17]/40 via-[#0c1427] to-[#090e1b] border-emerald-500/20 hover:border-emerald-500/40',
    navBtnDark: 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/40 shadow-sm shadow-emerald-950/40',
    pinColor: '#059669',
  },
  services: {
    accent: 'teal',
    badgeDark: 'bg-teal-500/10 text-teal-300 border-teal-500/25',
    badgeLight: 'bg-teal-50 text-teal-800 border-teal-200',
    iconBgDark: 'bg-teal-500/15 text-teal-300 border-teal-500/30 shadow-[0_0_12px_rgba(20,184,166,0.12)]',
    iconBgLight: 'bg-teal-50 text-teal-700 border-teal-200',
    cardDarkBg: 'bg-gradient-to-b from-[#091a1a]/40 via-[#0c1427] to-[#090e1b] border-teal-500/20 hover:border-teal-500/40',
    navBtnDark: 'bg-teal-600 hover:bg-teal-500 text-white border border-teal-500/40 shadow-sm shadow-teal-950/40',
    pinColor: '#0d9488',
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
      return Sparkles;
  }
};

const getCategoryEmoji = (category) => {
  switch (category) {
    case 'transit':
      return '🚆';
    case 'health':
      return '🏥';
    case 'food':
      return '🍽';
    case 'shopping':
      return '🛍';
    case 'education':
      return '🏫';
    case 'finance':
      return '🏦';
    case 'services':
      return '⚡';
    default:
      return '📍';
  }
};

export default function CityPlacesExplorerModal({
  isOpen,
  onClose,
  property,
  category = 'all',
  onNavigatePlace,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(false);
  const [places, setPlaces] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [visibleCount, setVisibleCount] = useState(12);
  const [statusReason, setStatusReason] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const propertyId = property?._id || property?.id;
  const meta = CATEGORY_META[category] || CATEGORY_META.all;
  const MetaIcon = meta.icon;
  const categoryStyle = CATEGORY_STYLES[category] || CATEGORY_STYLES.all;

  // Extract property origin coordinates
  const propertyLat = property?.location?.lat ?? property?.location?.latitude ?? property?.geo?.coordinates?.[1];
  const propertyLng = property?.location?.lng ?? property?.location?.longitude ?? property?.geo?.coordinates?.[0];

  // Fetch city-wide places for the selected category
  const fetchCityPlaces = useCallback(async () => {
    if (!propertyId || !isOpen) return;

    setLoading(true);
    setErrorMessage(null);
    setStatusReason(null);
    setVisibleCount(12);
    setSelectedSubcategory('all');

    try {
      const res = await nearbyService.getCityPlaces(propertyId, {
        category,
        radius: 18000,
      });

      const data = res?.data?.data || res?.data || res;

      if (data?.reason === 'LOCATION_UNAVAILABLE') {
        setStatusReason('LOCATION_UNAVAILABLE');
        setPlaces([]);
      } else if (data?.reason === 'PROVIDER_UNAVAILABLE') {
        setStatusReason('PROVIDER_UNAVAILABLE');
        setPlaces([]);
        setErrorMessage(data?.message || 'City discovery service is temporarily busy. Please retry.');
      } else if (Array.isArray(data?.places)) {
        setPlaces(data.places);
        setStatusReason(data.places.length === 0 ? 'NO_RESULTS' : 'OK');
      } else {
        setPlaces([]);
        setStatusReason('NO_RESULTS');
      }
    } catch (err) {
      console.error('[CityPlacesExplorerModal] Error fetching city places:', err);
      const serverReason = err?.response?.data?.reason;
      if (serverReason === 'LOCATION_UNAVAILABLE') {
        setStatusReason('LOCATION_UNAVAILABLE');
      } else {
        setStatusReason('PROVIDER_UNAVAILABLE');
        setErrorMessage(
          err?.response?.data?.message ||
            'City discovery service is temporarily busy. Please retry.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [propertyId, category, isOpen]);

  // Trigger fetch when modal opens or category changes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setViewMode('list');
      fetchCityPlaces();
    } else {
      setPlaces([]);
      setSearchQuery('');
    }
  }, [isOpen, category, fetchCityPlaces]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Extract unique subcategories from returned places
  const availableSubcategories = useMemo(() => {
    const map = new Map();
    for (const p of places) {
      const sub = p.subcategory || p.category;
      map.set(sub, (map.get(sub) || 0) + 1);
    }
    return Array.from(map.entries()).map(([sub, count]) => ({
      key: sub,
      label: SUBCATEGORY_LABELS[sub] || sub.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      count,
    }));
  }, [places]);

  // Filter places based on search query and subcategory
  const filteredPlaces = useMemo(() => {
    let result = places;

    if (selectedSubcategory !== 'all') {
      result = result.filter((p) => (p.subcategory || p.category) === selectedSubcategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.address?.toLowerCase().includes(q) ||
          (p.subcategory && SUBCATEGORY_LABELS[p.subcategory]?.toLowerCase().includes(q))
      );
    }

    return result;
  }, [places, selectedSubcategory, searchQuery]);

  const visiblePlaces = filteredPlaces.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPlaces.length;

  // Initialize and update Leaflet Map when viewMode === 'map'
  useEffect(() => {
    if (!isOpen || viewMode !== 'map' || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const defaultLat = typeof propertyLat === 'number' ? propertyLat : 16.7107;
    const defaultLng = typeof propertyLng === 'number' ? propertyLng : 81.0952;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([defaultLat, defaultLng], 12);

    L.control.zoom({ position: 'topright' }).addTo(map);

    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    }).addTo(map);

    const bounds = L.latLngBounds();

    // Add Property Origin Pin
    if (typeof propertyLat === 'number' && typeof propertyLng === 'number') {
      const originIcon = L.divIcon({
        className: 'custom-property-pin',
        html: `
          <div style="
            background: #10b981;
            width: 34px;
            height: 34px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 14px rgba(16,185,129,0.5);
            border: 2px solid #ffffff;
          ">
            <div style="transform: rotate(45deg); color: white; font-size: 14px;">🏡</div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -32],
      });

      const propMarker = L.marker([propertyLat, propertyLng], { icon: originIcon }).addTo(map);
      propMarker.bindPopup(`
        <div style="font-family: inherit; padding: 4px;">
          <b style="font-size: 13px; color: #10b981;">📍 ${property?.name || 'Your Property'}</b>
          <p style="font-size: 11px; margin-top: 2px; color: #64748b;">${property?.address || 'Origin Location'}</p>
        </div>
      `);
      bounds.extend([propertyLat, propertyLng]);
    }

    // Add City Places Pins
    filteredPlaces.forEach((place) => {
      if (typeof place.latitude === 'number' && typeof place.longitude === 'number') {
        const placeStyle = CATEGORY_STYLES[place.category] || categoryStyle;
        const emoji = getCategoryEmoji(place.category);

        const placeIcon = L.divIcon({
          className: 'custom-city-pin',
          html: `
            <div style="
              background: ${placeStyle.pinColor};
              width: 28px;
              height: 28px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              border: 2px solid #ffffff;
            ">
              <div style="transform: rotate(45deg); color: white; font-size: 11px;">${emoji}</div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
          popupAnchor: [0, -26],
        });

        const formattedDist = place.distance
          ? (place.distance < 1000 ? `${place.distance} m` : `${(place.distance / 1000).toFixed(1)} km`)
          : place.distanceText?.replace(/\s*from property/i, '').trim() || place.distanceText;

        const marker = L.marker([place.latitude, place.longitude], { icon: placeIcon }).addTo(map);

        const popupContent = document.createElement('div');
        popupContent.style.fontFamily = 'inherit';
        popupContent.style.padding = '4px';
        popupContent.innerHTML = `
          <b style="font-size: 13px; color: #0f172a; display: block;">${place.name}</b>
          <span style="font-size: 11px; color: #64748b; display: block; margin-top: 2px;">${place.address || place.subcategory || 'City location'}</span>
          <div style="font-size: 11px; font-weight: bold; color: #059669; margin-top: 4px;">📍 ${formattedDist} from property</div>
          <button id="nav-btn-${place.id}" style="
            margin-top: 8px;
            width: 100%;
            background: #0f172a;
            color: #ffffff;
            border: none;
            padding: 6px 10px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
          ">➤ Navigate</button>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`nav-btn-${place.id}`);
          if (btn) {
            btn.onclick = () => {
              if (onNavigatePlace) {
                onNavigatePlace(place);
              }
            };
          }
        });

        bounds.extend([place.latitude, place.longitude]);
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, viewMode, isDark, propertyLat, propertyLng, filteredPlaces, property, categoryStyle, onNavigatePlace]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          "relative w-full max-w-5xl max-h-[92vh] rounded-3xl border flex flex-col shadow-2xl overflow-hidden",
          isDark
            ? "bg-[#080E1B] border-slate-800 text-white shadow-black/80"
            : "bg-white border-slate-200 text-slate-900 shadow-slate-300"
        )}
      >
        {/* Modal Header */}
        <div
          className={cn(
            "p-5 sm:p-6 border-b flex items-start justify-between gap-4 shrink-0",
            isDark ? "bg-[#0B1324] border-slate-800/80" : "bg-slate-50/80 border-slate-200"
          )}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Category Icon Bubble */}
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs shrink-0",
                isDark ? categoryStyle.iconBgDark : categoryStyle.iconBgLight
              )}
            >
              <MetaIcon className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "text-[10px] font-extrabold tracking-[0.18em] uppercase",
                    isDark ? "text-emerald-400" : "text-emerald-700"
                  )}
                >
                  ✦ CITY-WIDE DISCOVERY
                </span>
                {property?.city && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold",
                      isDark ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-slate-200 text-slate-700"
                    )}
                  >
                    {property.city}
                  </span>
                )}
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-medium hidden sm:inline-block",
                    isDark ? "text-slate-400 bg-slate-800/60" : "text-slate-500 bg-slate-100"
                  )}
                >
                  15 km radius
                </span>
              </div>
              <h3 className={cn("text-lg sm:text-xl font-black tracking-tight truncate", isDark ? "text-white" : "text-slate-900")}>
                {meta.title}
              </h3>
              <p className={cn("text-xs font-normal truncate", isDark ? "text-slate-400" : "text-slate-500")}>
                {meta.subtitle}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className={cn(
              "p-2 rounded-xl border transition-colors cursor-pointer shrink-0",
              isDark
                ? "bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white"
                : "bg-white hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subheader: Search Bar, Subcategories, and View Mode Toggle */}
        <div
          className={cn(
            "px-5 sm:px-6 py-3.5 border-b space-y-3 shrink-0",
            isDark ? "bg-[#091120] border-slate-800/60" : "bg-white border-slate-200"
          )}
        >
          {/* Top Control Bar: Search & View Toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${category === 'all' ? 'places' : category} in ${property?.city || 'the city'}...`}
                className={cn(
                  "w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium border transition-all focus:outline-none focus:ring-1",
                  isDark
                    ? "bg-slate-900/90 border-slate-700/80 text-white placeholder-slate-500 focus:border-emerald-500/60 focus:ring-emerald-500/30"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:ring-slate-300"
                )}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle + Found Count Badge */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {/* View Toggle */}
              <div
                className={cn(
                  "p-0.5 rounded-xl border flex items-center shrink-0",
                  isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
                )}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    viewMode === 'list'
                      ? isDark
                        ? "bg-slate-800 text-white shadow-xs"
                        : "bg-white text-slate-900 shadow-xs"
                      : isDark
                      ? "text-slate-400 hover:text-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <ListIcon className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    viewMode === 'map'
                      ? isDark
                        ? "bg-slate-800 text-white shadow-xs"
                        : "bg-white text-slate-900 shadow-xs"
                      : isDark
                      ? "text-slate-400 hover:text-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>City Map</span>
                </button>
              </div>

              {/* Found Count Badge */}
              <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
                <span className={cn(isDark ? "text-slate-400" : "text-slate-500")}>Found:</span>
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold",
                    isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-800"
                  )}
                >
                  {filteredPlaces.length} places
                </span>
              </div>
            </div>
          </div>

          {/* Subcategory Filter Chips (if multiple subcategories available) */}
          {availableSubcategories.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedSubcategory('all')}
                className={cn(
                  "px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0",
                  selectedSubcategory === 'all'
                    ? isDark
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                      : "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : isDark
                    ? "bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-300"
                    : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                )}
              >
                All ({places.length})
              </button>

              {availableSubcategories.map((sub) => (
                <button
                  key={sub.key}
                  type="button"
                  onClick={() => setSelectedSubcategory(sub.key)}
                  className={cn(
                    "px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
                    selectedSubcategory === sub.key
                      ? isDark
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                        : "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : isDark
                      ? "bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-300"
                      : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  )}
                >
                  <span>{sub.label}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-md text-[10px] font-mono",
                      selectedSubcategory === sub.key
                        ? "bg-white/20 text-white"
                        : isDark
                        ? "bg-slate-800 text-slate-400"
                        : "bg-slate-200 text-slate-600"
                    )}
                  >
                    {sub.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-grow space-y-5">
          {/* Missing Property Location */}
          {statusReason === 'LOCATION_UNAVAILABLE' && (
            <div
              className={cn(
                "p-8 rounded-2xl border text-center space-y-2.5",
                isDark ? "bg-slate-900/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
              )}
            >
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <MapPinOff className="w-5 h-5" />
              </div>
              <h4 className={cn("text-sm font-semibold", isDark ? "text-slate-200" : "text-slate-900")}>
                City places aren't available for this property yet
              </h4>
              <p className="text-xs max-w-md mx-auto text-slate-400">
                Property location coordinates are not configured or pending verification.
              </p>
            </div>
          )}

          {/* Provider Error / Retry */}
          {statusReason === 'PROVIDER_UNAVAILABLE' && errorMessage && (
            <div
              className={cn(
                "p-4 rounded-xl border text-xs flex flex-col sm:flex-row items-center justify-between gap-3",
                isDark ? "bg-slate-900/80 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
              )}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={fetchCityPlaces}
                disabled={loading}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 border",
                  isDark
                    ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
                    : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs"
                )}
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                <span>Try Again</span>
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-4 rounded-2xl border space-y-3 animate-pulse flex flex-col justify-between h-[210px]",
                    isDark ? "bg-[#0c1427] border-slate-800/80" : "bg-white border-slate-200"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className={cn("w-9 h-9 rounded-xl", isDark ? "bg-slate-800" : "bg-slate-200")} />
                      <div className={cn("w-14 h-4 rounded-md", isDark ? "bg-slate-800" : "bg-slate-200")} />
                    </div>
                    <div className={cn("w-3/4 h-4 rounded mt-3.5", isDark ? "bg-slate-800" : "bg-slate-200")} />
                    <div className={cn("w-1/2 h-3 rounded mt-2", isDark ? "bg-slate-800" : "bg-slate-200")} />
                  </div>
                  <div className={cn("w-full h-8 rounded-xl", isDark ? "bg-slate-800" : "bg-slate-200")} />
                </div>
              ))}
            </div>
          ) : statusReason !== 'LOCATION_UNAVAILABLE' && filteredPlaces.length === 0 ? (
            /* Empty State */
            <div
              className={cn(
                "p-10 rounded-2xl border text-center space-y-2.5",
                isDark ? "bg-slate-900/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
              )}
            >
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center bg-slate-800/60 text-slate-400 border border-slate-700">
                <Compass className="w-5 h-5" />
              </div>
              <h4 className={cn("text-sm font-semibold", isDark ? "text-slate-200" : "text-slate-900")}>
                No more places found in this area
              </h4>
              <p className="text-xs max-w-md mx-auto text-slate-400">
                {searchQuery
                  ? `No results matching "${searchQuery}". Try another search keyword.`
                  : `No additional ${category} locations were found within the wider search area.`}
              </p>
              {(searchQuery || selectedSubcategory !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSubcategory('all');
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer mt-2",
                    isDark
                      ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
                      : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs"
                  )}
                >
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          ) : statusReason !== 'LOCATION_UNAVAILABLE' ? (
            viewMode === 'map' ? (
              /* ── Interactive City Map View ── */
              <div className="space-y-3">
                <div
                  ref={mapContainerRef}
                  className="w-full h-[520px] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner relative z-0"
                />
                <p className={cn("text-[11px] text-center", isDark ? "text-slate-400" : "text-slate-500")}>
                  💡 Showing <b>{filteredPlaces.length}</b> places across the city. Click any marker to view details and navigate.
                </p>
              </div>
            ) : (
              /* ── 3-Column List View Grid ── */
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visiblePlaces.map((place) => {
                    const PlaceIcon = getCategoryIcon(place.category);
                    const subLabel = SUBCATEGORY_LABELS[place.subcategory] || place.subcategory?.replace(/_/g, ' ') || place.category.toUpperCase();
                    const style = CATEGORY_STYLES[place.category] || CATEGORY_STYLES.all;

                    const formattedDist = place.distance
                      ? (place.distance < 1000 ? `${place.distance} m` : `${(place.distance / 1000).toFixed(1)} km`)
                      : place.distanceText?.replace(/\s*from property/i, '').trim() || place.distanceText;

                    return (
                      <motion.div
                        key={place.id}
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className={cn(
                          "relative rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 h-full group shadow-xs hover:shadow-md",
                          isDark
                            ? cn(style.cardDarkBg, "text-white")
                            : "bg-white hover:bg-slate-50/80 border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)]"
                        )}
                      >
                        {/* Upper Content Area */}
                        <div className="flex-grow flex flex-col">
                          {/* Top Row: Category Icon + Badge */}
                          <div className="flex items-center justify-between">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs transition-transform duration-200 group-hover:scale-105",
                                isDark ? style.iconBgDark : style.iconBgLight
                              )}
                            >
                              <PlaceIcon className="w-4 h-4 stroke-[2.2]" />
                            </div>

                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border shadow-2xs",
                                isDark ? style.badgeDark : style.badgeLight
                              )}
                            >
                              {subLabel}
                            </span>
                          </div>

                          {/* Place Name & Address */}
                          <div className="mt-3.5 space-y-1">
                            <h4
                              title={place.name}
                              className={cn(
                                "text-sm sm:text-base font-bold truncate tracking-tight transition-colors group-hover:text-emerald-400 dark:group-hover:text-emerald-300",
                                isDark ? "text-slate-100" : "text-slate-900"
                              )}
                            >
                              {place.name}
                            </h4>
                            <p className={cn("text-xs truncate font-normal", isDark ? "text-slate-400" : "text-slate-500")}>
                              {place.address || `${subLabel} in area`}
                            </p>
                          </div>

                          {/* Distance Capsule */}
                          <div className="mt-auto pt-3.5">
                            <div
                              className={cn(
                                "w-full px-3 py-1.5 rounded-xl border flex items-center justify-between text-xs font-semibold",
                                isDark
                                  ? "bg-slate-900/80 border-slate-800/80 text-slate-300"
                                  : "bg-slate-100 border-slate-200 text-slate-700"
                              )}
                            >
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                                <span className={cn("font-bold text-xs", isDark ? "text-slate-200" : "text-slate-900")}>
                                  {formattedDist}
                                </span>
                              </div>
                              <span className={cn("font-normal text-[11px]", isDark ? "text-slate-400" : "text-slate-500")}>
                                from property
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Navigate Action Button */}
                        <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800/70">
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigatePlace) {
                                onNavigatePlace(place);
                              }
                            }}
                            aria-label={`Navigate to ${place.name}`}
                            className={cn(
                              "w-full py-2 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.98] group/btn",
                              isDark
                                ? style.navBtnDark
                                : "bg-slate-900 hover:bg-slate-800 border border-slate-900 text-white shadow-xs hover:shadow"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Navigation className="w-3.5 h-3.5 fill-current group-hover/btn:rotate-12 transition-transform" />
                              <span className="font-semibold tracking-wide">Navigate</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-white/80 group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 12)}
                      className={cn(
                        "inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]",
                        isDark
                          ? "bg-slate-800/95 hover:bg-slate-700/95 border-slate-700/80 text-slate-200 hover:text-white"
                          : "bg-slate-900 hover:bg-slate-800 border-slate-900 text-white shadow-xs"
                      )}
                    >
                      <span>
                        Load More Places ({filteredPlaces.length - visibleCount} remaining)
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

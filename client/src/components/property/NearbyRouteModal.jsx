import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Navigation,
  ExternalLink,
  MapPin,
  Clock,
  Car,
  AlertTriangle,
  Loader2,
  Building2,
  Compass,
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

// Custom origin marker icon (Emerald home)
const createOriginIcon = () =>
  L.divIcon({
    className: 'custom-origin-pin',
    html: `
      <div style="
        background: linear-gradient(135deg, #10b981, #059669);
        width: 34px;
        height: 34px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(16,185,129,0.5);
        border: 2px solid #ffffff;
      ">
        <div style="transform: rotate(45deg); color: white; font-size: 14px; font-weight: bold;">🏠</div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });

// Custom destination marker icon (Rose / Indigo target)
const createDestinationIcon = (category) => {
  const iconEmoji =
    category === 'transit'
      ? '🚆'
      : category === 'health'
      ? '🏥'
      : category === 'food'
      ? '🍽'
      : category === 'shopping'
      ? '🛍'
      : category === 'education'
      ? '🏫'
      : category === 'finance'
      ? '🏦'
      : '📍';

  return L.divIcon({
    className: 'custom-dest-pin',
    html: `
      <div style="
        background: linear-gradient(135deg, #f43f5e, #e11d48);
        width: 34px;
        height: 34px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(244,63,94,0.5);
        border: 2px solid #ffffff;
      ">
        <div style="transform: rotate(45deg); color: white; font-size: 14px;">${iconEmoji}</div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });
};

export default function NearbyRouteModal({ property, place, onClose }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState(null);
  const [errorNotice, setErrorNotice] = useState(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fetch route and draw Leaflet map
  useEffect(() => {
    if (!property?.location?.lat || !place?.latitude) return;

    let isMounted = true;
    setLoading(true);
    setErrorNotice(null);

    const originLat = Number(property.location.lat);
    const originLng = Number(property.location.lng);
    const destLat = Number(place.latitude);
    const destLng = Number(place.longitude);

    async function loadRoute() {
      try {
        const res = await nearbyService.getRoute(property._id, {
          destLat,
          destLng,
          destName: place.name,
        });

        if (!isMounted) return;

        const data = res?.data?.data || res?.data || res;
        const route = data?.route || {};
        setRouteInfo(route);

        if (route.fallbackNotice) {
          setErrorNotice(route.fallbackNotice);
        }

        // Initialize / Update Map
        renderRouteMap(originLat, originLng, destLat, destLng, route.geometry);
      } catch (err) {
        if (!isMounted) return;
        console.warn('[NearbyRouteModal] Route calculation notice:', err);
        setErrorNotice('Live driving route calculation is temporarily unavailable. Displaying straight-line map.');

        const fallbackGeometry = {
          type: 'LineString',
          coordinates: [
            [originLng, originLat],
            [destLng, destLat],
          ],
        };

        renderRouteMap(originLat, originLng, destLat, destLng, fallbackGeometry);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRoute();

    return () => {
      isMounted = false;
      cleanupMap();
    };
  }, [property, place]);

  const cleanupMap = () => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {
        // Ignore cleanup errors
      }
      mapInstanceRef.current = null;
    }
  };

  const renderRouteMap = (originLat, originLng, destLat, destLng, geometry) => {
    // Wait for DOM container
    setTimeout(() => {
      if (!mapContainerRef.current) return;

      // Clean up previous instance
      cleanupMap();

      if (mapContainerRef.current._leaflet_id) {
        delete mapContainerRef.current._leaflet_id;
      }

      try {
        const map = L.map(mapContainerRef.current, {
          scrollWheelZoom: false,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        // Add Origin Marker (Property)
        const originMarker = L.marker([originLat, originLng], {
          icon: createOriginIcon(),
        })
          .addTo(map)
          .bindPopup(`<b>${property.name}</b><br/><span style="font-size: 11px;">Starting Property</span>`);

        // Add Destination Marker (Nearby Place)
        const destMarker = L.marker([destLat, destLng], {
          icon: createDestinationIcon(place.category),
        })
          .addTo(map)
          .bindPopup(
            `<b>${place.name}</b><br/><span style="font-size: 11px;">${place.category.toUpperCase()} • ${place.distanceText}</span>`
          );

        // Draw Route Polyline
        let latlngs = [];
        if (geometry?.coordinates && Array.isArray(geometry.coordinates)) {
          latlngs = geometry.coordinates.map((coord) => [coord[1], coord[0]]); // [lat, lng]
        } else {
          latlngs = [
            [originLat, originLng],
            [destLat, destLng],
          ];
        }

        // Outer glow polyline
        L.polyline(latlngs, {
          color: '#059669',
          weight: 7,
          opacity: 0.35,
          lineCap: 'round',
        }).addTo(map);

        // Core route polyline
        L.polyline(latlngs, {
          color: '#10b981',
          weight: 4,
          opacity: 0.9,
          dashArray: routeInfo?.isRoadRoute === false ? '6, 8' : undefined,
        }).addTo(map);

        // Fit map bounds with padding
        const bounds = L.latLngBounds([
          [originLat, originLng],
          [destLat, destLng],
          ...latlngs,
        ]);
        map.fitBounds(bounds, { padding: [50, 50] });

        mapInstanceRef.current = map;
      } catch (err) {
        console.warn('[NearbyRouteModal] Map rendering warning:', err);
      }
    }, 50);
  };

  const originLat = property?.location?.lat;
  const originLng = property?.location?.lng;
  const destLat = place?.latitude;
  const destLng = place?.longitude;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "relative z-10 w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]",
          isDark
            ? "bg-[#06141B] border-emerald-500/30 text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]"
            : "bg-white border-slate-200 text-slate-900 shadow-2xl"
        )}
      >
        {/* Header */}
        <div className={cn(
          "p-5 sm:p-6 border-b flex items-center justify-between gap-4",
          isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-100 bg-slate-50/70"
        )}>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                isDark ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-emerald-100 border-emerald-300 text-emerald-800"
              )}>
                {place?.category || 'DESTINATION'}
              </span>
              <span className={cn("text-xs font-mono font-bold truncate", isDark ? "text-slate-400" : "text-slate-500")}>
                Route Navigation
              </span>
            </div>
            <h2 className={cn("text-lg sm:text-xl font-black truncate tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {place?.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close route modal"
            className={cn(
              "p-2 rounded-2xl border transition-all cursor-pointer shrink-0",
              isDark
                ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white"
                : "bg-white hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Origin / Destination / Metrics Strip */}
        <div className={cn(
          "p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b text-xs",
          isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50 border-slate-100"
        )}>
          {/* Origin Card */}
          <div className={cn(
            "p-3 rounded-2xl border flex items-center gap-2.5 min-w-0",
            isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"
          )}>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className={cn("text-[10px] font-black uppercase tracking-wider block", isDark ? "text-slate-400" : "text-slate-500")}>
                START (PROPERTY)
              </span>
              <p className={cn("font-bold truncate", isDark ? "text-white" : "text-slate-900")}>
                {property?.name}
              </p>
            </div>
          </div>

          {/* Road Distance Metric */}
          <div className={cn(
            "p-3 rounded-2xl border flex items-center gap-2.5",
            isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"
          )}>
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <span className={cn("text-[10px] font-black uppercase tracking-wider block", isDark ? "text-slate-400" : "text-slate-500")}>
                DISTANCE
              </span>
              <p className={cn("font-black text-sm", isDark ? "text-emerald-300" : "text-emerald-700")}>
                {routeInfo?.distanceText || place?.distanceText || 'Calculating...'}
              </p>
            </div>
          </div>

          {/* Travel Time Metric */}
          <div className={cn(
            "p-3 rounded-2xl border flex items-center gap-2.5",
            isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"
          )}>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className={cn("text-[10px] font-black uppercase tracking-wider block", isDark ? "text-slate-400" : "text-slate-500")}>
                EST. TRAVEL TIME
              </span>
              <p className={cn("font-black text-sm", isDark ? "text-cyan-300" : "text-cyan-700")}>
                {routeInfo?.durationText || '~Calculating...'}
              </p>
            </div>
          </div>
        </div>

        {/* Notice if fallback routing was used */}
        {errorNotice && (
          <div className={cn(
            "px-5 py-2.5 text-xs font-medium flex items-center gap-2 border-b",
            isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
          )}>
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Interactive Leaflet Route Map */}
        <div className="relative flex-1 min-h-[280px] sm:min-h-[340px] bg-slate-950">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950/60 backdrop-blur-xs">
              <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
              <span className="text-xs font-bold text-slate-300">Calculating driving route...</span>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />
        </div>

        {/* Footer Actions */}
        <div className={cn(
          "p-4 sm:p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3",
          isDark ? "border-slate-800 bg-slate-950/70" : "border-slate-100 bg-slate-50"
        )}>
          <span className={cn("text-xs font-medium text-center sm:text-left", isDark ? "text-slate-400" : "text-slate-600")}>
            Route calculated from property coordinates to destination.
          </span>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className={cn(
                "flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                isDark
                  ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
                  : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm"
              )}
            >
              Close
            </button>

            <a
              href={routeInfo?.mapsUrl || googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Open in Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

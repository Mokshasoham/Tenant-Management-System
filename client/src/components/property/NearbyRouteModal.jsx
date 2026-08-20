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

// Custom origin marker icon (Clean Emerald home pin)
const createOriginIcon = () =>
  L.divIcon({
    className: 'custom-origin-pin',
    html: `
      <div style="
        background: #059669;
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        border: 2px solid #ffffff;
      ">
        <div style="transform: rotate(45deg); color: white; font-size: 13px; font-weight: bold;">🏠</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
  });

// Custom destination marker icon (Clean Slate/Rose target pin)
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
        background: #e11d48;
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        border: 2px solid #ffffff;
      ">
        <div style="transform: rotate(45deg); color: white; font-size: 13px;">${iconEmoji}</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
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
    setTimeout(() => {
      if (!mapContainerRef.current) return;

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
        L.marker([originLat, originLng], {
          icon: createOriginIcon(),
        })
          .addTo(map)
          .bindPopup(`<b>${property.name}</b><br/><span style="font-size: 11px;">Starting Property</span>`);

        // Add Destination Marker (Nearby Place)
        L.marker([destLat, destLng], {
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

        // Clean road polyline
        L.polyline(latlngs, {
          color: '#0284C7',
          weight: 5,
          opacity: 0.85,
          dashArray: routeInfo?.isRoadRoute === false ? '5, 8' : undefined,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        // Fit map bounds with padding
        const bounds = L.latLngBounds([
          [originLat, originLng],
          [destLat, destLng],
          ...latlngs,
        ]);
        map.fitBounds(bounds, { padding: [45, 45] });

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={cn(
          "relative z-10 w-full max-w-2xl rounded-2xl border overflow-hidden flex flex-col max-h-[90vh] shadow-xl",
          isDark
            ? "bg-[#0A111E] border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        )}
      >
        {/* Header */}
        <div className={cn(
          "p-5 border-b flex items-center justify-between gap-4",
          isDark ? "border-slate-800 bg-[#080E18]" : "border-slate-100 bg-slate-50"
        )}>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
              )}>
                {place?.category || 'DESTINATION'}
              </span>
              <span className={cn("text-xs font-mono font-medium truncate", isDark ? "text-slate-400" : "text-slate-500")}>
                Route Navigation
              </span>
            </div>
            <h2 className={cn("text-base sm:text-lg font-semibold truncate tracking-tight", isDark ? "text-slate-100" : "text-slate-900")}>
              {place?.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close route modal"
            className={cn(
              "p-2 rounded-xl border transition-all cursor-pointer shrink-0",
              isDark
                ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white"
                : "bg-white hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Origin / Destination / Metrics Strip */}
        <div className={cn(
          "p-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 border-b text-xs",
          isDark ? "bg-[#070D16] border-slate-800/80" : "bg-slate-50 border-slate-100"
        )}>
          {/* Origin Card */}
          <div className={cn(
            "p-3 rounded-xl border flex items-center gap-2.5 min-w-0",
            isDark ? "bg-[#0B1320] border-slate-800" : "bg-white border-slate-200"
          )}>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider block", isDark ? "text-slate-400" : "text-slate-500")}>
                START (PROPERTY)
              </span>
              <p className={cn("font-medium truncate", isDark ? "text-slate-200" : "text-slate-900")}>
                {property?.name}
              </p>
            </div>
          </div>

          {/* Road Distance Metric */}
          <div className={cn(
            "p-3 rounded-xl border flex items-center gap-2.5",
            isDark ? "bg-[#0B1320] border-slate-800" : "bg-white border-slate-200"
          )}>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
              <Car className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className={cn("text-[10px] font-bold uppercase tracking-wider block", isDark ? "text-slate-400" : "text-slate-500")}>
                DISTANCE
              </span>
              <p className={cn("font-semibold text-xs", isDark ? "text-sky-300" : "text-sky-700")}>
                {routeInfo?.distanceText || place?.distanceText || 'Calculating...'}
              </p>
            </div>
          </div>

          {/* Travel Time Metric */}
          <div className={cn(
            "p-3 rounded-xl border flex items-center gap-2.5",
            isDark ? "bg-[#0B1320] border-slate-800" : "bg-white border-slate-200"
          )}>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className={cn("text-[10px] font-bold uppercase tracking-wider block", isDark ? "text-slate-400" : "text-slate-500")}>
                EST. TRAVEL TIME
              </span>
              <p className={cn("font-semibold text-xs", isDark ? "text-indigo-300" : "text-indigo-700")}>
                {routeInfo?.durationText || '~Calculating...'}
              </p>
            </div>
          </div>
        </div>

        {/* Notice if fallback routing was used */}
        {errorNotice && (
          <div className={cn(
            "px-4 py-2 text-xs font-medium flex items-center gap-2 border-b",
            isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
          )}>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Interactive Leaflet Route Map */}
        <div className="relative flex-1 min-h-[260px] sm:min-h-[320px] bg-slate-950">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950/60 backdrop-blur-xs">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              <span className="text-xs font-medium text-slate-300">Calculating route...</span>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />
        </div>

        {/* Footer Actions */}
        <div className={cn(
          "p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3",
          isDark ? "border-slate-800 bg-[#080E18]" : "border-slate-100 bg-slate-50"
        )}>
          <span className={cn("text-xs font-normal text-center sm:text-left", isDark ? "text-slate-400" : "text-slate-500")}>
            Route calculated from property coordinates to destination.
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className={cn(
                "flex-1 sm:flex-initial px-4 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                isDark
                  ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
                  : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs"
              )}
            >
              Close
            </button>

            <a
              href={routeInfo?.mapsUrl || googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer"
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

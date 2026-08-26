/**
 * InteractivePropertyMap — Leaflet Map Engine with Controlled Filtering & Two-Way Marker Sync
 * Supports:
 *  - Controlled or Uncontrolled Type Filter Pills (All, Apt, House, Commercial, Land)
 *  - Hierarchical Location Selector (State / City)
 *  - Missing Coordinate Validation
 *  - Marker ↔ Result Card 2-Way Selection & FlyTo
 *  - Dynamic Bounds Auto-fit
 *  - Theme-aware Tile Layer
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import handleViewPropertyNavigation from '../utils/propertyNavigationHelper';
import LocationFilterPopover from './property/LocationFilterPopover';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const TYPE_COLORS = {
    apartment: '#6366f1',
    house: '#10b981',
    commercial: '#f59e0b',
    land: '#8b5cf6',
    hostel: '#a855f7',
    pg: '#f43f5e',
    villa: '#10b981',
    shop: '#f59e0b',
};
const DEF_COLOR = '#6366f1';

const TYPE_PILLS = [
    { val: '', label: '🏠 All' },
    { val: 'apartment', label: '🏢 Apt' },
    { val: 'house', label: '🏡 House' },
    { val: 'commercial', label: '🏬 Commercial' },
    { val: 'land', label: '🌿 Land' },
];

function priceIcon(property, isSelected) {
    const propType = (property?.type || 'apartment').toLowerCase();
    const color = TYPE_COLORS[propType] || DEF_COLOR;
    const amount = property.rentAmount || 0;
    let priceLabel = '';
    if (amount >= 1000) {
        const kVal = amount / 1000;
        priceLabel = `₹${kVal % 1 === 0 ? kVal.toFixed(0) : kVal.toFixed(1)}k`;
    } else {
        priceLabel = `₹${amount}`;
    }

    return L.divIcon({
        className: 'custom-price-marker',
        iconAnchor: [30, 16],
        iconSize: [68, 34],
        html: `<div style="
      background:${color};
      color:white;
      padding:5px 10px;
      border-radius:20px;
      font-size:12px;
      font-weight:900;
      white-space:nowrap;
      border:${isSelected ? '3px solid #34d399' : '2px solid white'};
      box-shadow:${isSelected ? `0 0 0 4px rgba(52, 211, 153, 0.4), 0 6px 20px ${color}90` : '0 2px 10px rgba(0,0,0,0.35)'};
      transform:${isSelected ? 'scale(1.2)' : 'scale(1)'};
      transition:transform 0.2s ease, box-shadow 0.2s ease;
      cursor:pointer;
      font-family:Inter,system-ui,sans-serif;
      text-align:center;
    ">${priceLabel}</div>`,
    });
}

export default function InteractivePropertyMap({
    height = '100%',
    properties = [],
    loading = false,
    onBoundsChange,
    country,
    // Controlled props for Tenant Browse (falls back to internal state if omitted)
    typeFilter: controlledTypeFilter,
    onTypeFilterChange,
    stateFilter: controlledStateFilter,
    cityFilter: controlledCityFilter,
    onLocationChange,
    availableLocations,
    selectedPropertyId = null,
    onSelectProperty,
    onClearFilters,
}) {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const tileLayerRef = useRef(null);
    const markersRef = useRef({});
    const popupsRef = useRef({});

    // Fallback internal state if not controlled
    const [internalTypeFilter, setInternalTypeFilter] = useState('');
    const [internalStateFilter, setInternalStateFilter] = useState('');
    const [internalCityFilter, setInternalCityFilter] = useState('');
    const [hasMoved, setHasMoved] = useState(false);
    const pendingBoundsRef = useRef(null);

    const activeType = controlledTypeFilter !== undefined ? controlledTypeFilter : internalTypeFilter;
    const activeState = controlledStateFilter !== undefined ? controlledStateFilter : internalStateFilter;
    const activeCity = controlledCityFilter !== undefined ? controlledCityFilter : internalCityFilter;

    const handleTypeClick = (val) => {
        if (onTypeFilterChange) {
            onTypeFilterChange(val);
        } else {
            setInternalTypeFilter(val);
        }
    };

    const handleLocationChange = (loc) => {
        if (onLocationChange) {
            onLocationChange(loc);
        } else {
            setInternalStateFilter(loc.state || '');
            setInternalCityFilter(loc.city || '');
        }
    };

    // ── Init Leaflet Map Once ──
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            center: [20.5937, 78.9629], // Center of India
            zoom: 5,
            zoomControl: false,
        });

        const tileLayer = L.tileLayer(
            theme === 'dark'
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            }
        ).addTo(map);

        tileLayerRef.current = tileLayer;

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        map.on('moveend', () => {
            const b = map.getBounds();
            pendingBoundsRef.current = {
                north: b.getNorth(),
                south: b.getSouth(),
                east: b.getEast(),
                west: b.getWest(),
            };
            setHasMoved(true);
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
            tileLayerRef.current = null;
            markersRef.current = {};
            popupsRef.current = {};
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Update Tile Layer Theme ──
    useEffect(() => {
        if (tileLayerRef.current) {
            const url =
                theme === 'dark'
                    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            tileLayerRef.current.setUrl(url);
        }
    }, [theme]);

    // ── Update Markers When Properties / Selected Property Changes ──
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Filter properties that have valid numeric coordinates
        const validProperties = properties.filter((p) => {
            const lat = Number(p.location?.lat);
            const lng = Number(p.location?.lng);
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        });

        const currentMarkerIds = new Set(Object.keys(markersRef.current));
        const newPropertyIds = new Set(validProperties.map((p) => p._id || p.id));

        // Remove markers that are no longer in the filtered set
        currentMarkerIds.forEach((id) => {
            if (!newPropertyIds.has(id)) {
                if (markersRef.current[id]) {
                    markersRef.current[id].remove();
                    delete markersRef.current[id];
                }
                delete popupsRef.current[id];
            }
        });

        // Add or update markers
        validProperties.forEach((property) => {
            const propId = property._id || property.id;
            const lat = Number(property.location.lat);
            const lng = Number(property.location.lng);
            const isSelected = selectedPropertyId === propId;
            const color = TYPE_COLORS[(property.type || '').toLowerCase()] || DEF_COLOR;

            if (markersRef.current[propId]) {
                // Update icon style for selection
                markersRef.current[propId].setIcon(priceIcon(property, isSelected));
                if (isSelected) {
                    markersRef.current[propId].setZIndexOffset(1000);
                } else {
                    markersRef.current[propId].setZIndexOffset(0);
                }
                return;
            }

            const marker = L.marker([lat, lng], {
                icon: priceIcon(property, isSelected),
                zIndexOffset: isSelected ? 1000 : 0,
            }).addTo(map);

            // Create Popup Content
            const node = document.createElement('div');
            node.style.cssText = 'width:220px;font-family:Inter,system-ui,sans-serif;padding:4px;';
            node.innerHTML = `
        <div style="height:115px;border-radius:14px;overflow:hidden;margin-bottom:10px;background:#0f172a;position:relative;">
          ${
              property.images?.[0]
                  ? `<img src="${property.images[0]}" alt="${property.name}" style="width:100%;height:100%;object-fit:cover;">`
                  : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:32px;">🏠</div>`
          }
          <span style="position:absolute;top:6px;left:6px;background:${color};color:white;padding:3px 8px;border-radius:10px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${
              property.type || 'property'
          }</span>
          ${
              property.state
                  ? `<span style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.7);color:white;padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700;backdrop-filter:blur(4px);">📍 ${property.state}</span>`
                  : ''
          }
        </div>
        <p style="font-weight:900;margin:0 0 2px;font-size:13px;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${
            property.name
        }</p>
        <p style="font-size:11px;color:#64748b;margin:0 0 6px;font-weight:600;">📍 ${[
            property.city,
            property.state,
        ]
            .filter(Boolean)
            .join(', ')}</p>
        <div style="display:flex;align-items:center;justify-content:between;margin:0 0 8px;">
          <p style="color:${color};font-weight:900;font-size:16px;margin:0;">
            ₹${(property.rentAmount || 0).toLocaleString('en-IN')}
            <span style="font-size:10px;font-weight:600;color:#94a3b8;">/mo</span>
          </p>
        </div>
        <div style="display:flex;gap:10px;font-size:11px;color:#64748b;margin-bottom:10px;font-weight:600;">
          ${property.bedrooms != null ? `<span>🛏 ${property.bedrooms} Beds</span>` : ''}
          ${property.bathrooms != null ? `<span>🚿 ${property.bathrooms} Baths</span>` : ''}
        </div>
        <button id="cta-${propId}" style="width:100%;padding:9px;border-radius:12px;background:linear-gradient(to right, #059669, #0d9488);color:white;border:none;font-weight:900;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;cursor:pointer;box-shadow:0 4px 12px rgba(5,150,105,0.3);transition:transform 0.1s ease;">View Property Details →</button>
      `;

            const popup = L.popup({ maxWidth: 240, closeButton: true }).setContent(node);
            marker.bindPopup(popup);

            marker.on('click', () => {
                if (onSelectProperty) {
                    onSelectProperty(propId);
                }
            });

            marker.on('popupopen', () => {
                const btn = document.getElementById(`cta-${propId}`);
                if (btn) {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        handleViewPropertyNavigation({ navigate, property });
                    };
                }
            });

            markersRef.current[propId] = marker;
            popupsRef.current[propId] = popup;
        });

        // ── Auto-adjust Viewport to Fit Valid Properties ──
        if (validProperties.length > 1) {
            const bounds = L.latLngBounds(
                validProperties.map((p) => [Number(p.location.lat), Number(p.location.lng)])
            );
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true });
        } else if (validProperties.length === 1) {
            const singleLat = Number(validProperties[0].location.lat);
            const singleLng = Number(validProperties[0].location.lng);
            map.setView([singleLat, singleLng], 13, { animate: true });
        }
    }, [properties, selectedPropertyId, onSelectProperty, navigate]);

    // ── Handle Card Selection → Pan Map & Open Popup ──
    useEffect(() => {
        if (!selectedPropertyId || !mapRef.current) return;
        const marker = markersRef.current[selectedPropertyId];
        if (marker) {
            const latLng = marker.getLatLng();
            mapRef.current.flyTo(latLng, 14, { duration: 0.8 });
            marker.openPopup();
        }
    }, [selectedPropertyId]);

    const searchArea = useCallback(() => {
        if (!pendingBoundsRef.current) return;
        setHasMoved(false);
        if (onBoundsChange) onBoundsChange(pendingBoundsRef.current);
        pendingBoundsRef.current = null;
    }, [onBoundsChange]);

    return (
        <div className="relative w-full h-full min-h-[480px]">
            {/* ── TOP OVERLAY: Quick Type Pills + Hierarchical Location Filter ── */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2 pointer-events-auto max-w-[95%]">
                {/* Property Type Pills */}
                <div className="flex items-center gap-1.5 flex-wrap justify-center p-1 rounded-full bg-background/80 backdrop-blur-md border border-border/80 shadow-lg">
                    {TYPE_PILLS.map(({ val, label }) => {
                        const active = activeType === val;
                        const color = val ? TYPE_COLORS[val] || DEF_COLOR : '#6366f1';
                        return (
                            <button
                                key={val}
                                type="button"
                                onClick={() => handleTypeClick(val)}
                                className="px-3.5 py-1.5 rounded-full font-black text-xs transition-all duration-200 cursor-pointer shadow-sm flex items-center gap-1 border"
                                style={{
                                    backgroundColor: active ? color : 'transparent',
                                    borderColor: active ? color : 'transparent',
                                    color: active ? '#ffffff' : 'inherit',
                                    boxShadow: active ? `0 4px 14px ${color}50` : 'none',
                                }}
                            >
                                <span>{label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Hierarchical State / City Selector Popover */}
                <LocationFilterPopover
                    stateFilter={activeState}
                    cityFilter={activeCity}
                    availableLocations={availableLocations}
                    onLocationChange={handleLocationChange}
                    onClear={onClearFilters}
                />
            </div>

            {/* ── "Search this area" Button ── */}
            {hasMoved && (
                <button
                    type="button"
                    onClick={searchArea}
                    className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[1000] px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-2xl shadow-indigo-600/50 border border-white/20 transition-all cursor-pointer"
                >
                    🔍 Search this area
                </button>
            )}

            {/* ── Bottom-Left Count Badge (Strictly Synchronized with Results) ── */}
            <div className="absolute bottom-4 left-4 z-[1000] px-4 py-1.5 rounded-full bg-background/90 text-foreground font-black text-xs uppercase tracking-wider backdrop-blur-md border border-border shadow-lg">
                {loading ? 'Loading…' : `${properties.length} ${properties.length === 1 ? 'property' : 'properties'}`}
            </div>

            {/* ── Leaflet Container ── */}
            <div ref={containerRef} className="w-full h-full min-h-[480px]" />
        </div>
    );
}

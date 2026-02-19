/**
 * InteractivePropertyMap — Vanilla Leaflet + State/Area filter overlay
 * Features:
 *  - Type filter pills (All, Apt, House, Commercial, Land)
 *  - State/Area selector dropdown → zooms map + filters markers
 *  - "Search this area" button after pan/zoom
 *  - Price markers → popup with property detail card
 *  - Area info panel when a state is selected
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';

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
};
const DEF = '#3b82f6';

const TYPE_PILLS = [
    { val: '', label: '🏠 All' },
    { val: 'apartment', label: '🏢 Apt' },
    { val: 'house', label: '🏡 House' },
    { val: 'commercial', label: '🏬 Commercial' },
    { val: 'land', label: '🌿 Land' },
];

// Major Indian state centers [lat, lng, zoom]
const STATE_COORDS = {
    'Andhra Pradesh': [15.9129, 79.7400, 7],
    'Arunachal Pradesh': [28.2180, 94.7278, 7],
    'Assam': [26.2006, 92.9376, 7],
    'Bihar': [25.0961, 85.3131, 7],
    'Chhattisgarh': [21.2787, 81.8661, 7],
    'Goa': [15.2993, 74.1240, 10],
    'Gujarat': [22.2587, 71.1924, 7],
    'Haryana': [29.0588, 76.0856, 8],
    'Himachal Pradesh': [31.1048, 77.1734, 8],
    'Jharkhand': [23.6102, 85.2799, 7],
    'Karnataka': [15.3173, 75.7139, 7],
    'Kerala': [10.8505, 76.2711, 7],
    'Madhya Pradesh': [22.9734, 78.6569, 7],
    'Maharashtra': [19.7515, 75.7139, 7],
    'Manipur': [24.6637, 93.9063, 8],
    'Meghalaya': [25.4670, 91.3662, 8],
    'Mizoram': [23.1645, 92.9376, 8],
    'Nagaland': [26.1584, 94.5624, 8],
    'Odisha': [20.9517, 85.0985, 7],
    'Punjab': [31.1471, 75.3412, 8],
    'Rajasthan': [27.0238, 74.2179, 7],
    'Sikkim': [27.5330, 88.5122, 9],
    'Tamil Nadu': [11.1271, 78.6569, 7],
    'Telangana': [18.1124, 79.0193, 7],
    'Tripura': [23.9408, 91.9882, 9],
    'Uttar Pradesh': [26.8467, 80.9462, 7],
    'Uttarakhand': [30.0668, 79.0193, 8],
    'West Bengal': [22.9868, 87.8550, 7],
    'Delhi': [28.7041, 77.1025, 11],
    'Chandigarh': [30.7333, 76.7794, 12],
    'Jammu & Kashmir': [33.7782, 76.5762, 7],
    'Puducherry': [11.9416, 79.8083, 10],
    'Mumbai': [19.0760, 72.8777, 12],
    'Bengaluru': [12.9716, 77.5946, 12],
    'Chennai': [13.0827, 80.2707, 12],
    'Hyderabad': [17.3850, 78.4867, 12],
    'Kolkata': [22.5726, 88.3639, 12],
    'Ahmedabad': [23.0225, 72.5714, 12],
    'Jaipur': [26.9124, 75.7873, 12],
    'Pune': [18.5204, 73.8567, 12],
};

const INDIA_STATES = Object.keys(STATE_COORDS);

function priceIcon(property, selected) {
    const color = TYPE_COLORS[property.type] || DEF;
    const price = ((property.rentAmount || 0) / 1000).toFixed(0);
    return L.divIcon({
        className: '',
        iconAnchor: [28, 18],
        html: `<div style="
      background:${color};color:white;padding:5px 10px;border-radius:20px;
      font-size:12px;font-weight:800;white-space:nowrap;border:2px solid white;
      box-shadow:${selected ? `0 4px 20px ${color}80,0 2px 8px rgba(0,0,0,0.6)` : '0 2px 8px rgba(0,0,0,0.3)'};
      transform:${selected ? 'scale(1.25)' : 'scale(1)'};cursor:pointer;font-family:Inter,sans-serif;
    ">₹${price}k</div>`,
    });
}

const S = {
    overlay: {
        position: 'absolute', zIndex: 1000, pointerEvents: 'auto',
    },
    pill: (active, color) => ({
        padding: '6px 13px', borderRadius: 20, cursor: 'pointer', fontWeight: 800, fontSize: 12,
        border: `2px solid ${active ? color : 'rgba(255,255,255,0.45)'}`,
        background: active ? color : 'rgba(255,255,255,0.9)',
        color: active ? 'white' : '#1e293b',
        boxShadow: active ? `0 4px 16px ${color}60` : '0 2px 8px rgba(0,0,0,0.12)',
        transition: 'all 0.18s',
    }),
};

export default function InteractivePropertyMap({
    height = '100%',
    properties = [],
    loading = false,
    onBoundsChange,
}) {
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef({});

    const [typeFilter, setTypeFilter] = useState('');
    const [stateFilter, setStateFilter] = useState('');
    const [hasMoved, setHasMoved] = useState(false);
    const [count, setCount] = useState(0);
    const [areaProps, setAreaProps] = useState([]);  // properties in selected state
    const [showAreaPanel, setShowAreaPanel] = useState(false);
    const pendingBoundsRef = useRef(null);

    // ── Init map once ──
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            center: [20.5937, 78.9629], // Center of India
            zoom: 5,
            zoomControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        map.on('moveend', () => {
            const b = map.getBounds();
            pendingBoundsRef.current = {
                north: b.getNorth(), south: b.getSouth(),
                east: b.getEast(), west: b.getWest(),
            };
            setHasMoved(true);
        });

        // Fire initial bounds
        setTimeout(() => {
            const b = map.getBounds();
            if (onBoundsChange) onBoundsChange({
                north: b.getNorth(), south: b.getSouth(),
                east: b.getEast(), west: b.getWest(),
            });
        }, 400);

        mapRef.current = map;
        return () => { map.remove(); mapRef.current = null; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Update markers when properties/typeFilter change ──
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const visible = typeFilter ? properties.filter(p => p.type === typeFilter) : properties;
        setCount(visible.length);

        // Remove stale
        const existIds = new Set(Object.keys(markersRef.current));
        const newIds = new Set(visible.map(p => p._id));
        existIds.forEach(id => {
            if (!newIds.has(id)) { markersRef.current[id].remove(); delete markersRef.current[id]; }
        });

        // Add new
        visible.forEach(property => {
            if (markersRef.current[property._id]) return;

            const lat = property.location?.lat || 12.9716;
            const lng = property.location?.lng || 77.5946;
            const color = TYPE_COLORS[property.type] || DEF;

            const marker = L.marker([lat, lng], { icon: priceIcon(property, false) }).addTo(map);

            const node = document.createElement('div');
            node.style.cssText = 'width:210px;font-family:Inter,system-ui,sans-serif;';
            node.innerHTML = `
        <div style="height:110px;border-radius:12px;overflow:hidden;margin-bottom:10px;background:#1e293b;position:relative;">
          ${property.images?.[0]
                    ? `<img src="${property.images[0]}" alt="${property.name}" style="width:100%;height:100%;object-fit:cover;">`
                    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:32px;">🏠</div>`}
          <span style="position:absolute;top:6px;left:6px;background:${color};color:white;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:800;text-transform:uppercase;">${property.type || 'property'}</span>
          ${property.state ? `<span style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.6);color:white;padding:2px 7px;border-radius:12px;font-size:9px;font-weight:700;">📍 ${property.state}</span>` : ''}
        </div>
        <p style="font-weight:800;margin:0 0 2px;font-size:13px;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${property.name}</p>
        <p style="font-size:11px;color:#64748b;margin:0 0 6px;">📍 ${[property.city, property.state].filter(Boolean).join(', ')}</p>
        <p style="color:${color};font-weight:800;font-size:17px;margin:0 0 8px;">
          ₹${(property.rentAmount || 0).toLocaleString('en-IN')}
          <span style="font-size:10px;font-weight:600;color:#94a3b8;">/mo</span>
        </p>
        <div style="display:flex;gap:10px;font-size:11px;color:#64748b;margin-bottom:10px;">
          ${property.bedrooms != null ? `<span>🛏 ${property.bedrooms}</span>` : ''}
          ${property.bathrooms != null ? `<span>🚿 ${property.bathrooms}</span>` : ''}
          ${property.squareFeet ? `<span>📐 ${property.squareFeet}sqft</span>` : ''}
        </div>
        <button id="cta-${property._id}" style="width:100%;padding:8px;border-radius:10px;background:${color};color:white;border:none;font-weight:800;font-size:12px;cursor:pointer;">View Details →</button>
      `;

            const popup = L.popup({ maxWidth: 220, closeButton: true }).setContent(node);
            marker.bindPopup(popup);
            marker.on('popupopen', () => {
                const btn = document.getElementById(`cta-${property._id}`);
                if (btn) btn.onclick = () => navigate(`/properties/${property._id}`);
            });

            markersRef.current[property._id] = marker;
        });
    }, [properties, typeFilter, navigate]);

    // ── State filter → zoom map + set area panel ──
    useEffect(() => {
        if (!stateFilter) { setAreaProps([]); setShowAreaPanel(false); return; }
        const coords = STATE_COORDS[stateFilter];
        if (coords && mapRef.current) {
            mapRef.current.setView([coords[0], coords[1]], coords[2], { animate: true });
        }
        // Filter properties matching selected state
        const matching = properties.filter(p =>
            (p.state || '').toLowerCase() === stateFilter.toLowerCase() ||
            (p.city || '').toLowerCase() === stateFilter.toLowerCase()
        );
        setAreaProps(matching);
        setShowAreaPanel(true);
    }, [stateFilter, properties]);

    const searchArea = useCallback(() => {
        if (!pendingBoundsRef.current) return;
        setHasMoved(false);
        if (onBoundsChange) onBoundsChange(pendingBoundsRef.current);
        pendingBoundsRef.current = null;
    }, [onBoundsChange]);

    const avgRent = areaProps.length > 0
        ? Math.round(areaProps.reduce((s, p) => s + (p.rentAmount || 0), 0) / areaProps.length)
        : 0;

    return (
        <div style={{ position: 'relative', width: '100%', height, minHeight: 480 }}>

            {/* ── Top: Type pills + State selector ── */}
            <div style={{ ...S.overlay, top: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                {/* Type pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {TYPE_PILLS.map(({ val, label }) => {
                        const active = typeFilter === val;
                        const color = val ? (TYPE_COLORS[val] || DEF) : '#6366f1';
                        return (
                            <button key={val} onClick={() => setTypeFilter(val)} style={S.pill(active, color)}>{label}</button>
                        );
                    })}
                </div>

                {/* State/Area selector */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={stateFilter}
                        onChange={e => setStateFilter(e.target.value)}
                        style={{
                            padding: '7px 36px 7px 14px', borderRadius: 20, border: '2px solid rgba(255,255,255,0.4)',
                            background: stateFilter ? '#6366f1' : 'rgba(255,255,255,0.92)',
                            color: stateFilter ? 'white' : '#1e293b',
                            fontWeight: 800, fontSize: 12, cursor: 'pointer', appearance: 'none',
                            boxShadow: stateFilter ? '0 4px 16px rgba(99,102,241,0.5)' : '0 2px 8px rgba(0,0,0,0.12)',
                            minWidth: 180,
                        }}
                    >
                        <option value="">📍 Select State / City</option>
                        <optgroup label="── States ──" style={{ background: '#1e293b', color: '#94a3b8' }}>
                            {INDIA_STATES.filter(s => !['Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Pune'].includes(s)).map(s => (
                                <option key={s} value={s} style={{ background: '#1e293b' }}>{s}</option>
                            ))}
                        </optgroup>
                        <optgroup label="── Major Cities ──" style={{ background: '#1e293b', color: '#94a3b8' }}>
                            {['Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Pune'].map(c => (
                                <option key={c} value={c} style={{ background: '#1e293b' }}>{c}</option>
                            ))}
                        </optgroup>
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: stateFilter ? 'rgba(255,255,255,0.7)' : '#64748b', fontSize: 10 }}>▼</span>
                </div>
            </div>

            {/* ── Area Detail Panel (shown when state selected) ── */}
            {showAreaPanel && stateFilter && (
                <div style={{
                    ...S.overlay, top: 12, right: 12,
                    background: 'rgba(15,15,30,0.92)', backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20,
                    padding: 16, width: 260, maxHeight: 'calc(100% - 80px)', overflowY: 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3 style={{ fontWeight: 900, fontSize: 14, color: 'white', margin: 0 }}>📍 {stateFilter}</h3>
                        <button onClick={() => { setStateFilter(''); setShowAreaPanel(false); }}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                        {[
                            { label: 'Properties', value: areaProps.length, color: '#6366f1' },
                            { label: 'Avg Rent', value: avgRent > 0 ? `₹${(avgRent / 1000).toFixed(0)}k` : '—', color: '#10b981' },
                        ].map(({ label, value, color }) => (
                            <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
                                <p style={{ fontWeight: 900, fontSize: 20, color, margin: 0 }}>{value}</p>
                                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: 700, textTransform: 'uppercase' }}>{label}</p>
                            </div>
                        ))}
                    </div>

                    {areaProps.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.3)' }}>
                            <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                            <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>No properties listed here yet</p>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Pan the map to search all areas</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {areaProps.map(p => {
                                const color = TYPE_COLORS[p.type] || DEF;
                                return (
                                    <div key={p._id} onClick={() => navigate(`/properties/${p._id}`)}
                                        style={{ display: 'flex', gap: 10, padding: 10, borderRadius: 14, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                    >
                                        <div style={{ width: 60, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.04)' }}>
                                            {p.images?.[0]
                                                ? <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏠</div>}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <span style={{ background: color, color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 8, textTransform: 'uppercase' }}>{p.type}</span>
                                            <p style={{ fontWeight: 800, fontSize: 12, color: 'white', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                                            <p style={{ fontWeight: 800, fontSize: 13, color, margin: '2px 0 0' }}>₹{(p.rentAmount || 0).toLocaleString('en-IN')}<span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>/mo</span></p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── "Search this area" ── */}
            {hasMoved && !showAreaPanel && (
                <button onClick={searchArea} style={{
                    ...S.overlay, bottom: 56, left: '50%', transform: 'translateX(-50%)',
                    padding: '10px 22px', borderRadius: 24, border: 'none',
                    background: '#6366f1', color: 'white', fontWeight: 800, fontSize: 13,
                    cursor: 'pointer', boxShadow: '0 4px 24px rgba(99,102,241,0.6)',
                }}>
                    🔍 Search this area
                </button>
            )}

            {/* ── Count badge ── */}
            <div style={{
                ...S.overlay, bottom: 18, left: 16,
                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800, color: '#1e293b',
                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            }}>
                {loading ? '⏳ Loading…' : `${count} ${count === 1 ? 'property' : 'properties'}`}
            </div>

            {/* ── Map div ── */}
            <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 480 }} />
        </div>
    );
}

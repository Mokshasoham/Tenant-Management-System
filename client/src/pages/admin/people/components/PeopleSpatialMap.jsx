import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../../utils/cn';

export default function PeopleSpatialMap({
  properties = [],
  tenants = [],
  managers = [],
  technicians = [],
  onInspectPerson,
  theme,
}) {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef([]);

  // Layer Visibility Toggles
  const [layers, setLayers] = useState({
    properties: true,
    tenants: true,
    managers: true,
    technicians: true,
    risk: true,
  });

  // 1. Dynamic Light/Dark Tile Layer Swapping
  useEffect(() => {
    const tileUrl = theme === 'light'
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(tileUrl);
    }
  }, [theme]);

  // 2. Map Initialization & Marker Clustering Setup
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [20.5937, 78.9629],
        zoom: 5,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const tileUrl = theme === 'light'
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

      const tileLayer = L.tileLayer(tileUrl, {
        attribution: '&copy; CartoDB &copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      tileLayerRef.current = tileLayer;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds();
    let hasPoints = false;

    // 🟣 MANAGERS
    if (layers.managers) {
      managers.forEach((m) => {
        if (typeof m.lat === 'number' && typeof m.lng === 'number') {
          bounds.extend([m.lat, m.lng]);
          hasPoints = true;
          const icon = L.divIcon({
            className: 'custom-people-marker',
            html: `
              <div style="
                background: #a855f7;
                color: #ffffff;
                font-weight: 900;
                font-size: 10px;
                padding: 4px 8px;
                border-radius: 9999px;
                border: 2px solid #ffffff;
                box-shadow: 0 8px 20px rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
              ">
                <span>🟣</span> ${m.name}
              </div>
            `,
            iconSize: [110, 26],
            iconAnchor: [55, 13],
          });
          const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
          marker.bindPopup(`
            <div style="font-family: sans-serif; padding: 4px; min-width: 140px;">
              <h4 style="margin: 0; font-size: 12px; font-weight: 900; color: #7e22ce;">🟣 ${m.name}</h4>
              <p style="margin: 4px 0; font-size: 10px; color: #64748b;">Manager · ${m.managedPropertiesCount || 0} Managed Properties</p>
              <button id="inspect-mgr-${m.id || m.rawId}" style="margin-top: 6px; width: 100%; padding: 4px; background: #7e22ce; color: #fff; border: none; border-radius: 6px; font-size: 10px; font-weight: 800; cursor: pointer;">View Portfolio →</button>
            </div>
          `);
          marker.on('popupopen', () => {
            const btn = document.getElementById(`inspect-mgr-${m.id || m.rawId}`);
            if (btn) btn.onclick = () => onInspectPerson && onInspectPerson(m);
          });
          markersRef.current.push(marker);
        }
      });
    }

    // 🔵 TENANTS
    if (layers.tenants) {
      tenants.forEach((t) => {
        if (typeof t.lat === 'number' && typeof t.lng === 'number') {
          bounds.extend([t.lat, t.lng]);
          hasPoints = true;
          const icon = L.divIcon({
            className: 'custom-people-marker',
            html: `
              <div style="
                background: #3b82f6;
                color: #ffffff;
                font-weight: 900;
                font-size: 10px;
                padding: 4px 8px;
                border-radius: 9999px;
                border: 2px solid #ffffff;
                box-shadow: 0 8px 20px rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
              ">
                <span>🔵</span> ${t.name}
              </div>
            `,
            iconSize: [110, 26],
            iconAnchor: [55, 13],
          });
          const marker = L.marker([t.lat, t.lng], { icon }).addTo(map);
          marker.bindPopup(`
            <div style="font-family: sans-serif; padding: 4px; min-width: 140px;">
              <h4 style="margin: 0; font-size: 12px; font-weight: 900; color: #1d4ed8;">🔵 ${t.name}</h4>
              <p style="margin: 4px 0; font-size: 10px; color: #64748b;">${t.propertyName || 'Property Location'} · ${t.unit || 'Unit N/A'}</p>
              <button id="inspect-tenant-${t.id || t.rawId}" style="margin-top: 6px; width: 100%; padding: 4px; background: #1d4ed8; color: #fff; border: none; border-radius: 6px; font-size: 10px; font-weight: 800; cursor: pointer;">View Profile →</button>
            </div>
          `);
          marker.on('popupopen', () => {
            const btn = document.getElementById(`inspect-tenant-${t.id || t.rawId}`);
            if (btn) btn.onclick = () => onInspectPerson && onInspectPerson(t);
          });
          markersRef.current.push(marker);
        }
      });
    }

    // 🟢 TECHNICIANS
    if (layers.technicians) {
      technicians.forEach((tech) => {
        if (typeof tech.lat === 'number' && typeof tech.lng === 'number') {
          bounds.extend([tech.lat, tech.lng]);
          hasPoints = true;
          const icon = L.divIcon({
            className: 'custom-people-marker',
            html: `
              <div style="
                background: #10b981;
                color: #ffffff;
                font-weight: 900;
                font-size: 10px;
                padding: 4px 8px;
                border-radius: 9999px;
                border: 2px solid #ffffff;
                box-shadow: 0 8px 20px rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
              ">
                <span>🟢</span> ${tech.name}
              </div>
            `,
            iconSize: [110, 26],
            iconAnchor: [55, 13],
          });
          const marker = L.marker([tech.lat, tech.lng], { icon }).addTo(map);
          marker.bindPopup(`
            <div style="font-family: sans-serif; padding: 4px; min-width: 140px;">
              <h4 style="margin: 0; font-size: 12px; font-weight: 900; color: #047857;">🟢 ${tech.name}</h4>
              <p style="margin: 4px 0; font-size: 10px; color: #64748b;">${tech.specialty || 'Field Tech'} · ${tech.dispatchStatus}</p>
              <button id="inspect-tech-${tech.id || tech.rawId}" style="margin-top: 6px; width: 100%; padding: 4px; background: #047857; color: #fff; border: none; border-radius: 6px; font-size: 10px; font-weight: 800; cursor: pointer;">View Profile →</button>
            </div>
          `);
          marker.on('popupopen', () => {
            const btn = document.getElementById(`inspect-tech-${tech.id || tech.rawId}`);
            if (btn) btn.onclick = () => onInspectPerson && onInspectPerson(tech);
          });
          markersRef.current.push(marker);
        }
      });
    }

    // 🏠 PROPERTIES
    if (layers.properties) {
      properties.forEach((p) => {
        const lat = p.location?.lat || p.lat;
        const lng = p.location?.lng || p.lng;
        if (typeof lat === 'number' && typeof lng === 'number') {
          bounds.extend([lat, lng]);
          hasPoints = true;
          const icon = L.divIcon({
            className: 'custom-people-marker',
            html: `
              <div style="
                background: #6366f1;
                color: #ffffff;
                font-weight: 900;
                font-size: 10px;
                padding: 4px 8px;
                border-radius: 9999px;
                border: 2px solid #ffffff;
                box-shadow: 0 8px 20px rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
              ">
                <span>🏠</span> ${p.name}
              </div>
            `,
            iconSize: [110, 26],
            iconAnchor: [55, 13],
          });
          const marker = L.marker([lat, lng], { icon }).addTo(map);
          marker.bindPopup(`
            <div style="font-family: sans-serif; padding: 4px; min-width: 140px;">
              <h4 style="margin: 0; font-size: 12px; font-weight: 900; color: #4338ca;">🏠 ${p.name}</h4>
              <p style="margin: 4px 0; font-size: 10px; color: #64748b;">📍 ${p.city || 'Location'} · ${p.address || ''}</p>
              <button id="inspect-prop-${p._id}" style="margin-top: 6px; width: 100%; padding: 4px; background: #4338ca; color: #fff; border: none; border-radius: 6px; font-size: 10px; font-weight: 800; cursor: pointer;">View Property →</button>
            </div>
          `);
          marker.on('popupopen', () => {
            const btn = document.getElementById(`inspect-prop-${p._id}`);
            if (btn) btn.onclick = () => navigate(`/admin/property/${p._id}`);
          });
          markersRef.current.push(marker);
        }
      });
    }

    // Auto-fit bounds over real coordinates
    if (hasPoints) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [layers, properties, tenants, managers, technicians, theme, onInspectPerson, navigate]);

  const toggleLayer = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={cn(
      "h-[420px] w-full rounded-[2.25rem] border shadow-2xl relative transition-all backdrop-blur-2xl overflow-hidden",
      theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
    )}>
      {/* Interactive Layer Toggles Bar */}
      <div className="absolute top-4 right-4 z-[400] flex flex-wrap gap-1.5 p-1.5 rounded-full border shadow-xl backdrop-blur-2xl bg-slate-900/90 border-white/10">
        {[
          { key: 'properties', label: 'Properties', icon: '🏠', color: 'bg-indigo-500/20 text-indigo-400' },
          { key: 'tenants', label: 'Tenants', icon: '🔵', color: 'bg-blue-500/20 text-blue-400' },
          { key: 'managers', label: 'Managers', icon: '🟣', color: 'bg-purple-500/20 text-purple-400' },
          { key: 'technicians', label: 'Technicians', icon: '🟢', color: 'bg-emerald-500/20 text-emerald-400' },
          { key: 'risk', label: 'Risk', icon: '🔴', color: 'bg-rose-500/20 text-rose-400' },
        ].map((layer) => {
          const isActive = layers[layer.key];
          return (
            <button
              key={layer.key}
              onClick={() => toggleLayer(layer.key)}
              className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer flex items-center gap-1.5 border",
                isActive
                  ? `${layer.color} border-white/20 shadow-sm`
                  : "bg-slate-800/40 text-slate-500 border-transparent opacity-60"
              )}
            >
              <span>{layer.icon}</span> {layer.label}
            </button>
          );
        })}
      </div>

      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
}

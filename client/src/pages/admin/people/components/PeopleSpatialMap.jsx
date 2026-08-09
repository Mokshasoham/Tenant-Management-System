import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '../../../../utils/cn';

export default function PeopleSpatialMap({
  properties = [],
  tenants = [],
  managers = [],
  technicians = [],
  onInspectPerson,
  theme,
}) {
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

    // 🟣 MANAGERS
    if (layers.managers) {
      managers.forEach((m) => {
        if (m.lat && m.lng) {
          bounds.extend([m.lat, m.lng]);
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
          marker.on('click', () => onInspectPerson && onInspectPerson(m));
          markersRef.current.push(marker);
        }
      });
    }

    // 🔵 TENANTS
    if (layers.tenants) {
      tenants.forEach((t) => {
        if (t.lat && t.lng) {
          bounds.extend([t.lat, t.lng]);
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
          marker.on('click', () => onInspectPerson && onInspectPerson(t));
          markersRef.current.push(marker);
        }
      });
    }

    // 🟢 TECHNICIANS
    if (layers.technicians) {
      technicians.forEach((tech) => {
        if (tech.lat && tech.lng) {
          bounds.extend([tech.lat, tech.lng]);
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
          marker.on('click', () => onInspectPerson && onInspectPerson(tech));
          markersRef.current.push(marker);
        }
      });
    }

    // 🏠 PROPERTIES
    if (layers.properties) {
      properties.forEach((p) => {
        if (p.lat && p.lng) {
          bounds.extend([p.lat, p.lng]);
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
            iconSize: [120, 26],
            iconAnchor: [60, 13],
          });
          const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);
          markersRef.current.push(marker);
        }
      });
    }

    if (markersRef.current.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [properties, tenants, managers, technicians, layers]);

  return (
    <div className={cn(
      "h-[420px] w-full rounded-[2.25rem] overflow-hidden border shadow-2xl relative transition-all backdrop-blur-2xl",
      theme === 'light' ? "bg-slate-100 border-slate-200" : "bg-[#0c0d15] border-white/10"
    )}>
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Layer Toggle Control Overlay */}
      <div className={cn(
        "absolute top-3 right-3 z-20 p-2.5 rounded-2xl border text-[11px] font-bold flex flex-wrap items-center gap-2 shadow-2xl backdrop-blur-2xl",
        theme === 'light' ? "bg-white/90 border-slate-200 text-slate-800" : "bg-[#0c0d15]/90 border-white/10 text-white"
      )}>
        {Object.keys(layers).map((layerKey) => (
          <button
            key={layerKey}
            onClick={() => setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }))}
            className={cn(
              "px-2.5 py-1 rounded-full border text-[10px] font-black transition-all cursor-pointer",
              layers[layerKey]
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                : "bg-slate-800/40 text-muted-foreground border-transparent"
            )}
          >
            {layerKey === 'tenants' && '🔵 Tenants'}
            {layerKey === 'managers' && '🟣 Managers'}
            {layerKey === 'technicians' && '🟢 Technicians'}
            {layerKey === 'properties' && '🏠 Properties'}
            {layerKey === 'risk' && '🔴 Risk'}
          </button>
        ))}
      </div>
    </div>
  );
}

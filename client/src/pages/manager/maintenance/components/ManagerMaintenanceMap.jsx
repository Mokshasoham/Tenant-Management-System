import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '../../../../utils/cn';

export default function ManagerMaintenanceMap({
  properties = [],
  requests = [],
  technicians = [],
  onOpenAssignModal,
  onOpenDetailsDrawer,
  theme,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef([]);

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

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds();
    let hasPoints = false;

    // Plot properties with location
    properties.forEach((p) => {
      const lat = p.location?.lat || p.lat;
      const lng = p.location?.lng || p.lng;
      if (typeof lat === 'number' && typeof lng === 'number') {
        bounds.extend([lat, lng]);
        hasPoints = true;

        const propReqs = requests.filter(r => r.property?._id === p._id || r.property === p._id);
        const hasEmergency = propReqs.some(r => r.priority === 'emergency');
        const badgeColor = hasEmergency ? '#rose-500' : '#8b5cf6';

        const icon = L.divIcon({
          className: 'custom-manager-map-marker',
          html: `
            <div style="
              background: ${hasEmergency ? '#ef4444' : '#8b5cf6'};
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
              <span>🏠</span> ${p.name} (${propReqs.length})
            </div>
          `,
          iconSize: [120, 26],
          iconAnchor: [60, 13],
        });

        const marker = L.marker([lat, lng], { icon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px; min-width: 140px;">
            <h4 style="margin: 0; font-size: 12px; font-weight: 900; color: #7e22ce;">🏠 ${p.name}</h4>
            <p style="margin: 4px 0; font-size: 10px; color: #64748b;">📍 ${p.city || 'Location'} · ${propReqs.length} Maintenance Ticket(s)</p>
          </div>
        `);
        markersRef.current.push(marker);
      }
    });

    if (hasPoints) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [properties, requests, technicians, theme]);

  return (
    <div className={cn(
      "h-[360px] w-full rounded-[2.25rem] border shadow-2xl relative transition-all backdrop-blur-2xl overflow-hidden",
      theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
    )}>
      <div className="absolute top-4 left-4 z-[400] px-3 py-1.5 rounded-full border shadow-xl backdrop-blur-2xl bg-slate-900/90 border-white/10 text-xs font-black text-white flex items-center gap-2">
        <span>📍 Operational Maintenance Map</span>
      </div>
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
}

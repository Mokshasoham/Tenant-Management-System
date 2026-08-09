import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '../../../../utils/cn';

export default function MaintenanceSpatialMap({ properties = [], onSelectProperty, theme }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [20.5937, 78.9629], // Center of India
        zoom: 5,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const tileUrl = theme === 'light'
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

      L.tileLayer(tileUrl, {
        attribution: '&copy; CartoDB &copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (properties.length > 0) {
      const bounds = L.latLngBounds();

      properties.forEach((prop) => {
        if (prop.lat && prop.lng) {
          bounds.extend([prop.lat, prop.lng]);

          const severityColor = prop.severity === 'critical'
            ? '#f43f5e' // Red
            : prop.severity === 'high'
              ? '#f97316' // Orange
              : prop.severity === 'active'
                ? '#eab308' // Yellow
                : '#10b981'; // Green

          // Custom Marker Icon with Badge
          const customIcon = L.divIcon({
            className: 'maintenance-spatial-marker',
            html: `
              <div style="
                background: ${severityColor};
                color: #ffffff;
                font-weight: 900;
                font-size: 11px;
                padding: 4px 10px;
                border-radius: 9999px;
                border: 2px solid rgba(255,255,255,0.8);
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
                white-space: nowrap;
              ">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff; display: inline-block;"></span>
                ● ${prop.activeRequestsCount}
              </div>
            `,
            iconSize: [50, 30],
            iconAnchor: [25, 15],
          });

          const marker = L.marker([prop.lat, prop.lng], { icon: customIcon }).addTo(map);

          // Spatial Popup Content
          const popupContent = document.createElement('div');
          popupContent.className = 'p-3 text-xs space-y-2 font-sans';
          popupContent.innerHTML = `
            <div style="font-weight: 900; font-size: 13px; color: ${theme === 'light' ? '#0f172a' : '#ffffff'};">
              ${prop.name}
            </div>
            <div style="color: #64748b; font-size: 11px;">📍 ${prop.city}</div>
            
            <div style="display: flex; justify-content: space-between; gap: 8px; font-weight: 700; font-size: 10px; padding: 6px 0; border-top: 1px solid rgba(148, 163, 184, 0.2); border-bottom: 1px solid rgba(148, 163, 184, 0.2);">
              <span style="color: #f43f5e;">Open: ${prop.open}</span>
              <span style="color: #f59e0b;">Active: ${prop.inProgress}</span>
              <span style="color: #10b981;">Resolved: ${prop.resolved}</span>
            </div>

            <div style="display: flex; justify-content: space-between; text-align: center; font-size: 10px; padding-top: 4px;">
              <div>
                <span style="color: #64748b; display: block;">Avg Resolution</span>
                <strong style="color: #6366f1;">${prop.avgResolutionHours}h</strong>
              </div>
              <div>
                <span style="color: #64748b; display: block;">This Month</span>
                <strong style="color: #10b981;">₹${prop.monthlyCost?.toLocaleString()}</strong>
              </div>
            </div>

            <button id="hist-btn-${prop.id}" style="
              width: 100%;
              margin-top: 8px;
              padding: 6px 0;
              background: #6366f1;
              color: #ffffff;
              font-weight: 800;
              font-size: 10px;
              border: none;
              border-radius: 9999px;
              cursor: pointer;
            ">
              View Maintenance History →
            </button>
          `;

          marker.bindPopup(popupContent);

          marker.on('popupopen', () => {
            const btn = document.getElementById(`hist-btn-${prop.id}`);
            if (btn) {
              btn.onclick = () => {
                if (onSelectProperty) onSelectProperty(prop);
              };
            }
          });

          markersRef.current.push(marker);
        }
      });

      if (markersRef.current.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      }
    }
  }, [properties, theme]);

  return (
    <div className={cn(
      "h-[380px] w-full rounded-[2rem] overflow-hidden border shadow-2xl relative transition-all backdrop-blur-2xl",
      theme === 'light' ? "bg-slate-100 border-slate-200" : "bg-[#0c0d15] border-white/10"
    )}>
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map Legend Overlay */}
      <div className={cn(
        "absolute bottom-3 left-3 z-20 px-3.5 py-1.5 rounded-full border text-[10px] font-bold flex items-center gap-3 shadow-xl backdrop-blur-2xl",
        theme === 'light' ? "bg-white/90 border-slate-200 text-slate-800" : "bg-[#0c0d15]/90 border-white/10 text-white"
      )}>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Normal</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Active</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> High</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> SLA Risk</span>
      </div>
    </div>
  );
}

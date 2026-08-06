import React, { useState, useRef, useEffect } from 'react';
import {
  FileSignature,
  CheckCircle2,
  X,
  RotateCcw,
  MapPin,
  Smartphone,
  Clock,
  ShieldCheck,
  Loader2,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { maintenanceService } from '../../services/api';
import { useOfflineSync } from '../../hooks/useOfflineSync';

/**
 * SignaturePad Component
 * Legal-grade signature component:
 *   - Dual tabs / canvas: Technician Signature & Tenant Signature
 *   - Printed name inputs for both Technician & Tenant
 *   - Captures GPS coords + deviceId + ISO timestamp
 *   - Posts to /api/maintenance/:id/signature (or enqueues offline if disconnected)
 */
export default function SignaturePad({
  ticketId,
  ticket,
  onSaveSuccess,
  onClose,
  existingSignatures = null,
}) {
  const activeTicketId = ticketId || ticket?._id;
  const { networkStatus, addOfflineAction } = useOfflineSync();

  const [activeTab, setActiveTab] = useState('technician'); // 'technician' | 'tenant'
  const [technicianName, setTechnicianName] = useState(
    ticket?.technicianName || existingSignatures?.technicianName || ''
  );
  const [tenantName, setTenantName] = useState(
    ticket?.tenantName || existingSignatures?.tenantName || ''
  );

  const [techHasSigned, setTechHasSigned] = useState(false);
  const [tenantHasSigned, setTenantHasSigned] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Metadata state
  const [gpsData, setGpsData] = useState({ latitude: null, longitude: null, accuracy: null });
  const [deviceId, setDeviceId] = useState('');

  // Canvas Refs
  const techCanvasRef = useRef(null);
  const tenantCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Obtain or generate persistent device identifier
  useEffect(() => {
    let storedDeviceId = localStorage.getItem('tenant_portal_device_id');
    if (!storedDeviceId) {
      storedDeviceId = `DEV_${Math.random().toString(36).substring(2, 9).toUpperCase()}_${Date.now()}`;
      localStorage.setItem('tenant_portal_device_id', storedDeviceId);
    }
    setDeviceId(storedDeviceId);

    // Fetch GPS coordinates
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsData({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          console.warn('Geolocation warning in SignaturePad:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  // Canvas Drawing Logic
  const getCanvasCoordinates = (canvas, event) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (event, canvasRef, setSignedState) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoordinates(canvas, event);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#38bdf8'; // Cyan-400 stroke

    isDrawingRef.current = true;
    setSignedState(true);
  };

  const draw = (event, canvasRef) => {
    if (!isDrawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoordinates(canvas, event);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (event) => {
    if (event) event.preventDefault();
    isDrawingRef.current = false;
  };

  const clearCanvas = (canvasRef, setSignedState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignedState(false);
  };

  // Resize canvas according to display width
  useEffect(() => {
    const setupCanvas = (canvasRef) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parentWidth = canvas.parentElement?.clientWidth || 340;
      canvas.width = parentWidth;
      canvas.height = 180;
    };

    setupCanvas(techCanvasRef);
    setupCanvas(tenantCanvasRef);
  }, [activeTab]);

  const handleSubmit = async () => {
    setErrorMsg(null);

    const techCanvas = techCanvasRef.current;
    const tenantCanvas = tenantCanvasRef.current;

    const techSignatureData = techHasSigned && techCanvas ? techCanvas.toDataURL('image/png') : null;
    const tenantSignatureData = tenantHasSigned && tenantCanvas ? tenantCanvas.toDataURL('image/png') : null;

    if (!techSignatureData && !tenantSignatureData) {
      setErrorMsg('Please capture at least one signature before saving.');
      return;
    }

    if (!technicianName.trim() && techSignatureData) {
      setErrorMsg('Technician printed name is required.');
      return;
    }

    if (!tenantName.trim() && tenantSignatureData) {
      setErrorMsg('Tenant printed name is required.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      technicianSignature: techSignatureData,
      tenantSignature: tenantSignatureData,
      technicianName: technicianName.trim(),
      tenantName: tenantName.trim(),
      location: gpsData,
      deviceId,
      timestamp: new Date().toISOString(),
    };

    try {
      if (networkStatus === 'offline') {
        // Enqueue offline action
        await addOfflineAction({
          type: 'SIGNATURE',
          ticketId: activeTicketId,
          payload,
        });
        setSuccessMsg('Signature saved offline! It will automatically sync once connected.');
      } else {
        await maintenanceService.saveSignature(activeTicketId, payload);
        setSuccessMsg('Signature verified and saved to official record!');
      }

      if (onSaveSuccess) {
        onSaveSuccess(payload);
      }

      setTimeout(() => {
        if (onClose) onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to submit signature:', err);
      setErrorMsg(err?.response?.data?.message || err.message || 'Failed to save signature.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 md:p-6 shadow-2xl backdrop-blur-xl space-y-5 text-slate-100 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Work Verification & Signature</h3>
            <p className="text-[11px] text-slate-400">Legal proof of completion and inspection</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs Header */}
      <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('technician')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'technician'
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/40 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Technician Sign</span>
          {techHasSigned && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>

        <button
          onClick={() => setActiveTab('tenant')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'tenant'
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/40 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Tenant Acceptance</span>
          {tenantHasSigned && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <X className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tab 1: Technician Signature */}
      {activeTab === 'technician' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Technician Printed Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Technician Digital Signature Canvas</span>
              <button
                type="button"
                onClick={() => clearCanvas(techCanvasRef, setTechHasSigned)}
                className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            </div>

            <div className="relative rounded-xl border border-slate-700/80 bg-slate-950 overflow-hidden touch-none">
              <canvas
                ref={techCanvasRef}
                onMouseDown={(e) => startDrawing(e, techCanvasRef, setTechHasSigned)}
                onMouseMove={(e) => draw(e, techCanvasRef)}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={(e) => startDrawing(e, techCanvasRef, setTechHasSigned)}
                onTouchMove={(e) => draw(e, techCanvasRef)}
                onTouchEnd={stopDrawing}
                className="w-full h-44 cursor-crosshair block"
              />
              {!techHasSigned && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-600 text-xs font-medium">
                  Sign here using finger or mouse
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Tenant Signature */}
      {activeTab === 'tenant' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tenant / Resident Printed Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Jane Smith"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Tenant Acceptance Signature Canvas</span>
              <button
                type="button"
                onClick={() => clearCanvas(tenantCanvasRef, setTenantHasSigned)}
                className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            </div>

            <div className="relative rounded-xl border border-slate-700/80 bg-slate-950 overflow-hidden touch-none">
              <canvas
                ref={tenantCanvasRef}
                onMouseDown={(e) => startDrawing(e, tenantCanvasRef, setTenantHasSigned)}
                onMouseMove={(e) => draw(e, tenantCanvasRef)}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={(e) => startDrawing(e, tenantCanvasRef, setTenantHasSigned)}
                onTouchMove={(e) => draw(e, tenantCanvasRef)}
                onTouchEnd={stopDrawing}
                className="w-full h-44 cursor-crosshair block"
              />
              {!tenantHasSigned && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-600 text-xs font-medium">
                  Tenant signs here to confirm work satisfaction
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Captured Security Metadata Box */}
      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-[10px] text-slate-400">
        <div className="flex items-center justify-between font-mono">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-cyan-400" />
            GPS: {gpsData.latitude ? `${gpsData.latitude.toFixed(4)}, ${gpsData.longitude.toFixed(4)}` : 'Locating...'}
          </span>
          <span className="flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-cyan-400" />
            Device: {deviceId.substring(0, 14)}...
          </span>
        </div>
        <div className="flex items-center justify-between font-mono">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            Timestamp: {new Date().toLocaleTimeString()}
          </span>
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <ShieldCheck className="w-3 h-3" />
            Legal Audit Lock
          </span>
        </div>
      </div>

      {/* Legal Disclaimer */}
      <p className="text-[10px] text-slate-500 leading-tight">
        By capturing signatures, both parties acknowledge that maintenance services specified for ticket #{activeTicketId} were performed, inspected, and verified according to building safety regulations.
      </p>

      {/* Submit Button */}
      <div className="pt-2 flex items-center gap-3">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || (!techHasSigned && !tenantHasSigned)}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving Verified Signature...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Save Legal Signature Record
            </>
          )}
        </button>
      </div>
    </div>
  );
}

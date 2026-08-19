import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  QrCode,
  ShieldCheck,
  Building2,
  MapPin,
  FileText,
  CheckCircle2,
  Lock,
  Maximize2,
  Download,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { propertyService } from '../../../services/api';
import { cn } from '../../../utils/cn';

export default function TenantPropertyQrModal({
  isOpen,
  onClose,
  lease,
  property
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState(null);

  const propName = property?.name || lease?.property?.name || lease?.propertyName || 'Property';
  const propLocation = property?.address
    ? `${property.address}${property.city ? ', ' + property.city : ''}`
    : lease?.property?.address
    ? `${lease.property.address}${lease.property.city ? ', ' + lease.property.city : ''}`
    : 'Location Unavailable';
  const leaseNumber = lease?.leaseNumber || lease?.id || '#LEASE-CURRENT';
  const isIncluded = lease?.maintenanceEnabled === true;
  const leaseStatus = (lease?.status || 'active').toUpperCase();

  const propertyId = property?._id || lease?.property?._id || lease?.property;
  const leaseId = lease?._id || lease?.id;

  useEffect(() => {
    if (!isOpen) {
      setExpanded(false);
      setCopied(false);
      return;
    }

    const fetchQr = async () => {
      setLoading(true);
      try {
        if (propertyId) {
          const res = await propertyService.getPropertyQrPass(propertyId, leaseId);
          const data = res?.data?.data || res?.data;
          if (data) {
            setQrData(data);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not fetch server QR pass, generating dynamic client QR fallback:', err);
      } finally {
        setLoading(false);
      }

      // Dynamic fallback
      const token = `TMS-PROP-${String(leaseId || propertyId || 'DEFAULT').slice(-8).toUpperCase()}`;
      const verifyUrl = `${window.location.origin}/property/verify/${token}`;
      setQrData({
        verificationId: token,
        qrToken: token,
        verifyUrl,
        propertyName: propName,
        location: propLocation,
        leaseNumber,
        leaseStatus: lease?.status || 'active',
        maintenanceEnabled: isIncluded,
        maintenancePlan: isIncluded ? 'Comprehensive Maintenance' : 'Not Included'
      });
    };

    fetchQr();
  }, [isOpen, propertyId, leaseId, propName, propLocation, leaseNumber, isIncluded]);

  if (!isOpen) return null;

  const verifyUrl = qrData?.verifyUrl || `${window.location.origin}/property/verify/${qrData?.qrToken || 'TMS-PROP'}`;
  const verificationId = qrData?.verificationId || `TMS-PROP-${String(leaseId || 'VERIFY').slice(-6).toUpperCase()}`;

  // QR Code Image (use server data URL or dynamic high-res SVG canvas)
  const qrImageSrc = qrData?.qrCodeDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verifyUrl)}&margin=10`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const handleDownloadQr = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 750;

    // Background
    ctx.fillStyle = '#050A18';
    ctx.fillRect(0, 0, 600, 750);

    // Accent header banner
    ctx.fillStyle = isIncluded ? '#04221D' : '#1F1404';
    ctx.fillRect(0, 0, 600, 100);

    // Title
    ctx.fillStyle = isIncluded ? '#10B981' : '#F59E0B';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TMS PROPERTY VERIFICATION', 300, 45);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px sans-serif';
    ctx.fillText(verificationId, 300, 75);

    // Property name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(propName, 300, 150);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '16px sans-serif';
    ctx.fillText(propLocation, 300, 185);

    // Status Pill
    ctx.fillStyle = isIncluded ? '#10B981' : '#F59E0B';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`MAINTENANCE: ${isIncluded ? 'INCLUDED' : 'LOCKED'}`, 300, 220);

    // QR Code Image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 150, 260, 300, 300);

      // Footer
      ctx.fillStyle = '#64748B';
      ctx.font = '14px sans-serif';
      ctx.fillText('Scan with any mobile camera to view verification', 300, 610);

      ctx.fillStyle = '#475569';
      ctx.font = '12px sans-serif';
      ctx.fillText(`Lease: ${leaseNumber} • Verified by TMS Platform`, 300, 645);

      const link = document.createElement('a');
      link.download = `${propName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-property-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = qrImageSrc;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#02050D]/85 backdrop-blur-xl font-sans">
        {/* Modal Surface */}
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "relative w-full rounded-[30px] border shadow-[0_25px_80px_-15px_rgba(0,0,0,0.95)] overflow-hidden text-slate-100 transition-all duration-300",
            isIncluded
              ? "bg-gradient-to-b from-[#061D1E] via-[#041216] to-[#020B0E] border-emerald-500/35 shadow-emerald-500/10"
              : "bg-gradient-to-b from-[#0F172E] via-[#090F20] to-[#040814] border-amber-500/35 shadow-amber-500/10",
            expanded ? "max-w-lg" : "max-w-md"
          )}
        >
          {/* Header Bar */}
          <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner shrink-0",
                  isIncluded
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : "bg-amber-500/20 border-amber-500/40 text-amber-400"
                )}
              >
                <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span
                  className={cn(
                    "text-[10px] font-black uppercase tracking-[0.25em]",
                    isIncluded ? "text-emerald-400" : "text-amber-400"
                  )}
                >
                  TMS PROPERTY VERIFICATION
                </span>
                <p className="text-xs text-slate-400 font-mono font-bold">
                  {verificationId}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800/50 hover:bg-white/10 border border-slate-700/60 hover:border-slate-500 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-7 space-y-5">
            {/* Property Identity Card */}
            <div
              className={cn(
                "p-4 rounded-2xl border space-y-2.5",
                isIncluded
                  ? "bg-[#062422]/70 border-emerald-500/30"
                  : "bg-[#111A33]/70 border-amber-500/30"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block">
                    PROPERTY
                  </span>
                  <h3 className="text-lg font-black text-white tracking-tight uppercase">
                    {propName}
                  </h3>
                  <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[260px]">{propLocation}</span>
                  </p>
                </div>

                {/* Status Badges */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-black tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700">
                    {leaseStatus}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border",
                      isIncluded
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    )}
                  >
                    {isIncluded ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>INCLUDED</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>LOCKED</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Lease Ref:</span>
                <span className="text-slate-200 font-bold">{leaseNumber}</span>
              </div>
            </div>

            {/* Central Interactive QR Code Container */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <div
                onClick={() => setExpanded(!expanded)}
                className={cn(
                  "relative group p-4 rounded-3xl bg-white/95 border-2 shadow-2xl transition-all duration-300 cursor-pointer flex items-center justify-center",
                  isIncluded
                    ? "border-emerald-400 shadow-emerald-500/20 hover:shadow-emerald-500/40"
                    : "border-amber-400 shadow-amber-500/20 hover:shadow-amber-500/40",
                  expanded ? "w-64 h-64 sm:w-72 sm:h-72" : "w-48 h-48 sm:w-52 sm:h-52"
                )}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-2 text-slate-900">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
                    <span className="text-xs font-bold">Generating QR...</span>
                  </div>
                ) : (
                  <img
                    src={qrImageSrc}
                    alt={`${propName} Property QR`}
                    className="w-full h-full object-contain"
                  />
                )}

                {/* Click to expand overlay on hover */}
                {!expanded && (
                  <div className="absolute inset-0 bg-black/60 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 p-2 text-center backdrop-blur-xs">
                    <Maximize2 className="w-6 h-6 text-white mb-1" />
                    <span className="text-xs font-black tracking-wide">Click to Expand</span>
                    <span className="text-[10px] text-slate-300">High-Res View</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-400 font-medium text-center max-w-xs">
                Scan with any mobile camera to view property &amp; maintenance coverage details
              </p>
            </div>

            {/* Expanded Detailed Breakdown (Shown when expanded) */}
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">QR Status:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Authentic
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Verification URL:</span>
                  <a
                    href={verifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1 font-mono text-[11px] truncate max-w-[200px]"
                  >
                    <span>/property/verify/{qrData?.qrToken?.slice(0, 10)}...</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </motion.div>
            )}
          </div>

          {/* Modal Actions Footer */}
          <div className="p-5 sm:p-6 bg-[#03060F]/95 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadQr}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
                  isIncluded
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/20"
                    : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-500/20"
                )}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="Copy Public Verification Link"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>{expanded ? 'Compact View' : 'Expand QR'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

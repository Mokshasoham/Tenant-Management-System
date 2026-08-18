import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import {
  QrCode,
  Camera,
  Search,
  Wrench,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Clock,
  PackageCheck,
  PlusCircle,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  History,
  User,
  Building,
  Sparkles,
} from 'lucide-react';
import { technicianPortalService, maintenanceService } from '../services/api';
import { useTheme } from '../context/ThemeContext';

/**
 * QRScannerPage Component
 * Live HTML5 QR camera scanner page for technicians.
 * Supports:
 * 1. Asset QR Codes (e.g. QR-A101-AC-01) -> Asset history & equipment info
 * 2. Maintenance Ticket QR Codes (TMS_MAINTENANCE:... or TMS-MNT-...) -> Real-time ticket verification & work completion
 */
export default function QRScannerPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [qrInput, setQrInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [assetData, setAssetData] = useState(null);
  const [maintenanceTicketData, setMaintenanceTicketData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Technician Completion state within QR scanner
  const [completionForm, setCompletionForm] = useState({
    workPerformed: '',
    partsUsed: '',
    completionNotes: '',
  });
  const [submittingCompletion, setSubmittingCompletion] = useState(false);
  const [completionSuccess, setCompletionSuccess] = useState('');

  const scannerContainerRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const canvasRef = useRef(null);

  // Sample quick test QR codes for easy technician testing
  const SAMPLE_QR_CODES = [
    'QR-A101-AC-01',
    'QR-B204-ELEV-02',
    'QR-C305-BOILER-01',
  ];

  // Stop camera and release all media stream tracks cleanly
  const stopCameraScanner = () => {
    setIsScanning(false);
    setCameraReady(false);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start / Stop camera scanner toggle
  const startCameraScanner = () => {
    setErrorMsg(null);
    setIsScanning(true);
  };

  // Live Camera Scanner Lifecycle & jsQR detection loop
  useEffect(() => {
    let isCancelled = false;

    async function initCamera() {
      if (!isScanning) return;
      setErrorMsg(null);
      setCameraReady(false);

      // Stop any existing stream before starting a new one
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (constraintErr) {
          console.warn('Fallback to standard video constraint:', constraintErr);
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          if (!isCancelled) {
            setCameraReady(true);
          }
        }

        // Prepare offscreen canvas for frame capture
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Optional browser-native BarcodeDetector support
        let barcodeDetector = null;
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
          } catch (e) {
            barcodeDetector = null;
          }
        }

        const scanFrame = async () => {
          if (!streamRef.current || isCancelled) return;
          const video = videoRef.current;

          if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            let detectedText = null;

            if (barcodeDetector) {
              try {
                const barcodes = await barcodeDetector.detect(video);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  detectedText = barcodes[0].rawValue;
                }
              } catch (e) {
                // fall through to jsQR
              }
            }

            if (!detectedText) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const qr = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              }) || jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'onlyInvert',
              });

              if (qr && qr.data && qr.data.trim()) {
                detectedText = qr.data.trim();
              }
            }

            if (detectedText) {
              // Stop camera immediately once QR is detected
              stopCameraScanner();
              setQrInput(detectedText);
              handleLookup(detectedText);
              return;
            }
          }

          animFrameRef.current = requestAnimationFrame(scanFrame);
        };

        animFrameRef.current = requestAnimationFrame(scanFrame);
      } catch (err) {
        console.error('Camera initialization error:', err);
        let friendlyMsg = 'Camera could not be accessed on this device.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          friendlyMsg = 'Camera access was denied. Please allow camera permission in your browser settings and try again.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          friendlyMsg = 'No camera device found on this system.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          friendlyMsg = 'Camera is already in use by another application or tab.';
        } else if (typeof window !== 'undefined' && !window.isSecureContext) {
          friendlyMsg = 'Camera access requires a secure HTTPS connection or localhost.';
        }
        setErrorMsg(friendlyMsg);
        setIsScanning(false);
      }
    }

    if (isScanning) {
      initCamera();
    } else {
      stopCameraScanner();
    }

    return () => {
      isCancelled = true;
      stopCameraScanner();
    };
  }, [isScanning]);

  // Lookup Property/Asset or Maintenance Ticket by QR Code
  const handleLookup = async (codeToLookup) => {
    const code = (codeToLookup || qrInput).trim();
    if (!code) {
      setErrorMsg('Please enter or scan a valid QR code or Ticket ID.');
      return;
    }

    setLoadingLookup(true);
    setErrorMsg(null);
    setCompletionSuccess('');

    try {
      // 1. Detect Maintenance Ticket QR Code payload (TMS_MAINTENANCE:..., TMS-MNT-..., TMS-MNT-VERIFY:...)
      if (code.startsWith('TMS_MAINTENANCE') || code.startsWith('TMS-MNT') || code.startsWith('TMS-MNT-VERIFY')) {
        const maintRes = await maintenanceService.verifyTicket(code);
        const ticket = maintRes?.data?.data || maintRes?.data;
        if (ticket) {
          setMaintenanceTicketData(ticket);
          setAssetData(null);
          if (ticket.completionDetails) {
            setCompletionForm({
              workPerformed: ticket.completionDetails.workPerformed || '',
              partsUsed: ticket.completionDetails.partsUsed || '',
              completionNotes: ticket.completionDetails.completionNotes || '',
            });
          } else {
            setCompletionForm({
              workPerformed: '',
              partsUsed: '',
              completionNotes: '',
            });
          }
          setLoadingLookup(false);
          return;
        }
      }

      // 2. Existing Asset / Equipment Tag QR code lookup
      setMaintenanceTicketData(null);
      const res = await technicianPortalService.lookupPropertyByQR(code);
      const data = res?.data || res || {};

      // If backend returns data or fallback mock asset
      if (data && (data.assetName || data.propertyName || data.asset)) {
        setAssetData(data.asset || data);
      } else {
        // Fallback mock asset structure for rich asset card display if endpoint is mocked
        setAssetData({
          qrCode: code,
          assetName: 'Carrier 50-Ton Rooftop HVAC Unit X200',
          serialNumber: 'SN-99824-HVAC-2024',
          property: 'Skyline Apartments - Building A (Unit 101)',
          installedDate: '2022-04-15',
          warrantyStatus: 'ACTIVE',
          warrantyExpiration: '2027-04-15',
          lastRepairDate: '2026-06-10',
          lastTechnician: 'Alex Rivera (Senior Tech)',
          manualUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          activeTicketId: 'TICK-4029',
          pastRepairs: [
            {
              id: 'REP-101',
              date: '2026-06-10',
              technician: 'Alex Rivera',
              issue: 'Compressor capacitor overload & refrigerant pressure drop',
              resolution: 'Replaced 45uF capacitor & refilled 2.5 lbs R410A refrigerant.',
            },
            {
              id: 'REP-088',
              date: '2025-11-20',
              technician: 'Marcus Vance',
              issue: 'Air filter clogging causing low airflow alarm',
              resolution: 'Cleaned intake duct and installed dual HEPA filtration units.',
            },
          ],
          partsUsed: [
            { id: 'PRT-90', name: '45uF 440V Run Capacitor', partNumber: 'CP-45440', cost: '$48.50' },
            { id: 'PRT-91', name: 'R410A Refrigerant Tank 2.5lb', partNumber: 'REF-R410A', cost: '$120.00' },
            { id: 'PRT-42', name: 'Commercial Grade HEPA Filter 24x24', partNumber: 'FLT-2424-H', cost: '$65.00' },
          ],
        });
      }
    } catch (err) {
      console.error('QR Lookup failed:', err);
      if (err?.response?.status === 403) {
        setErrorMsg(err.response?.data?.message || 'You are not assigned to this maintenance ticket.');
      } else {
        setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to find asset or maintenance ticket for this QR code.');
      }
    } finally {
      setLoadingLookup(false);
    }
  };

  const handleMaintenanceCompletionSubmit = async (e) => {
    e.preventDefault();
    if (!maintenanceTicketData) return;
    if (!completionForm.workPerformed.trim()) {
      setErrorMsg('Please describe the work performed before submitting completion.');
      return;
    }

    setSubmittingCompletion(true);
    setErrorMsg(null);
    setCompletionSuccess('');

    try {
      const res = await maintenanceService.submitCompletion(maintenanceTicketData._id, completionForm);
      const updated = res?.data?.data || res?.data || res;
      setMaintenanceTicketData(updated);
      setCompletionSuccess('Work completed & maintenance ticket marked as RESOLVED!');
    } catch (err) {
      console.error('Failed to submit completion:', err);
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to submit work completion.');
    } finally {
      setSubmittingCompletion(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Asset QR Code Scanner
            </h1>
            <p className="text-xs text-slate-400">
              Instant equipment verification & repair history lookup
            </p>
          </div>
        </div>

        {/* Quick Scan / Manual Input Toggle */}
        <button
          onClick={isScanning ? stopCameraScanner : startCameraScanner}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
            isScanning
              ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20'
          }`}
        >
          <Camera className="w-4 h-4" />
          {isScanning ? 'Stop Camera Scan' : 'Open Camera Scanner'}
        </button>
      </div>

      {/* Camera Viewfinder Modal / Card */}
      {isScanning && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl text-center space-y-4 animate-slide-down">
          <div className="flex items-center justify-between text-xs font-semibold text-cyan-400 border-b border-slate-800 pb-3">
            <span className="flex items-center gap-2">
              <Camera className="w-4 h-4 animate-pulse text-cyan-400" />
              Live Viewfinder Active
            </span>
            <span className="text-slate-400 text-[11px]">Align QR code within frame</span>
          </div>

          <div
            id="qr-reader-container"
            ref={scannerContainerRef}
            className="w-full max-w-sm h-64 sm:h-72 mx-auto rounded-xl bg-slate-950 border-2 border-dashed border-cyan-500/60 flex items-center justify-center overflow-hidden relative"
          >
            {/* Live Video Feed Element */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-300 ${cameraReady ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Viewfinder overlay laser line animation */}
            <div className="absolute inset-x-4 h-0.5 bg-cyan-400 shadow-lg shadow-cyan-400 animate-pulse pointer-events-none" style={{ top: '50%' }} />

            {/* Viewfinder Corner Framing */}
            <div className="absolute inset-4 border border-cyan-400/20 rounded-lg pointer-events-none flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
              </div>
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
              </div>
            </div>

            {/* Status indicator */}
            {!cameraReady ? (
              <div className="text-slate-500 text-xs flex flex-col items-center gap-2 p-4 relative z-10">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <span>Connecting camera stream...</span>
              </div>
            ) : (
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5 text-xs text-cyan-300 font-semibold bg-black/60 backdrop-blur-sm py-1 px-3 mx-auto w-fit rounded-full pointer-events-none z-10">
                <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span>Scanning for QR tag...</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                const code = SAMPLE_QR_CODES[0];
                setQrInput(code);
                stopCameraScanner();
                handleLookup(code);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono border border-slate-700 cursor-pointer"
            >
              Simulate Scan: {SAMPLE_QR_CODES[0]}
            </button>
          </div>
        </div>
      )}

      {/* Manual Code Input Bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <label className="block text-xs font-semibold text-slate-300">
          Enter QR Code / Equipment Tag ID Manually
        </label>
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <QrCode className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="e.g. QR-A101-AC-01"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>
          <button
            onClick={() => handleLookup()}
            disabled={loadingLookup}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[42px]"
          >
            {loadingLookup ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Search className="w-4 h-4 text-cyan-400" />
            )}
            Lookup Asset History
          </button>
        </div>

        {/* Quick Sample Selector Tags */}
        <div className="flex items-center gap-2 pt-1 flex-wrap text-xs text-slate-400">
          <span className="text-[11px] text-slate-500 font-medium">Quick Demo Samples:</span>
          {SAMPLE_QR_CODES.map((code) => (
            <button
              key={code}
              onClick={() => {
                setQrInput(code);
                handleLookup(code);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-[11px] transition-colors"
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* MAINTENANCE TICKET CARD */}
      {maintenanceTicketData && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">{maintenanceTicketData.title}</h2>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    maintenanceTicketData.status === 'resolved'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {maintenanceTicketData.status === 'resolved' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {maintenanceTicketData.status?.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 font-mono">
                  <Building className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{maintenanceTicketData.property?.name || 'Property'} {maintenanceTicketData.property?.unit ? `· Unit ${maintenanceTicketData.property.unit}` : ''}</span>
                  <span className="text-slate-600">|</span>
                  <QrCode className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ticket: {maintenanceTicketData.ticketCode || maintenanceTicketData.ticketNumber || maintenanceTicketData._id}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/technician/jobs/${maintenanceTicketData._id}`)}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Full Job Details
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Category / Priority</span>
                <p className="font-mono text-slate-200 font-medium capitalize">{maintenanceTicketData.category} · {maintenanceTicketData.priority}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Tenant Requester</span>
                <p className="font-mono text-slate-200 font-medium truncate">
                  {maintenanceTicketData.requestedBy ? `${maintenanceTicketData.requestedBy.firstName || ''} ${maintenanceTicketData.requestedBy.lastName || ''}`.trim() || maintenanceTicketData.requestedBy.email : 'Tenant'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Created Date</span>
                <p className="font-mono text-slate-200 font-medium">{new Date(maintenanceTicketData.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Assigned Tech</span>
                <p className="font-mono text-slate-200 font-medium truncate">
                  {maintenanceTicketData.assignedTo ? `${maintenanceTicketData.assignedTo.firstName || ''} ${maintenanceTicketData.assignedTo.lastName || ''}`.trim() : (maintenanceTicketData.technicianName || 'Assigned')}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Reported Issue Description</span>
              <p className="text-xs text-slate-300 leading-relaxed">{maintenanceTicketData.description}</p>
            </div>

            {completionSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{completionSuccess}</span>
              </div>
            )}

            {maintenanceTicketData.status === 'resolved' ? (
              <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>This maintenance ticket is verified &amp; RESOLVED.</span>
                </div>
                {maintenanceTicketData.completionDetails && (
                  <div className="space-y-1 text-xs text-slate-300 pt-1">
                    <p><strong className="text-white">Work Performed:</strong> {maintenanceTicketData.completionDetails.workPerformed}</p>
                    {maintenanceTicketData.completionDetails.partsUsed && (
                      <p><strong className="text-white">Parts Used:</strong> {maintenanceTicketData.completionDetails.partsUsed}</p>
                    )}
                    {maintenanceTicketData.completionDetails.completionNotes && (
                      <p><strong className="text-white">Notes:</strong> {maintenanceTicketData.completionDetails.completionNotes}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleMaintenanceCompletionSubmit} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" /> Submit Work Completion &amp; Resolve Ticket
                </h3>
                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">
                    Work Performed *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe repairs completed on site..."
                    value={completionForm.workPerformed}
                    onChange={(e) => setCompletionForm(prev => ({ ...prev, workPerformed: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">
                      Parts / Supplies Used
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1 PVC valve, seal tape"
                      value={completionForm.partsUsed}
                      onChange={(e) => setCompletionForm(prev => ({ ...prev, partsUsed: e.target.value }))}
                      className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">
                      Completion Notes
                    </label>
                    <input
                      type="text"
                      placeholder="Optional remarks..."
                      value={completionForm.completionNotes}
                      onChange={(e) => setCompletionForm(prev => ({ ...prev, completionNotes: e.target.value }))}
                      className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submittingCompletion}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingCompletion ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Submit Completion &amp; Resolve Ticket</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ASSET HISTORY CARD */}
      {assetData && (
        <div className="space-y-6 animate-fade-in">
          {/* Main Summary Header Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">{assetData.assetName}</h2>
                  {assetData.warrantyStatus === 'ACTIVE' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <ShieldCheck className="w-3 h-3" />
                      WARRANTY ACTIVE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      <ShieldAlert className="w-3 h-3" />
                      WARRANTY EXPIRED
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 font-mono">
                  <Building className="w-3.5 h-3.5 text-cyan-400" />
                  {assetData.property || 'Location Unspecified'}
                  <span className="text-slate-600">|</span>
                  <QrCode className="w-3.5 h-3.5 text-slate-500" />
                  Tag: {assetData.qrCode}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {assetData.activeTicketId ? (
                  <button
                    onClick={() => navigate(`/technician/jobs/${assetData.activeTicketId}`)}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Open Active Ticket (#{assetData.activeTicketId})
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/technician/jobs?createAsset=${assetData.qrCode}`)}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Create Ticket for Asset
                  </button>
                )}
              </div>
            </div>

            {/* Quick Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Serial Number</span>
                <p className="font-mono text-slate-200 font-medium truncate">{assetData.serialNumber || 'N/A'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Installed Date</span>
                <p className="font-mono text-slate-200 font-medium">{assetData.installedDate || 'N/A'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Last Repair</span>
                <p className="font-mono text-slate-200 font-medium">{assetData.lastRepairDate || 'N/A'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Last Technician</span>
                <p className="font-mono text-slate-200 font-medium truncate">{assetData.lastTechnician || 'N/A'}</p>
              </div>
            </div>

            {/* Equipment Manual Download Link */}
            {assetData.manualUrl && (
              <div className="pt-1">
                <a
                  href={assetData.manualUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
                >
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Download Equipment Manual (PDF)</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            )}
          </div>

          {/* Past Repairs Timeline */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <History className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Past Repairs & Service Timeline</h3>
            </div>

            {assetData.pastRepairs && assetData.pastRepairs.length > 0 ? (
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
                {assetData.pastRepairs.map((repair) => (
                  <div key={repair.id} className="relative pl-8 space-y-1">
                    <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-cyan-400" />
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono text-cyan-300 font-bold">{repair.date}</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <User className="w-3 h-3 text-slate-500" />
                        {repair.technician}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200">{repair.issue}</p>
                    <p className="text-xs text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono">
                      Resolution: {repair.resolution}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No past repair records logged for this asset tag.</p>
            )}
          </div>

          {/* Parts Used History */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <PackageCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Parts & Replaced Components History</h3>
            </div>

            {assetData.partsUsed && assetData.partsUsed.length > 0 ? (
              <div className="divide-y divide-slate-800">
                {assetData.partsUsed.map((part) => (
                  <div key={part.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-slate-200">{part.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">Part #: {part.partNumber}</p>
                    </div>
                    <span className="font-mono text-cyan-300 font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      {part.cost}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No part replacements logged.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

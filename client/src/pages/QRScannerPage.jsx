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
import { technicianPortalService, maintenanceService, propertyService } from '../services/api';
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
  const [cameraStatus, setCameraStatus] = useState('idle'); // 'idle' | 'starting' | 'active' | 'error'
  const [cameraError, setCameraError] = useState(null);
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
  const [scanFeedback, setScanFeedback] = useState('');

  const scannerContainerRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const scanLoopRef = useRef(null);
  const canvasRef = useRef(null);
  const isScanningActiveRef = useRef(false);
  const isDecodingRef = useRef(false);
  const barcodeDetectorRef = useRef(null);

  // Sample quick test QR codes for easy technician testing
  const SAMPLE_QR_CODES = [
    'QR-A101-AC-01',
    'QR-B204-ELEV-02',
    'QR-C305-BOILER-01',
  ];

  // Stop camera and release all media stream tracks cleanly
  const stopCameraScanner = () => {
    isScanningActiveRef.current = false;
    isDecodingRef.current = false;
    setIsScanning(false);
    setCameraStatus('idle');
    setCameraError(null);

    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (cameraStreamRef.current) {
      try {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn('Error stopping stream tracks:', e);
      }
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start camera scanner
  const startCameraScanner = () => {
    setErrorMsg(null);
    setCameraError(null);
    setScanFeedback('');
    setIsScanning(true);
  };

  // Dedicated Camera Stream & Continuous Multi-Pass QR Decoder
  const initCamera = async () => {
    setCameraError(null);
    setScanFeedback('');
    setCameraStatus('starting');
    isScanningActiveRef.current = true;
    isDecodingRef.current = false;

    // Initialize native browser BarcodeDetector if supported
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        barcodeDetectorRef.current = null;
      }
    }

    // Stop any previously dangling stream
    if (cameraStreamRef.current) {
      try {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      cameraStreamRef.current = null;
    }
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not supported in this browser.');
      }

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
        console.warn('Fallback to basic video constraint:', constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      // Check if user clicked Stop while prompt was pending
      if (!isScanningActiveRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play notice:', playErr);
        }
      }

      setCameraStatus('active');

      // Prepare canvas for video frame extraction
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Frame-by-frame continuous QR scanning loop
      const scanFrame = async () => {
        if (!isScanningActiveRef.current || !cameraStreamRef.current) return;

        const video = videoRef.current;
        if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
          scanLoopRef.current = requestAnimationFrame(scanFrame);
          return;
        }

        // Prevent overlapping decode passes
        if (isDecodingRef.current) {
          scanLoopRef.current = requestAnimationFrame(scanFrame);
          return;
        }

        isDecodingRef.current = true;

        try {
          let detectedText = null;

          // PASS 1: Native hardware-accelerated BarcodeDetector (Chrome/Edge/Android/Safari 17+)
          if (barcodeDetectorRef.current) {
            try {
              const barcodes = await barcodeDetectorRef.current.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                detectedText = barcodes[0].rawValue.trim();
              }
            } catch (detectorErr) {
              // fallback to jsQR below
            }
          }

          // PASS 2: Canvas jsQR Center-Crop (focuses directly on the viewfinder frame)
          if (!detectedText) {
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const cropSize = Math.min(vw, vh) * 0.8;
            const cropX = (vw - cropSize) / 2;
            const cropY = (vh - cropSize) / 2;
            const targetCropDim = Math.min(480, Math.round(cropSize));

            canvas.width = targetCropDim;
            canvas.height = targetCropDim;
            ctx.drawImage(video, cropX, cropY, cropSize, cropSize, 0, 0, targetCropDim, targetCropDim);

            let imgData = ctx.getImageData(0, 0, targetCropDim, targetCropDim);
            let qr = jsQR(imgData.data, targetCropDim, targetCropDim, {
              inversionAttempts: 'dontInvert',
            }) || jsQR(imgData.data, targetCropDim, targetCropDim, {
              inversionAttempts: 'onlyInvert',
            });

            if (qr && qr.data && qr.data.trim()) {
              detectedText = qr.data.trim();
            }

            // PASS 3: Full-frame downscaled to 600px for LCD monitor moire / glare reduction
            if (!detectedText) {
              const maxDim = 600;
              let scale = 1;
              if (vw > maxDim || vh > maxDim) {
                scale = maxDim / Math.max(vw, vh);
              }
              const fullW = Math.round(vw * scale);
              const fullH = Math.round(vh * scale);

              canvas.width = fullW;
              canvas.height = fullH;
              ctx.drawImage(video, 0, 0, fullW, fullH);

              imgData = ctx.getImageData(0, 0, fullW, fullH);
              qr = jsQR(imgData.data, fullW, fullH, {
                inversionAttempts: 'dontInvert',
              }) || jsQR(imgData.data, fullW, fullH, {
                inversionAttempts: 'onlyInvert',
              });

              if (qr && qr.data && qr.data.trim()) {
                detectedText = qr.data.trim();
              }
            }
          }

          if (detectedText) {
            console.log('✅ [QR Scanner] Detected QR Code from live camera feed:', detectedText);
            setScanFeedback('QR code detected!');

            // Stop camera immediately once QR is recognized
            stopCameraScanner();
            setQrInput(detectedText);
            await handleLookup(detectedText);
            return;
          }
        } catch (frameErr) {
          console.warn('[QR Scanner] Frame processing notice:', frameErr);
        } finally {
          isDecodingRef.current = false;
        }

        // Keep scanner running continuously while waiting for QR
        if (isScanningActiveRef.current) {
          scanLoopRef.current = requestAnimationFrame(scanFrame);
        }
      };

      scanLoopRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      console.error('Camera initialization error:', err);
      let friendlyMsg = 'Camera could not be accessed on this device.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        friendlyMsg = 'Camera access was denied. Please allow camera permission in your browser settings and click Try Again.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        friendlyMsg = 'No camera device found on this system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        friendlyMsg = 'Camera is already in use by another application or tab.';
      } else if (typeof window !== 'undefined' && !window.isSecureContext) {
        friendlyMsg = 'Camera access requires a secure HTTPS connection or localhost.';
      }
      setCameraStatus('error');
      setCameraError(friendlyMsg);
    }
  };

  // Trigger camera startup when isScanning becomes true
  useEffect(() => {
    if (isScanning) {
      initCamera();
    }
  }, [isScanning]);

  // Cleanup on unmount ONLY
  useEffect(() => {
    return () => {
      isScanningActiveRef.current = false;
      isDecodingRef.current = false;
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
      if (cameraStreamRef.current) {
        try {
          cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        } catch (e) {}
        cameraStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  // Lookup Property/Asset or Maintenance Ticket by QR Code
  const handleLookup = async (codeToLookup) => {
    const raw = (codeToLookup || qrInput).trim();
    if (!raw) {
      setErrorMsg('Please enter or scan a valid QR code or Ticket ID.');
      return;
    }

    setLoadingLookup(true);
    setErrorMsg(null);
    setCompletionSuccess('');

    try {
      // 0. Detect Property Verification QR Code (TMS-PROP-... or verification URL)
      const isProp =
        raw.includes('TMS-PROP') ||
        raw.includes('/property/verify/') ||
        raw.includes('/verify/property/');

      if (isProp) {
        let propToken = raw;
        if (raw.includes('/property/verify/')) {
          propToken = raw.split('/property/verify/')[1].split(/[?#]/)[0];
        } else if (raw.includes('/verify/property/')) {
          propToken = raw.split('/verify/property/')[1].split(/[?#]/)[0];
        } else {
          const match = raw.match(/TMS-PROP-[A-Z0-9]+/i);
          if (match) propToken = match[0];
        }

        console.log('[QR Scanner] Looking up property verification:', propToken);
        try {
          const propRes = await propertyService.verifyPropertyPublic(propToken);
          const pData = propRes?.data?.data || propRes?.data;
          if (pData) {
            setMaintenanceTicketData(null);
            setAssetData({
              isPropertyVerification: true,
              propertyName: pData.propertyName,
              property: pData.location || `${pData.address}, ${pData.city}`,
              qrCode: pData.verificationId || propToken,
              leaseStatus: pData.leaseStatus,
              maintenanceEnabled: pData.maintenanceEnabled,
              maintenancePlan: pData.maintenancePlan,
              activeTicket: pData.activeTicket,
              verifiedAt: pData.verifiedAt,
            });
            setLoadingLookup(false);
            return;
          }
        } catch (e) {
          console.warn('Property lookup failed:', e);
        }
      }

      // 1. Detect Maintenance Ticket QR Code payload (TMS_MAINTENANCE:..., TMS-MNT-..., URL, etc.)
      const isMaint =
        raw.includes('TMS_MAINTENANCE') ||
        raw.includes('TMS-MNT') ||
        raw.includes('TMS-MNT-VERIFY') ||
        /TMS-MNT-\d{8}-[A-Z0-9]+/i.test(raw);

      if (isMaint) {
        let codeToSend = raw;
        // If it's a URL or contains TMS-MNT-... extract clean ticketCode or pass full payload
        if (!raw.startsWith('TMS_MAINTENANCE:')) {
          const match = raw.match(/TMS-MNT-\d{8}-[A-Z0-9]+/i);
          if (match) {
            codeToSend = match[0];
          }
        }

        console.log('[QR Scanner] Looking up maintenance ticket:', codeToSend);
        const maintRes = await maintenanceService.verifyTicket(codeToSend);
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

      // 2. Existing Asset / Equipment Tag QR code lookup (e.g. QR-A101-AC-01)
      setMaintenanceTicketData(null);
      const res = await technicianPortalService.lookupPropertyByQR(raw);
      const data = res?.data || res || {};

      // If backend returns data or fallback mock asset
      if (data && (data.assetName || data.propertyName || data.asset)) {
        setAssetData(data.asset || data);
      } else {
        // Fallback mock asset structure for rich asset card display if endpoint is mocked
        setAssetData({
          qrCode: raw,
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
              className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-300 ${cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Viewfinder overlay laser line animation */}
            {cameraStatus === 'active' && (
              <div className="absolute inset-x-4 h-0.5 bg-cyan-400 shadow-lg shadow-cyan-400 animate-pulse pointer-events-none" style={{ top: '50%' }} />
            )}

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

            {/* Status indicators */}
            {scanFeedback && (
              <div className="absolute top-3 inset-x-0 flex items-center justify-center gap-1.5 text-xs text-emerald-300 font-semibold bg-emerald-950/80 border border-emerald-500/40 backdrop-blur-sm py-1.5 px-3 mx-auto w-fit rounded-full pointer-events-none z-20 animate-fade-in shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{scanFeedback}</span>
              </div>
            )}

            {cameraStatus === 'starting' && !scanFeedback && (
              <div className="text-slate-400 text-xs flex flex-col items-center gap-2 p-4 relative z-10">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <span>Requesting camera permission &amp; starting feed...</span>
              </div>
            )}

            {cameraStatus === 'active' && !scanFeedback && (
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5 text-xs text-cyan-300 font-semibold bg-black/60 backdrop-blur-sm py-1 px-3 mx-auto w-fit rounded-full pointer-events-none z-10">
                <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span>Scanning for QR tag...</span>
              </div>
            )}

            {cameraStatus === 'error' && (
              <div className="text-rose-300 text-xs flex flex-col items-center gap-2.5 p-4 relative z-10 max-w-xs text-center">
                <AlertCircle className="w-7 h-7 text-rose-400 shrink-0" />
                <p className="leading-tight text-[11px]">{cameraError || 'Camera unavailable'}</p>
                <button
                  onClick={initCamera}
                  className="mt-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  Try Again
                </button>
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

      {/* ASSET OR PROPERTY VERIFICATION CARD */}
      {assetData && (
        <div className="space-y-6 animate-fade-in">
          {assetData.isPropertyVerification ? (
            /* Property Verification Result Card */
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                      PROPERTY VERIFIED
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white uppercase mt-0.5">
                    {assetData.propertyName}
                  </h2>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 font-mono">
                    <Building className="w-3.5 h-3.5 text-cyan-400" />
                    {assetData.property || 'Location Unspecified'}
                    <span className="text-slate-600">|</span>
                    <QrCode className="w-3.5 h-3.5 text-slate-500" />
                    Pass: {assetData.qrCode}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/technician/jobs')}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    View Maintenance Details
                  </button>
                </div>
              </div>

              {/* Maintenance & Lease Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Maintenance Coverage</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {assetData.maintenanceEnabled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3" />
                        INCLUDED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <ShieldAlert className="w-3 h-3" />
                        NOT INCLUDED
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Lease Status</span>
                  <p className="font-mono text-slate-200 font-bold uppercase">{assetData.leaseStatus || 'ACTIVE'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Coverage Plan</span>
                  <p className="text-slate-200 font-medium truncate">{assetData.maintenancePlan || 'Standard'}</p>
                </div>
              </div>

              {/* Active Ticket Banner */}
              {assetData.activeTicket && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">
                      ACTIVE MAINTENANCE TICKET
                    </span>
                    <p className="text-xs font-bold text-white mt-0.5">
                      Ticket: {assetData.activeTicket.ticketCode} — {assetData.activeTicket.title}
                    </p>
                    <p className="text-[11px] text-slate-300">
                      Status: <span className="font-bold text-amber-300 uppercase">{assetData.activeTicket.status.replace(/_/g, ' ')}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/technician/jobs/${assetData.activeTicket.ticketCode}`)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold shrink-0"
                  >
                    Open Ticket
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
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
          </>
          )}
        </div>
      )}
    </div>
  );
}

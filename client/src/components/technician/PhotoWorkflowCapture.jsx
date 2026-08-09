import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Lock,
  ArrowRight,
  Eye
} from 'lucide-react';
import { compressImage } from '../../utils/compressImage';
import { maintenanceService } from '../../services/api';

/**
 * PhotoWorkflowCapture Component
 * 3-Phase Guided Photo Wizard: Before -> During -> After.
 * Compresses images automatically before uploading to `/api/maintenance/:id/photos/:phase`.
 * Enforces requirement: "After" photos cannot be uploaded without at least one "Before" photo.
 */
export default function PhotoWorkflowCapture({ ticketId, ticket, existingPhotos, onPhotoUploaded, onUploadSuccess }) {
  const resolvedTicketId = ticketId || ticket?._id || ticket?.id;

  const [activePhase, setActivePhase] = useState('before'); // 'before' | 'during' | 'after'
  const [photos, setPhotos] = useState({
    before: [],
    during: [],
    after: [],
  });

  const [compressing, setCompressing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedPreview, setSelectedPreview] = useState(null);

  const fileInputRef = useRef(null);

  // Initialize photo lists from props if provided
  useEffect(() => {
    const photoSource = existingPhotos || ticket;
    if (photoSource) {
      setPhotos({
        before: photoSource.beforePhotos || photoSource.before || [],
        during: photoSource.duringPhotos || photoSource.during || [],
        after: photoSource.afterPhotos || photoSource.after || [],
      });
    }
  }, [existingPhotos, ticket]);

  const phases = [
    { key: 'before', label: '1. Before Work', description: 'Capture initial condition before work starts', icon: '📸' },
    { key: 'during', label: '2. In-Progress', description: 'Capture work evidence & replaced parts', icon: '🔧' },
    { key: 'after', label: '3. After Work', description: 'Capture completed repair & clean work area', icon: '✨' },
  ];

  // Validation: Check if "After" phase is locked due to missing "Before" photos
  const isAfterPhaseLocked = activePhase === 'after' && photos.before.length === 0;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be chosen again if needed
    e.target.value = '';

    if (!resolvedTicketId) {
      setErrorMsg('Ticket ID is missing. Cannot upload photo.');
      return;
    }

    // Enforce "After" photo constraint
    if (activePhase === 'after' && photos.before.length === 0) {
      setErrorMsg('Cannot upload "After" photos without at least one "Before" photo.');
      return;
    }

    setErrorMsg(null);

    try {
      // 1. Compress Image
      setCompressing(true);
      const compressedFile = await compressImage(file, 1920, 0.8);
      setCompressing(false);

      // 2. Prepare FormData
      setUploading(true);
      const formData = new FormData();
      formData.append('photos', compressedFile);
      formData.append('photo', compressedFile);
      formData.append('phase', activePhase);

      // 3. Upload to API
      const res = await maintenanceService.uploadPhasePhotos(resolvedTicketId, activePhase, formData);
      const uploadedData = res?.data?.data || res?.data || res || {};

      // New photo record or URL
      const newPhotoObj = uploadedData.photo || uploadedData.url || {
        url: URL.createObjectURL(compressedFile),
        uploadedAt: new Date().toISOString(),
        _id: Date.now().toString(),
      };

      const updatedPhasePhotos = [...photos[activePhase], newPhotoObj];
      const updatedAllPhotos = {
        ...photos,
        [activePhase]: updatedPhasePhotos,
      };

      setPhotos(updatedAllPhotos);

      if (onPhotoUploaded) {
        onPhotoUploaded(updatedAllPhotos);
      }
      if (onUploadSuccess) {
        onUploadSuccess(updatedAllPhotos);
      }
    } catch (err) {
      console.error('Failed to process/upload photo:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Photo upload failed. Please try again.');
    } finally {
      setCompressing(false);
      setUploading(false);
    }
  };

  const triggerCamera = () => {
    if (isAfterPhaseLocked) {
      setErrorMsg('Upload at least 1 "Before" photo first before capturing "After" photos.');
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 backdrop-blur-xl space-y-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">3-Phase Photo Evidence Wizard</h3>
            <p className="text-[11px] text-slate-400">Guided photo workflow with auto-compression</p>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Phase Stepper Tabs */}
      <div className="grid grid-cols-3 gap-2">
        {phases.map((phase) => {
          const count = photos[phase.key]?.length || 0;
          const isActive = activePhase === phase.key;
          const isCompleted = count > 0;
          const isLocked = phase.key === 'after' && photos.before.length === 0;

          return (
            <button
              key={phase.key}
              onClick={() => {
                setActivePhase(phase.key);
                setErrorMsg(null);
              }}
              className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                isActive
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-base">{phase.icon}</span>
                {isCompleted ? (
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                ) : isLocked ? (
                  <Lock className="w-3.5 h-3.5 text-amber-400/80" />
                ) : null}
              </div>
              <div>
                <p className="text-xs font-bold truncate">{phase.label}</p>
                <span className="text-[10px] text-slate-500">{count} captured</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Phase Info Banner */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
        <div>
          <span className="text-cyan-400 font-bold uppercase tracking-wider text-[10px] block mb-0.5">
            Active Phase
          </span>
          <p className="text-slate-200 font-semibold">
            {phases.find((p) => p.key === activePhase)?.description}
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-fade-scale">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Warning Alert if "After" is locked */}
      {isAfterPhaseLocked && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            <strong>"After" photos locked:</strong> You must upload at least 1 "Before" photo prior to uploading post-repair photos.
          </span>
        </div>
      )}

      {/* Capture Action Area */}
      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/40 space-y-3">
        {compressing || uploading ? (
          <div className="flex flex-col items-center gap-2 py-4 text-cyan-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-xs font-semibold">
              {compressing ? 'Compressing image (~200-400KB)...' : 'Uploading phase photo...'}
            </p>
          </div>
        ) : (
          <>
            <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Camera className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-white">Upload or Capture {activePhase.toUpperCase()} Photo</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Supports direct mobile camera or file picker</p>
            </div>
            <button
              onClick={triggerCamera}
              disabled={isAfterPhaseLocked}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg ${
                isAfterPhaseLocked
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20 cursor-pointer active:scale-95'
              }`}
            >
              <Upload className="w-4 h-4" />
              {isAfterPhaseLocked ? 'Locked (Requires Before Photo)' : `Add ${activePhase.toUpperCase()} Photo`}
            </button>
          </>
        )}
      </div>

      {/* Photo Gallery for current phase */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Captured Photos ({photos[activePhase].length})</span>
        </h4>

        {photos[activePhase].length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">No photos uploaded for this phase yet.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-1">
            {photos[activePhase].map((photo, idx) => {
              const url = typeof photo === 'string' ? photo : photo.url || photo.path;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedPreview(url)}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-800 cursor-pointer hover:border-cyan-400 transition-all"
                >
                  <img src={url} alt={`Phase ${activePhase} ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Photo Preview Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-2 space-y-3">
            <img src={selectedPreview} alt="Preview" className="w-full max-h-[70vh] object-contain rounded-xl" />
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedPreview(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

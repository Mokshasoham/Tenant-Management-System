import React, { useRef, memo } from 'react';
import { Camera, Trash2, X, AlertTriangle, Check, Upload } from 'lucide-react';
import ActionButton from './primitives/ActionButton';

export const ProfilePhotoModal = memo(({
  user,
  modalState,
  onClose,
  onFileSelect,
  onUpload,
  onDelete
}) => {
  const fileInputRef = useRef(null);

  if (!modalState.isOpen) return null;

  const { previewUrl, loading, deleting, error, successMsg } = modalState;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card/90 border border-border rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative space-y-6 backdrop-blur-xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Camera className="w-5 h-5" />
            </div>
            Profile Photo Manager
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Preview & Drag-Drop Trigger */}
        <div className="flex flex-col items-center justify-center space-y-5">
          <div className="relative w-44 h-44 rounded-full border-4 border-emerald-500/30 overflow-hidden shadow-2xl bg-muted/40 flex items-center justify-center ring-4 ring-emerald-500/10 transition-transform hover:scale-105">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : user?.avatar ? (
              <img src={user.avatar} alt={user.firstName} className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-14 h-14 text-muted-foreground/40" />
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground font-medium max-w-xs leading-relaxed">
            Images are automatically validated, stripped of metadata & compressed before upload.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => onFileSelect(e.target.files?.[0])}
          />

          <div className="flex items-center gap-3 w-full">
            <ActionButton
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              icon={Upload}
              className="flex-1 py-3"
            >
              Choose Photo
            </ActionButton>

            {user?.avatar && (
              <ActionButton
                type="button"
                variant="danger"
                onClick={onDelete}
                loading={deleting}
                icon={Trash2}
                className="py-3"
              >
                Remove
              </ActionButton>
            )}
          </div>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
          <ActionButton type="button" variant="ghost" onClick={onClose}>
            Cancel
          </ActionButton>
          {previewUrl && (
            <ActionButton
              type="button"
              variant="primary"
              onClick={onUpload}
              loading={loading}
            >
              Save New Photo
            </ActionButton>
          )}
        </div>

      </div>
    </div>
  );
});

ProfilePhotoModal.displayName = 'ProfilePhotoModal';
export default ProfilePhotoModal;

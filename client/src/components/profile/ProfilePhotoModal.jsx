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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" /> Profile Photo Manager
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Preview */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative w-40 h-40 rounded-full border-4 border-border overflow-hidden shadow-inner bg-muted flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : user?.avatar ? (
              <img src={user.avatar} alt={user.firstName} className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-12 h-12 text-muted-foreground/40" />
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground font-medium">
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
              className="flex-1"
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
              >
                Remove
              </ActionButton>
            )}
          </div>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
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

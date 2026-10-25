import React, { useRef, useState } from 'react';
import { Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../PremiumUI';
import { formatFileSize } from '../../../utils/documentHelpers';
import { useLanguage } from '../../../context/LanguageContext';

export const FileUploader = ({
  onFileSelect,
  onFileSelected,
  accept = '.pdf,.png,.jpg,.jpeg',
  maxSizeBytes = 10 * 1024 * 1024,
  label,
  hint,
  buttonText,
  className = '',
  disabled = false,
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const displayLabel = label || t('verification.dragAndDropHint', 'Drag and drop your document here, or browse');
  const displayHint = hint || t('verification.supportedFormatsHint', 'Supports PDF, PNG, JPG up to 10MB');
  const displayBtnText = buttonText || t('verification.selectFile', 'Select File');

  const notifySelection = (file) => {
    if (onFileSelect) onFileSelect(file);
    if (onFileSelected) onFileSelected(file);
  };

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > maxSizeBytes) {
      setErrorMessage(
        t('verification.fileTooLarge', 'File exceeds maximum size limit of {{size}}', {
          size: formatFileSize(maxSizeBytes),
        })
      );
      return;
    }
    setErrorMessage(null);
    setSelectedFile(file);
    notifySelection(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const clearFile = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border/80 hover:border-primary/40 bg-card/50 hover:bg-card'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => handleFile(e.target.files[0])}
          className="hidden"
          disabled={disabled}
        />

        {selectedFile ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/60 border border-border">
            <div className="flex items-center gap-3 text-left">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              title={t('verification.removeFile', 'Remove File')}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-foreground mt-1">{displayLabel}</p>
            <p className="text-xs text-muted-foreground">{displayHint}</p>
            <Button variant="outline" type="button" className="mt-2 text-xs py-1.5 px-4" disabled={disabled}>
              {displayBtnText}
            </Button>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mt-2 text-xs text-rose-500 font-semibold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default FileUploader;

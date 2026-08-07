import React from 'react';

export const UploadProgressBar = ({ progress = 0, label = 'Uploading file...', className = '' }) => {
  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-foreground">{label}</span>
        <span className="text-primary font-bold">{progress}%</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default UploadProgressBar;

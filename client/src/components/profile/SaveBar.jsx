import React, { memo } from 'react';
import { Save, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import ActionButton from './primitives/ActionButton';

export const SaveBar = memo(({
  isDirty,
  saveState, // 'idle' | 'modified' | 'saving' | 'saved' | 'error'
  serverMsg,
  onSave,
  onReset
}) => {
  if (!isDirty && saveState === 'idle') return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[90%] bg-popover/90 backdrop-blur-md border border-border rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-300 flex items-center justify-between gap-4">
      
      {/* State Text Indicator */}
      <div className="flex items-center gap-2">
        {saveState === 'saved' ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        ) : saveState === 'error' ? (
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
        ) : (
          <Save className="w-5 h-5 text-amber-500 animate-bounce shrink-0" />
        )}

        <div className="text-xs font-bold">
          {saveState === 'saving' ? (
            <span className="text-foreground">Saving changes...</span>
          ) : saveState === 'saved' ? (
            <span className="text-emerald-500">{serverMsg || 'Saved successfully!'}</span>
          ) : saveState === 'error' ? (
            <span className="text-rose-500">{serverMsg || 'Validation failed. Check fields.'}</span>
          ) : (
            <span className="text-foreground">You have unsaved changes</span>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <ActionButton
          type="button"
          variant="outline"
          onClick={onReset}
          disabled={saveState === 'saving'}
          icon={RotateCcw}
        >
          Reset
        </ActionButton>

        <ActionButton
          type="button"
          variant="primary"
          onClick={onSave}
          loading={saveState === 'saving'}
          icon={Save}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white"
        >
          {saveState === 'saving' ? 'Saving...' : 'Save All Changes'}
        </ActionButton>
      </div>

    </div>
  );
});

SaveBar.displayName = 'SaveBar';
export default SaveBar;

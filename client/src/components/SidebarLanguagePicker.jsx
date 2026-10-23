import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, Check } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';
import { cn } from '../utils/cn';

export function SidebarLanguagePicker({ isOpen, colorTheme = 'dark', effectiveRole = 'tenant' }) {
  const { language, setLanguage } = useLanguage();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const [menuPos, setMenuPos] = useState({
    bottom: 0,
    left: 0,
    width: 160,
    maxHeight: 360,
  });

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 160;
    const gap = 8;

    let left;
    if (isOpen) {
      // In expanded sidebar: align right edge of menu with right edge of trigger
      left = rect.right - menuWidth;
    } else {
      // In collapsed sidebar: align left edge of menu with left edge of trigger
      left = rect.left;
    }

    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

    // Viewport clamping (ensure at least 12px margin on left and right)
    left = Math.max(12, Math.min(left, windowWidth - menuWidth - 12));
    const bottom = Math.max(12, windowHeight - rect.top + gap);
    const maxHeight = Math.min(360, Math.max(160, rect.top - 16));

    setMenuPos({
      bottom,
      left,
      width: menuWidth,
      maxHeight,
    });
  }, [isOpen]);

  // Click-outside, Escape key, and window resize/scroll listeners
  useEffect(() => {
    if (!showLangPicker) return;
    updateMenuPosition();

    const handlePointerDown = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setShowLangPicker(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowLangPicker(false);
        triggerRef.current?.focus();
      }
    };

    const handleWindowChange = () => {
      updateMenuPosition();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [showLangPicker, updateMenuPosition]);

  // When isOpen changes while open, track animation smoothly so menu never gets misplaced
  useEffect(() => {
    if (!showLangPicker) return;
    updateMenuPosition();

    let animationFrameId;
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const duration = 350;

    const trackTransition = (currentTime) => {
      updateMenuPosition();
      if (currentTime - startTime < duration) {
        animationFrameId = requestAnimationFrame(trackTransition);
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      animationFrameId = requestAnimationFrame(trackTransition);
    }

    return () => {
      if (animationFrameId && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isOpen, showLangPicker, updateMenuPosition]);

  return (
    <div className={cn("relative", !isOpen && "w-full")}>
      {/* Trigger Button */}
      <motion.button
        ref={triggerRef}
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={() => setShowLangPicker((v) => !v)}
        aria-haspopup="true"
        aria-expanded={showLangPicker}
        aria-label="Select language"
        title={`Language: ${language?.toUpperCase() || 'EN'}`}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all select-none",
          !isOpen && "w-full justify-center py-2.5"
        )}
        style={{
          background: colorTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          border: colorTheme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
          color: 'var(--text-secondary)',
        }}
      >
        <Languages className="w-4 h-4 shrink-0" />
        {isOpen && <span className="uppercase">{language}</span>}
      </motion.button>

      {/* Language Options Portal */}
      <AnimatePresence>
        {showLangPicker && typeof document !== 'undefined' && createPortal(
          <motion.div
            ref={menuRef}
            key="sidebar-language-dropdown"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="menu"
            aria-label="Language selection"
            data-testid="sidebar-language-menu"
            className={cn(
              "fixed rounded-xl overflow-hidden shadow-2xl transition-colors backdrop-blur-md",
              `theme-${effectiveRole}`
            )}
            style={{
              position: 'fixed',
              left: `${menuPos.left}px`,
              bottom: `${menuPos.bottom}px`,
              minWidth: `${menuPos.width}px`,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              boxShadow: colorTheme === 'dark'
                ? '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)'
                : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              maxHeight: `${menuPos.maxHeight}px`,
              overflowY: 'auto',
              zIndex: 9999,
            }}
          >
            {SUPPORTED_LANGUAGES.map(({ code, name, nativeName, flag }) => {
              const isSelected = code === language;
              return (
                <button
                  key={code}
                  type="button"
                  role="menuitem"
                  aria-selected={isSelected}
                  data-testid={`lang-option-${code}`}
                  onClick={() => {
                    setLanguage(code);
                    setShowLangPicker(false);
                    triggerRef.current?.focus();
                  }}
                  className={cn(
                    "w-full text-left px-3.5 py-2.5 text-xs font-bold transition-all flex items-center justify-between gap-2",
                    "hover:bg-black/5 dark:hover:bg-white/10"
                  )}
                  style={{
                    color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                    background: isSelected ? 'rgba(var(--primary), 0.1)' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-sm select-none shrink-0">{flag}</span>
                    <span className="truncate">{nativeName || name}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  )}
                </button>
              );
            })}
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}

export default SidebarLanguagePicker;

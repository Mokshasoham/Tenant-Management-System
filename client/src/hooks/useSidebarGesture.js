import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to handle two-finger laptop trackpad horizontal swipes
 * and touchscreen swipes for opening and closing the sidebar.
 *
 * Requirements:
 * - Two-finger swipe LEFT -> Close/collapse sidebar (when open)
 * - Two-finger swipe RIGHT -> Open/expand sidebar (when closed)
 * - Slow swipes: sidebar tracks the fingers in real-time
 * - Fast swipes (flicks): immediately complete open/close
 * - Threshold & boundary checks
 * - Full protection for normal vertical scrolling
 */
export function useSidebarGesture(isOpen, setIsOpen) {
  const [gestureOffset, setGestureOffset] = useState(0);
  const [isGestureActive, setIsGestureActive] = useState(false);

  const stateRef = useRef({
    isOpen,
    accumulatedDeltaX: 0,
    accumulatedDeltaY: 0,
    isGestureActive: false,
    isLocked: false,
    touchStartX: 0,
    touchStartY: 0,
    touchStartTime: 0,
  });

  // Keep stateRef synchronized with current isOpen state
  useEffect(() => {
    stateRef.current.isOpen = isOpen;
  }, [isOpen]);

  const finishTimeoutRef = useRef(null);

  const finishGesture = useCallback(() => {
    const { isOpen: currentlyOpen, accumulatedDeltaX, isGestureActive: active } = stateRef.current;
    if (!active) return;

    stateRef.current.isGestureActive = false;
    setIsGestureActive(false);
    setGestureOffset(0);

    const THRESHOLD = 65;

    if (currentlyOpen) {
      // Was open: swipe left produced positive accumulatedDeltaX
      if (accumulatedDeltaX >= THRESHOLD) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    } else {
      // Was closed: swipe right produced negative accumulatedDeltaX
      if (-accumulatedDeltaX >= THRESHOLD) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    }

    // Cooldown lock to absorb momentum and prevent bounce
    stateRef.current.isLocked = true;
    stateRef.current.accumulatedDeltaX = 0;
    stateRef.current.accumulatedDeltaY = 0;
    setTimeout(() => {
      stateRef.current.isLocked = false;
    }, 350);
  }, [setIsOpen]);

  useEffect(() => {
    const SIDEBAR_WIDTH = 288;

    const handleWheel = (e) => {
      // If event originated inside an element that handles its own horizontal gesture
      if (e.target && e.target.closest && e.target.closest('[data-no-sidebar-swipe]')) {
        return;
      }

      if (stateRef.current.isLocked) return;

      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);

      // Normal vertical scrolling protection
      if (!stateRef.current.isGestureActive) {
        // If vertical is greater than horizontal or horizontal is negligible, do not interfere
        if (absY >= absX || absX < 3) {
          return;
        }
        // Require horizontal movement to be clearly dominant
        if (absX < absY * 1.3) {
          return;
        }
      }

      const now = Date.now();
      const currentlyOpen = stateRef.current.isOpen;

      // ── FAST SWIPE / FLICK DETECTION ──
      // Fast flick left when open -> immediate smooth close
      if (currentlyOpen && e.deltaX >= 32) {
        if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
        stateRef.current.isLocked = true;
        stateRef.current.isGestureActive = false;
        setIsGestureActive(false);
        setGestureOffset(0);
        setIsOpen(false);
        setTimeout(() => {
          stateRef.current.isLocked = false;
          stateRef.current.accumulatedDeltaX = 0;
        }, 350);
        return;
      }

      // Fast flick right when closed -> immediate smooth open
      if (!currentlyOpen && e.deltaX <= -32) {
        if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
        stateRef.current.isLocked = true;
        stateRef.current.isGestureActive = false;
        setIsGestureActive(false);
        setGestureOffset(0);
        setIsOpen(true);
        setTimeout(() => {
          stateRef.current.isLocked = false;
          stateRef.current.accumulatedDeltaX = 0;
        }, 350);
        return;
      }

      // ── BOUNDARIES ──
      // When already open: swiping RIGHT (deltaX < 0) does nothing
      if (currentlyOpen && stateRef.current.accumulatedDeltaX <= 0 && e.deltaX < 0) {
        return;
      }
      // When already closed: swiping LEFT (deltaX > 0) does nothing
      if (!currentlyOpen && stateRef.current.accumulatedDeltaX >= 0 && e.deltaX > 0) {
        return;
      }

      // ── SLOW SWIPE TRACKING ──
      if (!stateRef.current.isGestureActive) {
        stateRef.current.isGestureActive = true;
        stateRef.current.accumulatedDeltaX = 0;
        stateRef.current.accumulatedDeltaY = 0;
        setIsGestureActive(true);
      }

      stateRef.current.accumulatedDeltaX += e.deltaX;
      stateRef.current.accumulatedDeltaY += e.deltaY;

      let offset = 0;
      if (currentlyOpen) {
        // Shifting leftward: 0 -> -288
        const clampedDelta = Math.max(0, Math.min(SIDEBAR_WIDTH, stateRef.current.accumulatedDeltaX));
        offset = -clampedDelta;
      } else {
        // Shifting rightward: -288 -> 0
        const clampedDelta = Math.max(0, Math.min(SIDEBAR_WIDTH, -stateRef.current.accumulatedDeltaX));
        offset = clampedDelta - SIDEBAR_WIDTH;
      }

      setGestureOffset(offset);

      // Debounce release after user pauses or finishes trackpad contact
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = setTimeout(() => {
        finishGesture();
      }, 140);
    };

    // ── TOUCHSCREEN SWIPE HANDLERS ──
    const handleTouchStart = (e) => {
      if (e.target && e.target.closest && e.target.closest('[data-no-sidebar-swipe]')) {
        return;
      }
      if (e.touches && e.touches.length > 0) {
        stateRef.current.touchStartX = e.touches[0].clientX;
        stateRef.current.touchStartY = e.touches[0].clientY;
        stateRef.current.touchStartTime = Date.now();
      }
    };

    const handleTouchMove = (e) => {
      if (stateRef.current.isLocked || !e.touches || e.touches.length === 0) return;
      if (e.target && e.target.closest && e.target.closest('[data-no-sidebar-swipe]')) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = stateRef.current.touchStartX - currentX; // positive when moving left
      const diffY = stateRef.current.touchStartY - currentY;
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);

      if (!stateRef.current.isGestureActive) {
        if (absY >= absX || absX < 6 || absX < absY * 1.3) return;
      }

      const currentlyOpen = stateRef.current.isOpen;
      // Boundaries
      if (currentlyOpen && diffX < 0) return;
      if (!currentlyOpen && diffX > 0) return;

      if (!stateRef.current.isGestureActive) {
        stateRef.current.isGestureActive = true;
        setIsGestureActive(true);
      }

      stateRef.current.accumulatedDeltaX = diffX;

      let offset = 0;
      if (currentlyOpen) {
        const clampedDelta = Math.max(0, Math.min(SIDEBAR_WIDTH, diffX));
        offset = -clampedDelta;
      } else {
        const clampedDelta = Math.max(0, Math.min(SIDEBAR_WIDTH, -diffX));
        offset = clampedDelta - SIDEBAR_WIDTH;
      }
      setGestureOffset(offset);
    };

    const handleTouchEnd = (e) => {
      if (!stateRef.current.isGestureActive) return;
      finishGesture();
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    };
  }, [finishGesture, setIsOpen]);

  return { gestureOffset, isGestureActive };
}

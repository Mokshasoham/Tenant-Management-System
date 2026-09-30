import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

/**
 * Smoothly interpolates pill width based on current center position
 * between adjacent navigation items so the lens fluidly adapts as it glides.
 */
function getInterpolatedWidth(centerX, items) {
    if (!items || items.length === 0) return 0;
    if (items.length === 1) return items[0].width;
    if (centerX <= items[0].centerX) return items[0].width;
    if (centerX >= items[items.length - 1].centerX) return items[items.length - 1].width;

    for (let i = 0; i < items.length - 1; i++) {
        const c1 = items[i].centerX;
        const c2 = items[i + 1].centerX;
        if (centerX >= c1 && centerX <= c2) {
            const rawT = (centerX - c1) / (c2 - c1);
            // Smoothstep curve for seamless optical lens breathing
            const t = rawT * rawT * (3 - 2 * rawT);
            return Math.round((1 - t) * items[i].width + t * items[i + 1].width);
        }
    }
    return items[0].width;
}

/**
 * Calculates the nearest navigation item and applies subtle magnetic attraction
 * when the lens center approaches an item center.
 */
function getEffectiveCenterAndNearest(rawCenter, items) {
    if (!items || items.length === 0) return { nearestIdx: 0, effectiveCenter: rawCenter };

    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < items.length; i++) {
        const dist = Math.abs(rawCenter - items[i].centerX);
        if (dist < minDistance) {
            minDistance = dist;
            nearestIdx = i;
        }
    }

    // Magnetic attraction: within 32px radius, gently guide the lens toward the item center
    const magneticRadius = 32;
    let effectiveCenter = rawCenter;
    if (minDistance < magneticRadius) {
        const pull = Math.pow(1 - minDistance / magneticRadius, 1.4) * 0.35;
        effectiveCenter = rawCenter + (items[nearestIdx].centerX - rawCenter) * pull;
    }

    return { nearestIdx, effectiveCenter };
}

export default function DraggableNavPill({ navItems, className }) {
    const navigate = useNavigate();
    const location = useLocation();
    const containerRef = useRef(null);
    const itemRefs = useRef([]);
    const lensRef = useRef(null);
    const [itemsData, setItemsData] = useState([]);
    const [isMeasured, setIsMeasured] = useState(false);

    // Active route resolution
    const isActive = useCallback((path) => {
        if (path === '/') return location.pathname === '/';
        const cleanPath = path.replace(/^\//, '');
        return location.pathname === path ||
               location.pathname.startsWith(`/${cleanPath}`) ||
               location.pathname.startsWith(`/public/${cleanPath}`);
    }, [location.pathname]);

    const activeIndex = Math.max(0, navItems.findIndex(item => isActive(item.path)));

    // Measurement of fixed navigation targets
    const measureItems = useCallback(() => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const data = navItems.map((_, idx) => {
            const el = itemRefs.current[idx];
            if (!el) return { left: 0, width: 0, centerX: 0, top: 0, height: 0 };
            const rect = el.getBoundingClientRect();
            const left = rect.left - containerRect.left;
            const top = rect.top - containerRect.top;
            const width = rect.width;
            const height = rect.height;
            return {
                left,
                top,
                width,
                height,
                centerX: left + width / 2
            };
        });
        setItemsData(data);
        setIsMeasured(true);
    }, [navItems]);

    useEffect(() => {
        measureItems();
        const t1 = setTimeout(measureItems, 60);
        const t2 = setTimeout(measureItems, 250);
        window.addEventListener('resize', measureItems);

        let resizeObserver;
        if (window.ResizeObserver && containerRef.current) {
            resizeObserver = new ResizeObserver(() => measureItems());
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            window.removeEventListener('resize', measureItems);
            if (resizeObserver) resizeObserver.disconnect();
        };
    }, [measureItems, location.pathname]);

    // Drag, lift, and hover state
    const [isDragging, setIsDragging] = useState(false);
    const [isLifted, setIsLifted] = useState(false);
    const [dragCenter, setDragCenter] = useState(null);
    const [hoveredIndex, setHoveredIndex] = useState(null);

    // Gesture tracking ref to prevent stale closures during pointer capture
    const gestureRef = useRef({
        isDown: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        initialCenter: 0,
        isDragging: false,
        isLifted: false,
        lastTapTime: 0,
        longPressTimer: null,
        holdTimer: null,
        hasMoved: false
    });

    const activateDestination = useCallback((item) => {
        if (!item) return;

        // If selecting the active route, smoothly scroll to top
        if (isActive(item.path)) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Navigate to the legitimate existing route
        navigate(item.path);
    }, [isActive, navigate]);

    // Handle clicking a fixed navigation item directly
    const handleItemClick = (idx) => {
        if (gestureRef.current.hasMoved) return;
        activateDestination(navItems[idx]);
    };

    // Handle pointer down on the floating glass lens
    const handleLensPointerDown = (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        const currentItem = itemsData[activeIndex] || itemsData[0];
        if (!currentItem) return;

        const now = Date.now();
        const isDoubleTap = now - gestureRef.current.lastTapTime < 300;
        gestureRef.current.lastTapTime = now;

        gestureRef.current.isDown = true;
        gestureRef.current.pointerId = e.pointerId;
        gestureRef.current.startX = e.clientX;
        gestureRef.current.startY = e.clientY;
        gestureRef.current.initialCenter = currentItem.centerX;
        gestureRef.current.hasMoved = false;

        const isTouch = e.pointerType === 'touch';

        // Double tap engages lift mode immediately
        if (isDoubleTap) {
            gestureRef.current.isLifted = true;
            gestureRef.current.isDragging = true;
            setIsLifted(true);
            setIsDragging(true);
            setDragCenter(currentItem.centerX);
            setHoveredIndex(activeIndex);
            try {
                e.currentTarget.setPointerCapture(e.pointerId);
            } catch (_) {}
            return;
        }

        if (isTouch) {
            // Touch devices: long press (180ms) lifts the lens
            gestureRef.current.longPressTimer = setTimeout(() => {
                if (gestureRef.current.isDown && !gestureRef.current.hasMoved) {
                    gestureRef.current.isLifted = true;
                    gestureRef.current.isDragging = true;
                    setIsLifted(true);
                    setIsDragging(true);
                    setDragCenter(currentItem.centerX);
                    setHoveredIndex(activeIndex);
                    try {
                        e.currentTarget.setPointerCapture(e.pointerId);
                    } catch (_) {}
                    if (navigator.vibrate) navigator.vibrate(10);
                }
            }, 180);
        } else {
            // Desktop mouse: tactile lift on click-and-hold (80ms)
            gestureRef.current.holdTimer = setTimeout(() => {
                if (gestureRef.current.isDown) {
                    gestureRef.current.isLifted = true;
                    setIsLifted(true);
                }
            }, 80);
        }
    };

    // Handle pointer move while dragging the lens
    const handlePointerMove = (e) => {
        if (!gestureRef.current.isDown) return;

        const deltaX = e.clientX - gestureRef.current.startX;
        const deltaY = e.clientY - gestureRef.current.startY;
        const dist = Math.hypot(deltaX, deltaY);
        const isTouch = e.pointerType === 'touch';

        // Cancel if vertical scroll is dominant on touch before horizontal drag engages
        if (isTouch && !gestureRef.current.isDragging) {
            if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
                clearTimeout(gestureRef.current.longPressTimer);
                clearTimeout(gestureRef.current.holdTimer);
                gestureRef.current.isDown = false;
                gestureRef.current.isLifted = false;
                setIsLifted(false);
                return;
            }
        }

        // Activate drag state when moving past threshold
        if (dist > 3) {
            gestureRef.current.hasMoved = true;
            clearTimeout(gestureRef.current.longPressTimer);
            clearTimeout(gestureRef.current.holdTimer);

            if (!gestureRef.current.isDragging) {
                gestureRef.current.isDragging = true;
                gestureRef.current.isLifted = true;
                setIsDragging(true);
                setIsLifted(true);
                try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                } catch (_) {}
            }
        }

        // Update optical lens position
        if (gestureRef.current.isDragging && itemsData.length > 0) {
            e.preventDefault();

            const rawCenter = gestureRef.current.initialCenter + deltaX;
            // Clamp within navbar range
            const minCenter = itemsData[0].centerX - 8;
            const maxCenter = itemsData[itemsData.length - 1].centerX + 8;
            const clampedCenter = Math.max(minCenter, Math.min(maxCenter, rawCenter));

            setDragCenter(clampedCenter);

            const { nearestIdx } = getEffectiveCenterAndNearest(clampedCenter, itemsData);
            setHoveredIndex(nearestIdx);
        }
    };

    // Handle pointer release
    const handlePointerUp = (e) => {
        clearTimeout(gestureRef.current.longPressTimer);
        clearTimeout(gestureRef.current.holdTimer);

        if (!gestureRef.current.isDown) return;

        const wasDragging = gestureRef.current.isDragging;
        const hasMoved = gestureRef.current.hasMoved;

        try {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        } catch (_) {}

        gestureRef.current.isDown = false;
        gestureRef.current.isDragging = false;
        gestureRef.current.isLifted = false;
        setIsLifted(false);
        setIsDragging(false);

        if (wasDragging && dragCenter !== null && itemsData.length > 0) {
            // Determine nearest item on release
            const { nearestIdx } = getEffectiveCenterAndNearest(dragCenter, itemsData);
            setDragCenter(null);
            setHoveredIndex(null);

            // Snap & activate destination of the nearest item
            activateDestination(navItems[nearestIdx]);
        } else {
            setDragCenter(null);
            setHoveredIndex(null);

            // Direct click on the lens without dragging
            if (!hasMoved) {
                activateDestination(navItems[activeIndex]);
            }
        }
    };

    // Compute optical lens dimensions & coordinates
    let currentLeft = 0;
    let currentWidth = 0;
    let currentTop = 0;
    let currentHeight = 0;

    if (itemsData.length > 0) {
        if (isDragging && dragCenter !== null) {
            const { nearestIdx, effectiveCenter } = getEffectiveCenterAndNearest(dragCenter, itemsData);
            const w = getInterpolatedWidth(effectiveCenter, itemsData);
            currentLeft = effectiveCenter - w / 2;
            currentWidth = w;
            currentTop = itemsData[nearestIdx]?.top ?? 0;
            currentHeight = itemsData[nearestIdx]?.height ?? 0;
        } else {
            const currentItem = itemsData[activeIndex] || itemsData[0];
            currentLeft = currentItem?.left ?? 0;
            currentWidth = currentItem?.width ?? 0;
            currentTop = currentItem?.top ?? 0;
            currentHeight = currentItem?.height ?? 0;
        }
    }

    // Determine which item is visually highlighted through the lens
    const activeOrHoveredIndex = isDragging && hoveredIndex !== null ? hoveredIndex : activeIndex;

    return (
        <nav
            ref={containerRef}
            aria-label="Primary Navigation"
            className={cn(
                "relative flex items-center gap-1 xl:gap-2 p-1 rounded-full select-none",
                className
            )}
            style={{ touchAction: 'pan-y' }}
        >
            {/* ══════════════════════════════════════════════════════
                1. FIXED NAVIGATION LABELS (LAYER 1: z-10)
                - Stay 100% stationary in their layout positions
                - Do NOT move, shift, or scroll during dragging
                - Visible through the transparent floating glass lens
            ══════════════════════════════════════════════════════ */}
            {navItems.map((item, idx) => {
                const isUnderLens = idx === activeOrHoveredIndex;

                return (
                    <button
                        key={item.path}
                        ref={el => itemRefs.current[idx] = el}
                        type="button"
                        onClick={() => handleItemClick(idx)}
                        className={cn(
                            "px-4 py-2 rounded-full text-xs font-semibold relative z-10 select-none whitespace-nowrap cursor-pointer",
                            "transition-all duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                            isUnderLens
                                ? "text-white dark:text-white font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                                : "text-slate-600 dark:text-slate-300/80 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.08] hover:backdrop-blur-sm"
                        )}
                        aria-current={idx === activeIndex ? 'page' : undefined}
                    >
                        {item.label}
                    </button>
                );
            })}

            {/* ══════════════════════════════════════════════════════
                2. FLOATING TRANSLUCENT SELECTOR LENS (LAYER 2: z-20)
                - Sits above the navigation labels as a floating glass optic
                - Follows the user's cursor / touch smoothly
                - Features translucent emerald/teal liquid glass + soft inner highlight
                  + illuminated border + ambient glow + high transparency
                - Sits comfortably around the selected item
            ══════════════════════════════════════════════════════ */}
            {isMeasured && currentWidth > 0 && (
                <motion.div
                    ref={lensRef}
                    aria-hidden="true"
                    onPointerDown={handleLensPointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className={cn(
                        "absolute z-20 rounded-full select-none cursor-grab active:cursor-grabbing",
                        "transition-shadow",
                        // Translucent emerald/teal liquid glass lens
                        "bg-emerald-500/15 dark:bg-gradient-to-r dark:from-emerald-500/[0.22] dark:via-teal-500/[0.26] dark:to-emerald-500/[0.20]",
                        "border border-emerald-400/50 dark:border-emerald-400/60"
                    )}
                    style={{
                        top: currentTop,
                        height: currentHeight,
                        backdropFilter: 'blur(10px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                        // Luminous emerald glass specular reflection & ambient depth
                        boxShadow: isLifted
                            ? 'inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.55), inset 0 -1px 2px 0 rgba(0, 0, 0, 0.25), inset 0 0 18px 0 rgba(52, 211, 153, 0.35), 0 14px 28px -4px rgba(0, 0, 0, 0.45), 0 0 24px 2px rgba(16, 185, 129, 0.42)'
                            : 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.40), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.15), inset 0 0 14px 0 rgba(52, 211, 153, 0.22), 0 4px 16px -2px rgba(16, 185, 129, 0.28), 0 0 10px 0 rgba(16, 185, 129, 0.18)'
                    }}
                    animate={{
                        x: currentLeft,
                        width: currentWidth,
                        y: isLifted ? -3 : 0,
                        scale: isLifted ? 1.03 : 1,
                    }}
                    transition={
                        isDragging
                            ? {
                                x: { duration: 0 },
                                width: { duration: 0.08, ease: "easeOut" },
                                y: { duration: 0.12, ease: "easeOut" },
                                scale: { duration: 0.12, ease: "easeOut" }
                            }
                            : {
                                type: "spring",
                                stiffness: 420,
                                damping: 32,
                                mass: 0.8,
                                y: { duration: 0.15, ease: "easeOut" },
                                scale: { duration: 0.15, ease: "easeOut" }
                            }
                    }
                >
                    {/* Layer 3: Glass specular highlight gradients */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 via-transparent to-black/15 pointer-events-none" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400/15 via-teal-300/20 to-emerald-400/15 opacity-80 pointer-events-none" />
                    
                    {/* Tactile elevated glow indicator when lifted */}
                    {isLifted && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-emerald-400/90 shadow-[0_0_8px_rgba(16,185,129,0.9)] pointer-events-none" />
                    )}
                </motion.div>
            )}
        </nav>
    );
}

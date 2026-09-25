import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

/**
 * Smoothly interpolates pill width based on current center position
 * between adjacent navigation items.
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
            // Smoothstep curve for seamless pill expansion/contraction
            const t = rawT * rawT * (3 - 2 * rawT);
            return Math.round((1 - t) * items[i].width + t * items[i + 1].width);
        }
    }
    return items[0].width;
}

/**
 * Calculates the nearest navigation item and applies subtle magnetic attraction
 * when the pill center is within the attraction radius.
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

    // Magnetic attraction: within 32px radius, gently guide the pill toward the item center
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

    // Drag and lift state
    const [isDragging, setIsDragging] = useState(false);
    const [isLifted, setIsLifted] = useState(false);
    const [dragCenter, setDragCenter] = useState(null);
    const [hoveredIndex, setHoveredIndex] = useState(null);

    // Synchronous gesture tracking ref to avoid stale closures during high-frequency events
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
        hasMoved: false,
        originIndex: 0
    });

    const activateDestination = useCallback((item) => {
        if (!item) return;

        // If selecting the active route, smoothly scroll to top
        if (isActive(item.path)) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Navigate to the existing route
        navigate(item.path);
    }, [isActive, navigate]);

    // Handle pointer down (mouse click or touch)
    const handlePointerDown = (e, index) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        const isCurrentActive = index === activeIndex;
        const now = Date.now();
        const isDoubleTap = isCurrentActive && (now - gestureRef.current.lastTapTime < 300);
        gestureRef.current.lastTapTime = now;

        const currentItem = itemsData[index];
        if (!currentItem) return;

        gestureRef.current.isDown = true;
        gestureRef.current.pointerId = e.pointerId;
        gestureRef.current.startX = e.clientX;
        gestureRef.current.startY = e.clientY;
        gestureRef.current.initialCenter = currentItem.centerX;
        gestureRef.current.originIndex = index;
        gestureRef.current.hasMoved = false;

        const isTouch = e.pointerType === 'touch';

        if (isCurrentActive) {
            // Double-tap activates grab immediately
            if (isDoubleTap) {
                gestureRef.current.isLifted = true;
                gestureRef.current.isDragging = true;
                setIsLifted(true);
                setIsDragging(true);
                setDragCenter(currentItem.centerX);
                setHoveredIndex(index);
                try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                } catch (_) {}
                return;
            }

            if (isTouch) {
                // Long press timer (180ms) for touch screens
                gestureRef.current.longPressTimer = setTimeout(() => {
                    if (gestureRef.current.isDown && !gestureRef.current.hasMoved) {
                        gestureRef.current.isLifted = true;
                        gestureRef.current.isDragging = true;
                        setIsLifted(true);
                        setIsDragging(true);
                        setDragCenter(currentItem.centerX);
                        setHoveredIndex(index);
                        try {
                            e.currentTarget.setPointerCapture(e.pointerId);
                        } catch (_) {}
                        if (navigator.vibrate) navigator.vibrate(10);
                    }
                }, 180);
            } else {
                // Desktop mouse: subtle tactile lift after 80ms click-and-hold
                gestureRef.current.holdTimer = setTimeout(() => {
                    if (gestureRef.current.isDown) {
                        gestureRef.current.isLifted = true;
                        setIsLifted(true);
                    }
                }, 80);
            }
        }
    };

    // Handle pointer move
    const handlePointerMove = (e) => {
        if (!gestureRef.current.isDown) return;

        const deltaX = e.clientX - gestureRef.current.startX;
        const deltaY = e.clientY - gestureRef.current.startY;
        const dist = Math.hypot(deltaX, deltaY);
        const isTouch = e.pointerType === 'touch';

        // Cancel if vertical scroll is dominant on touch before drag engaged
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

        // Trigger dragging when moving past 3px on the active pill
        if (dist > 3 && gestureRef.current.originIndex === activeIndex) {
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

        // Update pill position while dragging
        if (gestureRef.current.isDragging && itemsData.length > 0) {
            e.preventDefault();

            const rawCenter = gestureRef.current.initialCenter + deltaX;
            // Clamp within navbar range + padding
            const minCenter = itemsData[0].centerX - 8;
            const maxCenter = itemsData[itemsData.length - 1].centerX + 8;
            const clampedCenter = Math.max(minCenter, Math.min(maxCenter, rawCenter));

            setDragCenter(clampedCenter);

            const { nearestIdx } = getEffectiveCenterAndNearest(clampedCenter, itemsData);
            setHoveredIndex(nearestIdx);
        }
    };

    // Handle pointer up / release
    const handlePointerUp = (e, index) => {
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

            // It was a direct click without drag
            if (!hasMoved) {
                activateDestination(navItems[index]);
            }
        }
    };

    // Compute pill coordinates
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

    // Determine which item is visually highlighted
    const activeOrHoveredIndex = isDragging && hoveredIndex !== null ? hoveredIndex : activeIndex;

    return (
        <nav
            ref={containerRef}
            aria-label="Primary Navigation"
            className={cn(
                "relative flex items-center gap-1 xl:gap-2 p-1 rounded-2xl select-none",
                className
            )}
            style={{ touchAction: 'pan-y' }}
        >
            {/* ══════════════════════════════════════════════════════
                1. INDEPENDENT DRAGGABLE SELECTION PILL
                - Sits over/around the active navigation item
                - Only this pill moves horizontally across items
                - Navigation labels below stay 100% stationary
            ══════════════════════════════════════════════════════ */}
            {isMeasured && currentWidth > 0 && (
                <motion.div
                    aria-hidden="true"
                    className={cn(
                        "absolute z-0 rounded-xl pointer-events-none select-none transition-shadow",
                        "bg-emerald-500/15 dark:bg-emerald-500/20",
                        "border border-emerald-500/35 dark:border-emerald-500/40",
                        "backdrop-blur-md",
                        isLifted
                            ? "shadow-[0_12px_28px_-4px_rgba(16,185,129,0.38),0_0_16px_rgba(16,185,129,0.25)] border-emerald-500/60 dark:border-emerald-400/60 bg-emerald-500/25 dark:bg-emerald-500/30"
                            : "shadow-sm dark:shadow-[0_2px_12px_rgba(16,185,129,0.15)]"
                    )}
                    style={{
                        top: currentTop,
                        height: currentHeight,
                    }}
                    animate={{
                        x: currentLeft,
                        width: currentWidth,
                        y: isLifted ? -2.5 : 0,
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
                    {/* Subtle interior glow */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/5 via-teal-400/10 to-emerald-500/5 opacity-80 pointer-events-none" />
                    
                    {/* Tactile lift indicator line */}
                    {isLifted && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-emerald-400/90 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                    )}
                </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════
                2. FIXED NAVIGATION ITEMS
                - Completely fixed in their layout positions
                - Do NOT move, shift, or scroll during drag
                - Receive subtle active text color when pill is over them
            ══════════════════════════════════════════════════════ */}
            {navItems.map((item, idx) => {
                const isItemActive = idx === activeIndex;
                const isUnderPill = idx === activeOrHoveredIndex;

                return (
                    <button
                        key={item.path}
                        ref={el => itemRefs.current[idx] = el}
                        type="button"
                        onPointerDown={(e) => handlePointerDown(e, idx)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={(e) => handlePointerUp(e, idx)}
                        onPointerCancel={(e) => handlePointerUp(e, idx)}
                        className={cn(
                            "px-3.5 py-1.5 rounded-xl text-xs font-extrabold relative z-10 select-none whitespace-nowrap",
                            "transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
                            isItemActive
                                ? isDragging
                                    ? "cursor-grabbing"
                                    : "cursor-grab"
                                : "cursor-pointer",
                            isUnderPill
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-slate-600 dark:text-white/80 hover:text-slate-900 dark:hover:text-white"
                        )}
                        aria-current={isItemActive ? 'page' : undefined}
                    >
                        {item.label}
                    </button>
                );
            })}
        </nav>
    );
}

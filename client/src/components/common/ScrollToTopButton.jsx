import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Premium Scroll to Top Button for TMS Portals (Tenant & Manager)
 * 
 * - Fixed position in bottom-right corner
 * - Appears smoothly after scrolling past ~320px
 * - Smoothly scrolls to top on click
 * - Supports window scrolling and container-based scrolling (e.g. DashboardLayout <main>)
 * - 100% theme-aware (Light + Dark mode)
 * - Restrained, premium micro-animations
 * - Accessible with visible focus state & aria-label
 */
export default function ScrollToTopButton({
    containerRef,
    threshold = 320,
    className
}) {
    const [isVisible, setIsVisible] = useState(false);
    const location = useLocation();
    const rafIdRef = useRef(null);

    // Scroll checking logic optimized with requestAnimationFrame
    const checkScrollPosition = useCallback(() => {
        if (rafIdRef.current) return;

        rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null;

            let currentScrollY = 0;

            if (containerRef && containerRef.current) {
                currentScrollY = containerRef.current.scrollTop;
            } else {
                const mainEl = document.querySelector('main.overflow-y-auto');
                if (mainEl) {
                    currentScrollY = mainEl.scrollTop;
                } else {
                    currentScrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
                }
            }

            setIsVisible(currentScrollY > threshold);
        });
    }, [containerRef, threshold]);

    // Attach scroll listeners to both container and window
    useEffect(() => {
        const container = containerRef?.current || document.querySelector('main.overflow-y-auto');

        const handleScroll = () => checkScrollPosition();

        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
        }
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Initial check
        checkScrollPosition();

        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
            window.removeEventListener('scroll', handleScroll);
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, [containerRef, checkScrollPosition]);

    // Reset visibility when route changes
    useEffect(() => {
        setIsVisible(false);
        const timer = setTimeout(() => {
            checkScrollPosition();
        }, 100);
        return () => clearTimeout(timer);
    }, [location.pathname, checkScrollPosition]);

    const scrollToTop = () => {
        const container = containerRef?.current || document.querySelector('main.overflow-y-auto');

        if (container && container.scrollTop > 0) {
            container.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    type="button"
                    onClick={scrollToTop}
                    aria-label="Scroll to top"
                    title="Scroll to top"
                    initial={{ opacity: 0, scale: 0.8, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 12 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                        "fixed z-40 flex items-center justify-center cursor-pointer group select-none outline-none",
                        "bottom-4 right-4 sm:bottom-6 sm:right-6",
                        "w-10 h-10 sm:w-11 sm:h-11 rounded-2xl",
                        "bg-white/90 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/90 shadow-lg shadow-slate-900/10",
                        "dark:bg-[#0A101C]/90 dark:hover:bg-[#0E1726] dark:text-slate-200 dark:hover:text-emerald-400 dark:border-white/15 dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6),0_0_20px_rgba(16,185,129,0.15)]",
                        "backdrop-blur-xl transition-colors duration-200",
                        "focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
                        className
                    )}
                >
                    <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:-translate-y-0.5 text-current" />
                </motion.button>
            )}
        </AnimatePresence>
    );
}

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, ChevronRight, ChevronDown, X, Globe, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * LocationFilterPopover
 * Professional hierarchical State / City location selector for Tenant Map View.
 */
export default function LocationFilterPopover({
    stateFilter = '',
    cityFilter = '',
    availableLocations = { states: [], cities: [], hierarchy: [] },
    onLocationChange,
    onClear,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedStates, setExpandedStates] = useState({});
    const popoverRef = useRef(null);

    // Auto-expand currently selected state if any
    useEffect(() => {
        if (stateFilter) {
            setExpandedStates(prev => ({ ...prev, [stateFilter.toLowerCase()]: true }));
        }
    }, [stateFilter]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const toggleStateExpand = (stateName, e) => {
        e?.stopPropagation();
        const key = stateName.toLowerCase();
        setExpandedStates(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSelectState = (stateName) => {
        onLocationChange?.({ state: stateName, city: '' });
        setIsOpen(false);
    };

    const handleSelectCity = (stateName, cityName) => {
        onLocationChange?.({ state: stateName, city: cityName });
        setIsOpen(false);
    };

    const handleResetAll = () => {
        onLocationChange?.({ state: '', city: '' });
        onClear?.();
        setIsOpen(false);
    };

    const isLocationActive = Boolean(stateFilter || cityFilter);

    const activeDisplayLabel = cityFilter
        ? `${cityFilter}${stateFilter ? `, ${stateFilter}` : ''}`
        : stateFilter || 'Select State / City';

    const q = searchQuery.toLowerCase().trim();

    // Filter hierarchy by search query
    const filteredHierarchy = (availableLocations.hierarchy || []).filter(item => {
        if (!q) return true;
        const matchesState = item.state?.toLowerCase().includes(q);
        const matchesCity = item.cities?.some(c => (typeof c === 'string' ? c : c.city)?.toLowerCase().includes(q));
        return matchesState || matchesCity;
    });

    return (
        <div className="relative inline-block" ref={popoverRef}>
            {/* Pill Trigger Button */}
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => setIsOpen(prev => !prev)}
                    className={cn(
                        "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-md cursor-pointer border backdrop-blur-md",
                        isLocationActive
                            ? "bg-indigo-600 border-indigo-400 text-white shadow-indigo-500/30"
                            : "bg-background/90 hover:bg-background border-border text-foreground hover:border-primary/40 shadow-sm"
                    )}
                >
                    <MapPin className={cn("w-3.5 h-3.5", isLocationActive ? "text-white" : "text-rose-500")} />
                    <span className="truncate max-w-[180px]">{activeDisplayLabel}</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isOpen && "rotate-180")} />
                </button>

                {/* 1-Click Clear Button */}
                {isLocationActive && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleResetAll();
                        }}
                        className="p-1 rounded-full bg-background/90 hover:bg-rose-500 hover:text-white border border-border text-muted-foreground transition-colors shadow-sm cursor-pointer"
                        title="Clear location filter"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Popover Dropdown Card */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-1/2 -translate-x-1/2 mt-2 w-72 sm:w-80 rounded-[1.75rem] bg-card border border-border shadow-2xl z-[1100] overflow-hidden backdrop-blur-xl"
                    >
                        {/* Popover Header */}
                        <div className="p-4 border-b border-border/80 flex items-center justify-between bg-muted/40">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-black text-foreground uppercase tracking-wider">
                                    Filter by Location
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-3 border-b border-border/60">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search state or city..."
                                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/60 border border-border text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Location List / Hierarchy */}
                        <div className="max-h-72 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-border">
                            {/* Option 1: All Locations Reset */}
                            <button
                                type="button"
                                onClick={handleResetAll}
                                className={cn(
                                    "w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all text-left cursor-pointer",
                                    !isLocationActive
                                        ? "bg-primary/10 text-primary border border-primary/20"
                                        : "text-foreground hover:bg-muted"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-primary" />
                                    <span>All Locations (India)</span>
                                </div>
                                {!isLocationActive && <Check className="w-3.5 h-3.5 text-primary" />}
                            </button>

                            {/* Divider */}
                            <div className="px-3 py-1.5 text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">
                                Available States & Cities
                            </div>

                            {/* Hierarchical States */}
                            {filteredHierarchy.length > 0 ? (
                                filteredHierarchy.map((item) => {
                                    const stateName = item.state;
                                    const key = stateName.toLowerCase();
                                    const isExpanded = Boolean(expandedStates[key] || q);
                                    const isStateSelected = stateFilter.toLowerCase() === stateName.toLowerCase() && !cityFilter;
                                    const cities = item.cities || [];

                                    return (
                                        <div key={stateName} className="rounded-xl border border-border/40 overflow-hidden bg-muted/20">
                                            {/* State Item Row */}
                                            <div
                                                onClick={() => handleSelectState(stateName)}
                                                className={cn(
                                                    "px-3 py-2 flex items-center justify-between text-xs font-bold cursor-pointer transition-colors group",
                                                    isStateSelected
                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black"
                                                        : "text-foreground hover:bg-muted/60"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="truncate">{stateName}</span>
                                                    {item.count ? (
                                                        <span className="px-1.5 py-0.2 rounded-md bg-muted text-[9px] font-black text-muted-foreground">
                                                            {item.count}
                                                        </span>
                                                    ) : null}
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    {isStateSelected && <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" />}
                                                    {cities.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => toggleStateExpand(stateName, e)}
                                                            className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-transform"
                                                            title={isExpanded ? "Collapse cities" : "Expand cities"}
                                                        >
                                                            <ChevronRight
                                                                className={cn(
                                                                    "w-3.5 h-3.5 transition-transform duration-200",
                                                                    isExpanded && "rotate-90"
                                                                )}
                                                            />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Sub-cities List */}
                                            <AnimatePresence>
                                                {isExpanded && cities.length > 0 && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="pl-6 pr-2 py-1 space-y-0.5 bg-background/50 border-t border-border/30"
                                                    >
                                                        {cities.map((cityObj) => {
                                                            const cityName = typeof cityObj === 'string' ? cityObj : cityObj.city;
                                                            const cityCount = typeof cityObj === 'object' ? cityObj.count : null;
                                                            const isCitySelected =
                                                                stateFilter.toLowerCase() === stateName.toLowerCase() &&
                                                                cityFilter.toLowerCase() === cityName.toLowerCase();

                                                            return (
                                                                <button
                                                                    key={cityName}
                                                                    type="button"
                                                                    onClick={() => handleSelectCity(stateName, cityName)}
                                                                    className={cn(
                                                                        "w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs font-semibold transition-colors text-left cursor-pointer",
                                                                        isCitySelected
                                                                            ? "bg-primary/15 text-primary font-black"
                                                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                                                    )}
                                                                >
                                                                    <span className="truncate">↳ {cityName}</span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        {cityCount ? (
                                                                            <span className="text-[9px] font-black opacity-60">
                                                                                {cityCount}
                                                                            </span>
                                                                        ) : null}
                                                                        {isCitySelected && <Check className="w-3 h-3 text-primary" />}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-6 text-center text-xs text-muted-foreground font-medium">
                                    No locations match "{searchQuery}"
                                </div>
                            )}
                        </div>

                        {/* Footer Reset / Close */}
                        <div className="p-2.5 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px]">
                            {isLocationActive ? (
                                <button
                                    type="button"
                                    onClick={handleResetAll}
                                    className="text-rose-500 hover:underline font-bold px-2 py-1 cursor-pointer"
                                >
                                    Clear Selection
                                </button>
                            ) : (
                                <span className="text-muted-foreground/60 px-2">Select to filter map</span>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="px-3 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-bold transition-colors cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

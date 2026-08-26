import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Heart, Scale } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../context/ThemeContext';
import { getDisplayStatus, resolveMediaUrl, DEFAULT_PLACEHOLDER_SVG } from '../../utils/propertyHelper';

const TYPE_COLORS = {
    apartment: '#6366f1',
    house: '#10b981',
    commercial: '#f59e0b',
    land: '#8b5cf6',
    hostel: '#a855f7',
    pg: '#f43f5e',
    villa: '#10b981',
    shop: '#f59e0b',
};

/**
 * TenantCompactCard — Dedicated Tenant Map View Result Card
 * Isolated component for tenant browse results panel.
 */
export default function TenantCompactCard({
    p,
    isSelected = false,
    isSaved = false,
    inCompare = false,
    onSave,
    onCompare,
    onClick,
}) {
    const { theme } = useTheme();
    const propType = (p?.type || 'apartment').toLowerCase();
    const color = TYPE_COLORS[propType] || '#6366f1';
    const displayStatus = getDisplayStatus(p);
    
    // Extract media cover
    const allMedia = p.media || [];
    const coverUrl = resolveMediaUrl(
        p.images?.[0] || allMedia.find(m => m.mediaType === 'image')?.url
    );

    return (
        <motion.div
            id={`card-${p._id || p.id}`}
            whileHover={{ y: -2 }}
            onClick={onClick}
            className={cn(
                "flex gap-3 p-3 rounded-2xl cursor-pointer bg-card border transition-all duration-200 shadow-sm relative group",
                isSelected
                    ? "border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-500/5 shadow-lg shadow-emerald-500/10"
                    : "border-border hover:border-primary/50"
            )}
        >
            {/* Thumbnail Image */}
            <div className="w-24 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted relative">
                {coverUrl ? (
                    <img
                        src={coverUrl}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = DEFAULT_PLACEHOLDER_SVG;
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-6 h-6 opacity-20 text-foreground" />
                    </div>
                )}

                {/* Type Badge */}
                <span
                    className="absolute top-1 left-1 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase tracking-tighter"
                    style={{ backgroundColor: color }}
                >
                    {p.type || 'property'}
                </span>

                {/* Status Badge */}
                {displayStatus && (
                    <span
                        className={cn(
                            "absolute bottom-1 right-1 text-[7px] font-black px-1 rounded shadow-sm border uppercase tracking-tighter",
                            displayStatus === 'Available'
                                ? "bg-emerald-500/90 border-emerald-400/20 text-white"
                                : displayStatus.startsWith('Available from')
                                    ? "bg-indigo-500/90 border-indigo-400/20 text-white"
                                    : displayStatus === 'Under Maintenance'
                                        ? "bg-amber-500/90 border-amber-400/20 text-white"
                                        : "bg-rose-500/90 border-rose-400/20 text-white"
                        )}
                    >
                        {displayStatus === 'Available'
                            ? 'AVBL'
                            : displayStatus === 'Under Maintenance'
                                ? 'MAINT'
                                : displayStatus === 'Sold Out'
                                    ? 'SOLD'
                                    : 'SOON'}
                    </span>
                )}
            </div>

            {/* Property Information */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                    <p className="font-black text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {p.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 truncate my-0.5 font-medium">
                        📍 {[p.city, p.state].filter(Boolean).join(', ') || 'India'}
                    </p>
                </div>

                <div>
                    <p
                        className="text-base font-black text-foreground"
                        style={{ color: theme === 'light' ? color : 'inherit' }}
                    >
                        ₹{(p.rentAmount || 0).toLocaleString('en-IN')}
                        <span className="text-[9px] font-bold text-muted-foreground/50 ml-0.5">/mo</span>
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                        {p.bedrooms !== undefined && p.bedrooms !== null && (
                            <span className="text-[10px] text-muted-foreground font-semibold">
                                🛏 {p.bedrooms}
                            </span>
                        )}
                        {p.bathrooms !== undefined && p.bathrooms !== null && (
                            <span className="text-[10px] text-muted-foreground font-semibold">
                                🚿 {p.bathrooms}
                            </span>
                        )}
                        {p.squareFeet ? (
                            <span className="text-[10px] text-muted-foreground font-semibold">
                                📐 {p.squareFeet}sqft
                            </span>
                        ) : null}

                        {/* Save & Compare Buttons */}
                        <div className="ml-auto flex items-center gap-1.5 relative z-20">
                            <button
                                type="button"
                                aria-label="Save property"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onSave?.();
                                }}
                                className={cn(
                                    "p-1.5 rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-center min-w-[28px] min-h-[28px] relative z-20",
                                    isSaved
                                        ? "text-rose-500 bg-rose-500/15 border border-rose-500/30"
                                        : "text-muted-foreground/50 hover:text-foreground hover:bg-muted border border-border/40"
                                )}
                                title={isSaved ? "Remove from saved" : "Save property"}
                            >
                                <Heart className={cn("w-3.5 h-3.5", isSaved && "fill-current")} />
                            </button>
                            <button
                                type="button"
                                aria-label="Compare property"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onCompare?.();
                                }}
                                className={cn(
                                    "p-1.5 rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-center min-w-[28px] min-h-[28px] relative z-20",
                                    inCompare
                                        ? "text-primary bg-primary/15 border border-primary/30"
                                        : "text-muted-foreground/50 hover:text-foreground hover:bg-muted border border-border/40"
                                )}
                                title={inCompare ? "Remove from comparison" : "Add to comparison"}
                            >
                                <Scale className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

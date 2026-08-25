import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Sparkles, Bed, Bath, Square, MapPin, ArrowRight,
    Heart, Scale, ShieldCheck, RefreshCw, AlertTriangle,
    Zap, Tag, UserCheck, ChevronRight
} from 'lucide-react';

import { propertyService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';
import { resolveMediaUrl, DEFAULT_PLACEHOLDER_SVG } from '../../utils/propertyHelper';

function SimilarCardSkeleton() {
    return (
        <div className="rounded-3xl bg-card border border-border overflow-hidden p-4 space-y-3.5 animate-pulse">
            <div className="h-48 rounded-2xl bg-muted" />
            <div className="space-y-2.5">
                <div className="flex gap-2">
                    <div className="h-4 w-20 bg-muted rounded-full" />
                    <div className="h-4 w-28 bg-muted rounded-full" />
                </div>
                <div className="h-5 w-4/5 bg-muted rounded-md" />
                <div className="h-3.5 w-1/2 bg-muted rounded-md" />
                <div className="h-4 w-full bg-muted rounded-md mt-2" />
                <div className="flex justify-between items-center pt-3 border-t border-border/50">
                    <div className="h-6 w-24 bg-muted rounded-md" />
                    <div className="h-8 w-24 bg-muted rounded-xl" />
                </div>
            </div>
        </div>
    );
}

export default function SimilarPropertiesSection({
    property,
    onSaveProperty,
    savedPropertyIds = new Set(),
    onToggleCompare,
    comparePropertyIds = new Set()
}) {
    const navigate = useNavigate();
    const { theme } = useTheme();

    const [similarList, setSimilarList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSimilar = async () => {
        if (!property?._id) return;
        setLoading(true);
        setError(null);
        try {
            const res = await propertyService.getSimilarProperties(property._id, { limit: 6 });
            const data = res?.data?.data || res?.data || [];
            const list = Array.isArray(data) ? data : [];
            setSimilarList(list);
        } catch (err) {
            console.error('[SimilarPropertiesSection] Error fetching similar properties:', err);
            setError('Unable to load personalized recommendations. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSimilar();
    }, [property?._id]);

    const handleViewProperty = (propId) => {
        if (!propId) return;
        navigate(`/properties/${propId}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <section className="space-y-6 pt-10 border-t border-border/60">
            {/* Header: Personalization & Recommendation Branding */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] uppercase tracking-widest border border-indigo-500/20 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-indigo-500" /> Curated Recommendations
                        </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                        You May Also Like
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium max-w-xl">
                        Properties similar to this one based on price, size, layout, furnishing, and locality match.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        navigate('/browse');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="self-start sm:self-auto text-xs font-black text-primary hover:text-primary/80 flex items-center gap-1.5 uppercase tracking-wider transition-colors cursor-pointer group"
                >
                    <span>View all listings</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Error State */}
            {error && !loading && (
                <div className="p-6 rounded-3xl bg-destructive/5 border border-destructive/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                        <div>
                            <p className="text-xs font-black text-destructive uppercase tracking-wider">Failed to load recommendations</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={fetchSimilar}
                        className="px-4 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SimilarCardSkeleton />
                    <SimilarCardSkeleton />
                    <SimilarCardSkeleton />
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && similarList.length === 0 && (
                <div className="p-10 sm:p-14 rounded-3xl bg-card/60 border border-dashed border-border flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-2xl shadow-inner">
                        ✨
                    </div>
                    <div className="space-y-1 max-w-md">
                        <h3 className="text-base font-black text-foreground">No similar properties found</h3>
                        <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                            We couldn't find close matches with identical layouts and price tiers at the moment. Browse the full directory for more options.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/browse')}
                        className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer"
                    >
                        <span>Browse all properties</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Cards Grid */}
            {!loading && !error && similarList.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {similarList.map((p, idx) => {
                        const coverImg = resolveMediaUrl(p.images?.[0] || p.media?.find(m => m.mediaType === 'image')?.url) || DEFAULT_PLACEHOLDER_SVG;
                        const isSaved = savedPropertyIds?.has(p._id);
                        const isCompared = comparePropertyIds?.has(p._id);
                        const mgr = p.manager || p.owner;
                        const mgrName = mgr?.name || (mgr?.firstName ? `${mgr.firstName} ${mgr?.lastName || ''}`.trim() : 'Property Manager');

                        return (
                            <motion.div
                                key={p._id}
                                whileHover={{ y: -6 }}
                                onClick={() => handleViewProperty(p._id)}
                                className="group cursor-pointer rounded-3xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-2xl hover:border-indigo-500/40 transition-all flex flex-col justify-between"
                            >
                                <div className="p-4 space-y-3.5">
                                    {/* Cover Image Stage */}
                                    <div className="aspect-[16/10] rounded-2xl overflow-hidden relative bg-muted">
                                        <img
                                            src={coverImg}
                                            alt={p.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = DEFAULT_PLACEHOLDER_SVG;
                                            }}
                                        />

                                        {/* Match Score Badge */}
                                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                                            {p.matchScore && (
                                                <span className="px-2.5 py-1 rounded-xl bg-indigo-600/90 backdrop-blur-md text-white font-black text-[10px] tracking-wide shadow-lg border border-white/20 flex items-center gap-1">
                                                    <Zap className="w-3 h-3 text-amber-300" />
                                                    {p.matchScore}% Match
                                                </span>
                                            )}
                                            {(p.verificationStatus === 'verified' || p.verifiedBadge) && (
                                                <span className="px-2 py-1 rounded-xl bg-emerald-500/90 backdrop-blur-md text-white font-black text-[10px] tracking-wide shadow-lg flex items-center gap-1">
                                                    <ShieldCheck className="w-3 h-3" />
                                                </span>
                                            )}
                                        </div>

                                        {/* Price Badge */}
                                        <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-card/90 backdrop-blur-md border border-border/80 text-foreground font-black text-xs shadow-lg">
                                            ₹{p.rentAmount?.toLocaleString('en-IN') || '0'}
                                            <span className="text-[9px] font-bold text-muted-foreground">/mo</span>
                                        </div>

                                        {/* Save & Compare Quick Overlays */}
                                        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                            {onSaveProperty && (
                                                <button
                                                    type="button"
                                                    aria-label="Save property"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSaveProperty(p._id);
                                                    }}
                                                    className={cn(
                                                        "p-2 rounded-xl backdrop-blur-md transition-all shadow-md cursor-pointer",
                                                        isSaved
                                                            ? "bg-rose-500 text-white"
                                                            : "bg-slate-900/70 hover:bg-slate-900 text-white hover:scale-105"
                                                    )}
                                                >
                                                    <Heart className={cn("w-3.5 h-3.5", isSaved && "fill-current")} />
                                                </button>
                                            )}
                                            {onToggleCompare && (
                                                <button
                                                    type="button"
                                                    aria-label="Compare property"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onToggleCompare(p);
                                                    }}
                                                    className={cn(
                                                        "p-2 rounded-xl backdrop-blur-md transition-all shadow-md cursor-pointer",
                                                        isCompared
                                                            ? "bg-primary text-white"
                                                            : "bg-slate-900/70 hover:bg-slate-900 text-white hover:scale-105"
                                                    )}
                                                >
                                                    <Scale className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* "Why this property?" Tags */}
                                    {Array.isArray(p.matchReasons) && p.matchReasons.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {p.matchReasons.map((reason, rIdx) => (
                                                <span
                                                    key={rIdx}
                                                    className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] border border-indigo-500/15 flex items-center gap-1"
                                                >
                                                    <Tag className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                                    <span className="truncate max-w-[170px]">{reason}</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Name & Location */}
                                    <div className="space-y-1 px-0.5">
                                        <h3 className="font-black text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                            {p.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground/80 font-medium flex items-center gap-1 truncate">
                                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                            <span className="truncate">{p.city}{p.address ? `, ${p.address}` : ''}</span>
                                        </p>
                                    </div>

                                    {/* Specs Grid */}
                                    <div className="flex items-center gap-3.5 pt-2 text-[11px] font-bold text-muted-foreground border-t border-border/50">
                                        <span className="flex items-center gap-1">
                                            <Bed className="w-3.5 h-3.5 text-indigo-500" /> {p.bedrooms || 0} Bed
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Bath className="w-3.5 h-3.5 text-emerald-500" /> {p.bathrooms || 0} Bath
                                        </span>
                                        {p.squareFeet && (
                                            <span className="flex items-center gap-1">
                                                <Square className="w-3.5 h-3.5 text-amber-500" /> {p.squareFeet} sqft
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Manager Info + Action Footer */}
                                <div className="px-4 py-3 bg-muted/30 border-t border-border/50 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {mgr?.avatar ? (
                                            <img
                                                src={mgr.avatar}
                                                alt={mgrName}
                                                className="w-6 h-6 rounded-lg object-cover border border-border shrink-0"
                                            />
                                        ) : (
                                            <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-[9px] border border-primary/20 shrink-0">
                                                {mgrName?.[0] || 'M'}
                                            </div>
                                        )}
                                        <span className="text-[11px] font-bold text-muted-foreground truncate max-w-[100px] sm:max-w-[120px]">
                                            {mgrName}
                                        </span>
                                    </div>

                                    <span className="text-primary font-black flex items-center gap-0.5 text-[11px] uppercase tracking-wider group-hover:translate-x-1 transition-transform shrink-0">
                                        View <ChevronRight className="w-3.5 h-3.5" />
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
